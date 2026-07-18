import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import ToolWrapper from '../../components/ToolWrapper';

export default function Timer(props?: any) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const originalRemainingRef = useRef<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    let data = null;
        if (props && (props.params || props.aiPayload)) {
          data = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          data = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          data = props;
        }
    if (data && typeof data.duration === 'number' && data.duration > 0) {
      const dur = data.duration;
      const h = Math.floor(dur / 3600);
      const m = Math.floor((dur % 3600) / 60);
      const s = dur % 60;
      setHours(h);
      setMinutes(m);
      setSeconds(s);
      setRemaining(dur);
      originalRemainingRef.current = dur;
      startTimeRef.current = Date.now();
      setFinished(false);
      setRunning(true);
    }
  }, [location.state]);

  const totalSet = hours * 3600 + minutes * 60 + seconds;

  // Background support using Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && running && startTimeRef.current !== null) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const newRemaining = Math.max(0, (originalRemainingRef.current || 0) - elapsed);
        setRemaining(newRemaining);
        if (newRemaining === 0) {
          handleTimerEnd();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [running]);

  useEffect(() => {
    if (running && remaining !== null && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r === null || r <= 1) {
            handleTimerEnd();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const handleTimerEnd = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setFinished(true);
    playAlarm();
  };

  const playAlarm = () => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const beep = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      beep(880, 0, 0.3);
      beep(1100, 0.35, 0.3);
    } catch (_) {}
  };

  const start = () => {
    if (totalSet === 0 && remaining === null) {
      setError("Please set a duration greater than 0");
      return;
    }
    setError(null);
    if (remaining === null || remaining === 0) {
      setRemaining(totalSet);
      originalRemainingRef.current = totalSet;
    } else {
      originalRemainingRef.current = remaining;
    }
    startTimeRef.current = Date.now();
    setFinished(false);
    setRunning(true);
  };

  const pause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setRemaining(null);
    setFinished(false);
    setError(null);
  };

  const disp = remaining !== null ? remaining : totalSet;
  const dh = Math.floor(disp / 3600);
  const dm = Math.floor((disp % 3600) / 60);
  const ds = disp % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const progress = remaining !== null && totalSet > 0 ? (1 - remaining / totalSet) : 0;
  const circumference = 2 * Math.PI * 110;
  const strokeDash = circumference * (1 - progress);

  return (
    <ToolWrapper toolName="Timer">
      <div className="timer-container" style={styles.container}>
        {error && <div aria-live="polite" style={styles.error}>{error}</div>}
        
        <div style={styles.circleWrap}>
          <svg width="280" height="280" viewBox="0 0 280 280" style={{ position: 'absolute' }}>
            <circle cx="140" cy="140" r="110" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle
              cx="140" cy="140" r="110"
              fill="none"
              stroke={finished ? '#e91e8c' : '#00d4ff'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDash}
              transform="rotate(-90 140 140)"
              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s' }}
            />
          </svg>
          <div style={styles.circleInner}>
            <AnimatePresence mode="wait">
              {finished ? (
                <motion.div
                  key="done"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={styles.doneText}
                >
                  Time's Up!
                </motion.div>
              ) : (
                <motion.div key="time" style={styles.timeDisplay}>
                  {dh > 0 && <span style={styles.timeSeg}>{pad(dh)}<span style={styles.timeUnit}>h</span></span>}
                  <span style={styles.timeSeg}>{pad(dm)}<span style={styles.timeUnit}>m</span></span>
                  <span style={styles.timeSeg}>{pad(ds)}<span style={styles.timeUnit}>s</span></span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {!running && remaining === null && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={styles.inputRow}>
            {[
              { label: 'Hours', value: hours, set: setHours, max: 23 },
              { label: 'Min', value: minutes, set: setMinutes, max: 59 },
              { label: 'Sec', value: seconds, set: setSeconds, max: 59 },
            ].map((item) => (
              <div key={item.label} style={styles.inputGroup}>
                <label style={styles.inputLabel}>{item.label}</label>
                <input
                  type="number"
                  aria-label={item.label}
                  min="0"
                  max={item.max}
                  value={item.value}
                  onChange={(e) => item.set(Math.min(item.max, Math.max(0, parseInt(e.target.value) || 0)))}
                  style={styles.numberInput}
                />
              </div>
            ))}
          </motion.div>
        )}

        <div style={styles.controls}>
          {running ? (
            <motion.button onClick={pause} style={{ ...styles.btn, ...styles.btnPrimary }} whileTap={{ scale: 0.95 }}>
              Pause
            </motion.button>
          ) : (
            <motion.button
              onClick={start}
              style={{ ...styles.btn, ...styles.btnPrimary }}
              whileTap={{ scale: 0.95 }}
            >
              {remaining !== null && !finished ? 'Resume' : 'Start'}
            </motion.button>
          )}
          <motion.button onClick={reset} style={{ ...styles.btn, ...styles.btnSecondary }} whileTap={{ scale: 0.95 }}>
            Reset
          </motion.button>
        </div>

        <div style={styles.presets}>
          {[
            { label: '1 min', s: 60 },
            { label: '5 min', s: 300 },
            { label: '10 min', s: 600 },
            { label: '25 min', s: 1500 },
          ].map((p) => (
            <button
              key={p.label}
              onClick={() => {
                reset();
                setHours(0);
                setMinutes(Math.floor(p.s / 60));
                setSeconds(p.s % 60);
              }}
              style={styles.presetBtn}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' },
  error: { color: '#EF4444', fontSize: '14px', marginBottom: '-10px' },
  circleWrap: {
    position: 'relative',
    width: '280px',
    height: '280px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  timeDisplay: { display: 'flex', alignItems: 'flex-end', gap: '4px' },
  timeSeg: {
    fontFamily: "var(--font-stack)",
    fontSize: '36px',
    fontWeight: '900',
    color: '#00d4ff',
    textShadow: '0 0 20px rgba(0,212,255,0.5)',
    lineHeight: 1,
  },
  timeUnit: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
    marginLeft: '1px',
  },
  doneText: {
    fontFamily: "var(--font-stack)",
    fontSize: '22px',
    fontWeight: '900',
    color: '#e91e8c',
    textShadow: '0 0 20px rgba(233,30,140,0.7)',
    textAlign: 'center',
  },
  inputRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' },
  inputLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  numberInput: {
    width: '72px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '20px',
    fontWeight: '700',
    textAlign: 'center',
    padding: '10px 8px',
    outline: 'none',
  },
  controls: { display: 'flex', gap: '12px' },
  btn: {
    fontSize: '14px',
    fontWeight: '700',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 32px',
    cursor: 'pointer',
    letterSpacing: '1px',
    minHeight: '48px',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(108,99,255,0.3)',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.10)',
  },
  presets: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' },
  presetBtn: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    minHeight: '36px',
    transition: 'background 0.2s',
  },
};
