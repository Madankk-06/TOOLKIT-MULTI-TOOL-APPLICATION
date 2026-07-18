import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';

// ─── Constants ──────────────────────────────────────────────────────────────
const CALIBRATION_SAMPLES = 40;   // ~2 sec at 20 Hz
const SMOOTHING_ALPHA      = 0.15; // Low-pass filter coefficient
const DETECTION_FACTOR     = 1.8;  // σ multiplier for detection threshold
const SENSOR_HZ            = 20;   // magnetometer poll rate

// ─── Audio context (singleton) ───────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playBeep(intensity: number) {
  try {
    const ctx = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    // Frequency rises with intensity (300 Hz → 900 Hz)
    osc.frequency.value = Math.min(900, 300 + intensity * 12);
    osc.type = 'sine';
    const vol = Math.min(0.5, 0.05 + intensity * 0.008);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch (_) {}
}

// ─── Types ───────────────────────────────────────────────────────────────────
type SensorMode = 'magnetometer' | 'compass' | 'none';
type PhaseType  = 'calibrating' | 'ready' | 'detecting';

export default function MetalDetector() {
  const { tokens } = useTheme();

  // ── Core state ──────────────────────────────────────────────────────────
  const [phase,      setPhase]      = useState<PhaseType>('calibrating');
  const [mode,       setMode]       = useState<SensorMode>('none');
  const [smoothed,   setSmoothed]   = useState(0);   // smoothed µT magnitude
  const [baseline,   setBaseline]   = useState(0);
  const [stdDev,     setStdDev]     = useState(0);
  const [delta,      setDelta]      = useState(0);   // deviation from baseline
  const [axes,       setAxes]       = useState({ x: 0, y: 0, z: 0 });
  const [calProgress,setCalProgress]= useState(0);   // 0-100
  const [error,      setError]      = useState<string | null>(null);
  const [showHelp,   setShowHelp]   = useState(false);

  // ── Refs (no re-render cost for high-freq data) ──────────────────────────
  const smoothedRef    = useRef(0);
  const calSamplesRef  = useRef<number[]>([]);
  const baselineRef    = useRef(0);
  const thresholdRef   = useRef(0);        // baseline + DETECTION_FACTOR * stdDev
  const lastBeepRef    = useRef(0);
  const sensorRef      = useRef<any>(null);
  const cleanupRef     = useRef<(() => void) | null>(null);
  const compassRef     = useRef<number | null>(null);  // last heading for fallback
  const prevHeadingRef = useRef<number | null>(null);

  // ─── Low-pass filter ────────────────────────────────────────────────────
  const applyLPF = (raw: number): number => {
    const next = SMOOTHING_ALPHA * raw + (1 - SMOOTHING_ALPHA) * smoothedRef.current;
    smoothedRef.current = next;
    return next;
  };

  // ─── Process a new magnetometer reading ─────────────────────────────────
  const processReading = useCallback((x: number, y: number, z: number) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    if (magnitude === 0) return; // ignore zeros during warm-up

    const s = applyLPF(magnitude);
    setSmoothed(s);
    setAxes({ x, y, z });

    // ── Phase 1: Collect calibration samples ──────────────────────────────
    const samples = calSamplesRef.current;
    if (samples.length < CALIBRATION_SAMPLES) {
      samples.push(s);
      setCalProgress(Math.round((samples.length / CALIBRATION_SAMPLES) * 100));

      if (samples.length === CALIBRATION_SAMPLES) {
        // Compute mean & σ
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const variance = samples.reduce((acc, v) => acc + (v - mean) ** 2, 0) / samples.length;
        const sd = Math.sqrt(variance);

        baselineRef.current  = mean;
        thresholdRef.current = mean + DETECTION_FACTOR * Math.max(sd, 2); // min 2 µT buffer
        setBaseline(mean);
        setStdDev(sd);
        setPhase('ready');
      }
      return;
    }

    // ── Phase 2: Detection ─────────────────────────────────────────────────
    const dev = s - baselineRef.current;
    const absDev = Math.abs(dev);
    setDelta(absDev);

    if (s > thresholdRef.current || s < baselineRef.current - (thresholdRef.current - baselineRef.current)) {
      setPhase('detecting');
      // Beep + vibrate
      const now = Date.now();
      const beepInterval = Math.max(60, 500 - absDev * 5);
      if (now - lastBeepRef.current > beepInterval) {
        lastBeepRef.current = now;
        playBeep(absDev);
        if ('vibrate' in navigator) {
          navigator.vibrate(Math.min(80, 30 + absDev * 0.8));
        }
      }
    } else {
      setPhase('ready');
    }
  }, []);

  // ─── Compass heading fallback (NO gyroscope) ─────────────────────────────
  // Uses the rate-of-change of the compass heading as a proxy for nearby
  // magnetic field disturbances (metal disrupts Earth's field → heading jumps).
  const setupCompassFallback = useCallback(() => {
    setMode('compass');

    const handler = (e: DeviceOrientationEvent) => {
      // webkitCompassHeading = true heading on iOS; alpha on Android (inverted)
      const heading: number | null =
        (e as any).webkitCompassHeading ??
        (e.alpha !== null ? (360 - e.alpha) % 360 : null);

      if (heading === null) return;

      compassRef.current = heading;

      if (prevHeadingRef.current === null) {
        prevHeadingRef.current = heading;
        return;
      }

      // Wrap-safe angular difference
      let diff = heading - prevHeadingRef.current;
      if (diff >  180) diff -= 360;
      if (diff < -180) diff += 360;
      prevHeadingRef.current = heading;

      // Large sudden heading changes indicate magnetic anomaly
      // Map angular change to simulated magnitude
      const simulatedMag = 30 + Math.abs(diff) * 4; // base 30 µT + anomaly
      processReading(0, 0, simulatedMag);
    };

    window.addEventListener('deviceorientation', handler, true);
    cleanupRef.current = () => window.removeEventListener('deviceorientation', handler, true);
  }, [processReading]);

  // ─── Primary: Hardware Magnetometer ──────────────────────────────────────
  useEffect(() => {
    if ('Magnetometer' in window) {
      try {
        const Mag = (window as any).Magnetometer;
        const sensor = new Mag({ frequency: SENSOR_HZ });
        sensorRef.current = sensor;

        sensor.addEventListener('reading', () => {
          processReading(sensor.x, sensor.y, sensor.z);
        });

        sensor.addEventListener('error', (ev: any) => {
          sensor.stop();
          if (ev.error?.name === 'NotAllowedError') {
            setError('Magnetometer permission denied. Please allow sensor access.');
            setMode('none');
          } else {
            setupCompassFallback();
          }
        });

        sensor.start();
        setMode('magnetometer');
      } catch (_) {
        setupCompassFallback();
      }
    } else {
      setupCompassFallback();
    }

    return () => {
      sensorRef.current?.stop?.();
      cleanupRef.current?.();
    };
  }, [processReading, setupCompassFallback]);

  // ─── Recalibrate ─────────────────────────────────────────────────────────
  const recalibrate = () => {
    calSamplesRef.current = [];
    smoothedRef.current   = 0;
    baselineRef.current   = 0;
    thresholdRef.current  = 0;
    prevHeadingRef.current = null;
    setPhase('calibrating');
    setCalProgress(0);
    setDelta(0);
    setBaseline(0);
    setStdDev(0);
  };

  // ─── Derived display values ───────────────────────────────────────────────
  const barPercent = phase === 'detecting'
    ? Math.min(100, (delta / 60) * 100)
    : phase === 'calibrating'
    ? calProgress
    : 5; // idle green sliver

  const ringColor =
    phase === 'detecting'  ? '#EF4444' :
    phase === 'calibrating'? '#F59E0B' :
    '#22C55E';

  const pulseAnim = phase === 'detecting';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <ToolWrapper toolName="Metal Detector">
      <div style={s.page}>

        {/* ── Sensor mode badge ── */}
        <div style={{ ...s.badge, background: tokens.surface, borderColor: tokens.border }}>
          <div style={{ ...s.dot, background: mode === 'magnetometer' ? '#22C55E' : mode === 'compass' ? '#F59E0B' : '#6B7280' }} />
          <span style={{ color: tokens.textSecondary, fontSize: 12 }}>
            {mode === 'magnetometer' ? 'Hardware Magnetometer' :
             mode === 'compass'      ? 'Compass Mode (Fallback)' :
             'No Sensor'}
          </span>
          {mode === 'compass' && (
            <button onClick={() => setShowHelp(true)} style={{ ...s.helpBtn, color: tokens.accent }}>
              ?
            </button>
          )}
        </div>

        {error && (
          <div style={{ ...s.errorBox, borderColor: '#EF4444', color: '#EF4444' }}>
            {error}
          </div>
        )}

        {/* ── Main detection ring ── */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Outer pulse ring (only when detecting) */}
          <AnimatePresence>
            {pulseAnim && (
              <motion.div
                key="pulse"
                initial={{ scale: 0.9, opacity: 0.8 }}
                animate={{ scale: 1.35, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'easeOut' }}
                style={{ ...s.pulseRing, borderColor: '#EF4444' }}
              />
            )}
          </AnimatePresence>

          {/* Main gauge circle */}
          <motion.div
            animate={{
              borderColor: ringColor,
              boxShadow: `0 0 ${phase === 'detecting' ? 40 : 12}px ${ringColor}55`,
            }}
            transition={{ duration: 0.25 }}
            style={{ ...s.gauge, background: tokens.surface }}
          >
            {/* Axes (small, top) */}
            {mode === 'magnetometer' && (
              <div style={{ ...s.axesRow, color: tokens.textSecondary }}>
                <span>X {axes.x.toFixed(0)}</span>
                <span>Y {axes.y.toFixed(0)}</span>
                <span>Z {axes.z.toFixed(0)}</span>
              </div>
            )}

            {/* Big µT value */}
            <motion.div
              animate={{ color: ringColor }}
              style={s.bigValue}
            >
              {smoothed.toFixed(1)}
              <span style={s.unit}>µT</span>
            </motion.div>

            {/* Status label */}
            <div style={{ ...s.statusLabel, color: ringColor }}>
              {phase === 'calibrating' ? `CALIBRATING ${calProgress}%` :
               phase === 'detecting'   ? '⚠ METAL DETECTED' :
               '● CLEAR'}
            </div>

            {/* Baseline reference */}
            {phase !== 'calibrating' && (
              <div style={{ ...s.baselineLabel, color: tokens.textSecondary }}>
                Baseline {baseline.toFixed(1)} µT · σ {stdDev.toFixed(1)}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Intensity bar ── */}
        <div style={{ ...s.barTrack, background: tokens.border }}>
          <motion.div
            animate={{ width: `${barPercent}%`, background: ringColor }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            style={s.barFill}
          />
          <div style={{ ...s.barLabel, color: tokens.textSecondary }}>
            {phase === 'calibrating' ? 'Calibrating…' :
             phase === 'detecting'   ? `+${delta.toFixed(1)} µT deviation` :
             'No anomaly'}
          </div>
        </div>

        {/* ── Intensity segments (visual meter) ── */}
        <div style={s.segments}>
          {Array.from({ length: 20 }).map((_, i) => {
            const lit = barPercent / 100 * 20 > i;
            const color = i < 10 ? '#22C55E' : i < 15 ? '#F59E0B' : '#EF4444';
            return (
              <motion.div
                key={i}
                animate={{ opacity: lit ? 1 : 0.12, background: lit ? color : '#6B7280' }}
                transition={{ duration: 0.1 }}
                style={s.seg}
              />
            );
          })}
        </div>

        {/* ── Controls ── */}
        <div style={s.controls}>
          <button
            onClick={recalibrate}
            style={{ ...s.btn, background: tokens.accent, color: '#fff' }}
          >
            {phase === 'calibrating' ? '⟳ Calibrating…' : '⟳ Recalibrate'}
          </button>
        </div>

        <p style={{ ...s.hint, color: tokens.textSecondary }}>
          {mode === 'magnetometer'
            ? 'Slowly sweep your phone over objects. The magnetometer is usually near the top edge of the device.'
            : 'Move slowly — compass-based mode detects magnetic anomalies that deflect the Earth\'s field.'}
        </p>

        {/* ── Help modal ── */}
        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={s.overlay}
              onClick={() => setShowHelp(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
                style={{ ...s.modal, background: tokens.surface, borderColor: tokens.border }}
                onClick={e => e.stopPropagation()}
              >
                <h3 style={{ color: tokens.textPrimary, margin: 0, fontSize: 18 }}>Enable Real Magnetometer</h3>
                <p style={{ color: tokens.textSecondary, fontSize: 13, lineHeight: 1.6 }}>
                  Your browser doesn't expose the hardware magnetometer directly. To unlock it on Android Chrome:
                </p>
                <ol style={{ color: tokens.textSecondary, fontSize: 13, lineHeight: 2, paddingLeft: 20 }}>
                  <li>Open <code style={s.code}>chrome://flags</code></li>
                  <li>Search <code style={s.code}>Generic Sensor Extra Classes</code></li>
                  <li>Set to <strong>Enabled</strong> → Relaunch</li>
                </ol>
                <button
                  onClick={() => setShowHelp(false)}
                  style={{ ...s.btn, background: tokens.accent, color: '#fff', width: '100%' }}
                >
                  Got it
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolWrapper>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 20, padding: '12px 16px', width: '100%', maxWidth: 420, margin: '0 auto',
  },
  badge: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 16px', borderRadius: 20, border: '1px solid',
    fontSize: 12,
  },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  helpBtn: {
    background: 'none', border: '1px solid currentColor', borderRadius: '50%',
    width: 18, height: 18, cursor: 'pointer', fontSize: 11, fontWeight: 'bold',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
    lineHeight: 1,
  },
  errorBox: {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid', fontSize: 13, background: 'rgba(239,68,68,0.08)',
  },
  pulseRing: {
    position: 'absolute', width: 260, height: 260, borderRadius: '50%',
    border: '3px solid', pointerEvents: 'none',
  },
  gauge: {
    width: 260, height: 260, borderRadius: '50%',
    border: '6px solid transparent',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 4, position: 'relative',
    transition: 'box-shadow 0.3s',
  },
  axesRow: {
    position: 'absolute', top: 44,
    display: 'flex', gap: 10, fontSize: 10, fontFamily: 'monospace', opacity: 0.7,
  },
  bigValue: {
    fontSize: 52, fontWeight: 900, fontFamily: 'monospace',
    lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 4,
  },
  unit: { fontSize: 14, fontWeight: 400, opacity: 0.6 },
  statusLabel: { fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginTop: 4 },
  baselineLabel: { fontSize: 10, opacity: 0.5, marginTop: 2 },
  barTrack: {
    width: '100%', height: 10, borderRadius: 6, overflow: 'hidden',
    maxWidth: 340, position: 'relative',
  },
  barFill: { height: '100%', borderRadius: 6, minWidth: 4 },
  barLabel: {
    position: 'absolute', top: 14, left: 0, right: 0,
    textAlign: 'center', fontSize: 11, fontWeight: 500,
  },
  segments: {
    display: 'flex', gap: 3, marginTop: 18,
  },
  seg: { width: 12, height: 28, borderRadius: 3 },
  controls: { display: 'flex', gap: 12 },
  btn: {
    padding: '10px 28px', borderRadius: 12, border: 'none',
    fontWeight: 700, fontSize: 14, cursor: 'pointer', letterSpacing: 0.3,
  },
  hint: {
    fontSize: 12, textAlign: 'center', opacity: 0.55,
    maxWidth: 300, lineHeight: 1.5,
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    width: '88%', maxWidth: 360, padding: 24, borderRadius: 20,
    border: '1px solid', display: 'flex', flexDirection: 'column', gap: 14,
  },
  code: {
    background: 'rgba(255,255,255,0.08)', padding: '2px 6px',
    borderRadius: 4, fontFamily: 'monospace', fontSize: 12,
  },
};
