import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { ThemeContext } from '../../context/ThemeContext';

interface Preset {
  id: string;
  label: string;
  freq: number | number[];
  desc: string;
  color: string;
}

const PRESETS: Preset[] = [
  { id: "low",    label: "Low",    freq: 150,       desc: "150 Hz — bass frequencies",      color: "#c9a96e" },
  { id: "mid",    label: "Mid",    freq: 280,       desc: "280 Hz — midrange cleaning",     color: "#00d4ff" },
  { id: "high",   label: "High",   freq: 440,       desc: "440 Hz — treble frequencies",    color: "#e91e8c" },
  { id: "sweep",  label: "Sweep",  freq: [100, 600], desc: "100→600 Hz — full sweep",        color: "#ff8800" },
  { id: "water",  label: "Water",  freq: [200, 400], desc: "200↔400 Hz — water eject mode",  color: "#00d4ff" },
];

export default function SpeakerCleaner() {
  const { tokens } = useContext(ThemeContext);
  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [duration, setDuration] = useState<number>(10);
  const [volume, setVolume] = useState<number>(0.6);
  const [running, setRunning] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<number>(0);
  const [wavePoints, setWavePoints] = useState<number[]>([]);

  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<any>(null);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const buildWave = (t: number, freq: number) => {
    return Array.from({ length: 60 }, (_, i) => {
      const x = i / 60;
      const wave = Math.sin(2 * Math.PI * freq * x / 20 + t * 0.05);
      return 50 + wave * 35;
    });
  };

  const start = async () => {
    try {
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = ctxRef.current;

      gainRef.current = ctx.createGain();
      gainRef.current.gain.value = volume;
      gainRef.current.connect(ctx.destination);

      oscRef.current = ctx.createOscillator();
      oscRef.current.type = "sine";

      const f = preset.freq;
      if (Array.isArray(f)) {
        oscRef.current.frequency.setValueAtTime(f[0], ctx.currentTime);
        if (preset.id === "sweep") {
          oscRef.current.frequency.linearRampToValueAtTime(f[1], ctx.currentTime + duration);
        } else {
          // water: oscillate back and forth
          const steps = duration * 2;
          for (let i = 0; i < steps; i++) {
            oscRef.current.frequency.setValueAtTime(i % 2 === 0 ? f[0] : f[1], ctx.currentTime + i * 0.5);
          }
        }
      } else {
        oscRef.current.frequency.setValueAtTime(f, ctx.currentTime);
      }

      oscRef.current.connect(gainRef.current);
      oscRef.current.start();
      setRunning(true);
      setRemaining(duration);
      startTimeRef.current = Date.now();

      // Countdown
      timerRef.current = setInterval(() => {
        if (startTimeRef.current === null) return;
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const left = Math.max(0, Math.ceil(duration - elapsed));
        setRemaining(left);
        if (left <= 0) stopClean();
      }, 200);

      // Waveform animation
      let tick = 0;
      const animate = () => {
        if (startTimeRef.current === null) return;
        const elapsed = (Date.now() - startTimeRef.current) / (duration * 1000);
        const currentFreq = Array.isArray(f) ? f[0] + (f[1] - f[0]) * Math.min(1, elapsed) : f;
        setWavePoints(buildWave(tick++, currentFreq));
        animRef.current = requestAnimationFrame(animate);
      };
      animate();

    } catch (e: any) {
      alert("Audio playback failed: " + e.message);
    }
  };

  const stopClean = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    try { oscRef.current?.stop(); } catch {}
    try { ctxRef.current?.close(); } catch {}
    setRunning(false);
    setRemaining(0);
    setWavePoints([]);
  };

  useEffect(() => () => stopClean(), []);

  const progress = running ? ((duration - remaining) / duration) * 100 : 0;

  return (
    <ToolWrapper toolName="Speaker Cleaner">
      <div style={styles.container}>
        {/* Warning */}
        <div style={{ ...styles.warningBox, borderColor: 'rgba(255, 68, 68, 0.3)', backgroundColor: 'rgba(255, 68, 68, 0.08)' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <div style={{ color: "#ff8888", fontSize: 14, lineHeight: 1.6 }}>
            <strong>Keep away from ears during cleaning.</strong> The volume will be high.
            Ensure your device is in a safe environment.
          </div>
        </div>

        {/* Waveform preview */}
        <div style={{ 
          ...styles.waveCard, 
          borderColor: running ? `${preset.color}44` : tokens.border, 
          backgroundColor: tokens.surface 
        }}>
          {running && wavePoints.length > 0 ? (
            <svg width="100%" height="76" viewBox="0 80 100 60" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={preset.color} stopOpacity="0.3" />
                  <stop offset="50%" stopColor={preset.color} stopOpacity="1" />
                  <stop offset="100%" stopColor={preset.color} stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <polyline
                points={wavePoints.map((y, i) => `${(i / 59) * 100},${y}`).join(" ")}
                fill="none" stroke="url(#waveGrad)" strokeWidth="1.5"
                vectorEffect="non-scaling-stroke" 
              />
            </svg>
          ) : (
            <div style={{ ...styles.previewLabel, color: tokens.textSecondary }}>
              WAVEFORM PREVIEW
            </div>
          )}
        </div>

        {/* Progress */}
        {running && (
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: preset.color, fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: '700' }}>
                CLEANING ACTIVE
              </span>
              <span style={{ color: tokens.textPrimary, fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: '900' }}>
                {remaining}s
              </span>
            </div>
            <div style={{ height: 6, background: tokens.border, borderRadius: 3, overflow: "hidden" }}>
              <motion.div 
                animate={{ width: `${progress}%` }} 
                transition={{ duration: 0.2 }}
                style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${preset.color}88, ${preset.color})` }} 
              />
            </div>
          </div>
        )}

        {/* Preset selector */}
        <div style={{ width: "100%" }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: tokens.textSecondary, letterSpacing: 2, marginBottom: 12 }}>
            FREQUENCY MODE
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            {PRESETS.map(p => (
              <motion.button 
                key={p.id} 
                whileTap={{ scale: 0.95 }}
                onClick={() => !running && setPreset(p)}
                disabled={running}
                style={{ 
                  ...styles.presetBtn,
                  borderColor: preset.id === p.id ? p.color : tokens.border,
                  backgroundColor: preset.id === p.id ? `${p.color}15` : tokens.surface,
                  cursor: running ? "not-allowed" : "pointer"
                }}
              >
                <div style={{ 
                  fontFamily: "'Orbitron', sans-serif", 
                  fontSize: 13,
                  fontWeight: '700',
                  color: preset.id === p.id ? p.color : tokens.textPrimary, 
                  marginBottom: 4 
                }}>
                  {p.label}
                </div>
                <div style={{ color: tokens.textSecondary, fontSize: 10, lineHeight: 1.4 }}>{p.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: tokens.textSecondary, fontSize: 13, fontWeight: '700' }}>Duration</span>
              <span style={{ color: "#c9a96e", fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: '900' }}>{duration}s</span>
            </div>
            <input 
              type="range" min={5} max={60} step={5} value={duration}
              onChange={e => !running && setDuration(Number(e.target.value))}
              disabled={running}
              style={{ width: "100%", accentColor: "#c9a96e", cursor: running ? 'not-allowed' : 'pointer' }} 
            />
            <div style={{ display: "flex", justifyContent: "space-between", color: tokens.textSecondary, fontSize: 10, marginTop: 4 }}>
              {[5, 10, 20, 30, 60].map(v => <span key={v}>{v}s</span>)}
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: tokens.textSecondary, fontSize: 13, fontWeight: '700' }}>Volume</span>
              <span style={{ color: "#00d4ff", fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: '900' }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input 
              type="range" min={0.1} max={1} step={0.05} value={volume}
              onChange={e => {
                const v = Number(e.target.value);
                setVolume(v);
                if (gainRef.current) gainRef.current.gain.value = v;
              }}
              style={{ width: "100%", accentColor: "#00d4ff", cursor: 'pointer' }} 
            />
          </div>
        </div>

        {/* Action Button */}
        <motion.button 
          whileHover={{ scale: 1.02 }} 
          whileTap={{ scale: 0.98 }}
          onClick={running ? stopClean : start}
          style={{ 
            ...styles.actionBtn, 
            background: running ? "linear-gradient(135deg, #ff4444, #cc0000)" : `linear-gradient(135deg, ${preset.color}, ${preset.color}bb)`,
            boxShadow: running ? "0 0 24px rgba(255,68,68,0.3)" : `0 0 24px ${preset.color}33`
          }}
        >
          {running ? `STOP CLEANING (${remaining}s)` : "START CLEANING"}
        </motion.button>

        <p style={{ color: tokens.textSecondary, fontSize: 12, textAlign: "center", lineHeight: 1.7 }}>
          For best results, point the device's speakers downward.<br />
          Repeat 2–3 times if moisture remains.
        </p>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, maxWidth: 540, margin: '0 auto', padding: '10px' },
  warningBox: { border: "1px solid", borderRadius: 14, padding: "14px 18px", width: "100%", display: "flex", gap: 12, alignItems: "flex-start" },
  waveCard: { width: "100%", height: 100, border: "1px solid", borderRadius: 16, padding: "12px 16px", overflow: "hidden", position: "relative", transition: "border-color .3s" },
  previewLabel: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Orbitron', sans-serif", fontSize: 12, letterSpacing: 2 },
  presetBtn: { padding: "14px 10px", borderRadius: 12, border: "1px solid", textAlign: "center", transition: "all .2s" },
  actionBtn: { width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer", color: "white", fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: '700', letterSpacing: 3 }
};
