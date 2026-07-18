import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

export default function NoiseDetector() {
  const [db, setDb] = useState(0);
  const [peak, setPeak] = useState(0);
  const [active, setActive] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number | null>(null);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      setActive(true);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const avg = sum / dataArray.length;
        
        // Convert to rough decibels (0-100 scale for UI)
        const currentDb = Math.round((avg / 255) * 100);
        setDb(currentDb);
        setPeak(p => Math.max(p, currentDb));
        setHistory(h => [currentDb, ...h].slice(0, 50));
        
        animRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      setError("Microphone access denied.");
    }
  };

  const stop = () => {
    setActive(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close();
    setDb(0);
  };

  const resetPeak = () => setPeak(0);

  const getNoiseLabel = (val: number) => {
    if (val < 30) return { label: 'Quiet', color: '#22C55E' };
    if (val < 60) return { label: 'Moderate', color: '#EAB308' };
    if (val < 85) return { label: 'Loud', color: '#F97316' };
    return { label: 'Extreme', color: '#EF4444' };
  };

  const info = getNoiseLabel(db);

  return (
    <ToolWrapper toolName="Noise Detector">
      <div style={styles.container}>
        {error && <div style={styles.error}>{error}</div>}
        
        <div style={styles.meterContainer}>
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="var(--color-border)" strokeWidth="10" />
            <motion.circle
              cx="100" cy="100" r="90" fill="none"
              stroke={info.color}
              strokeWidth="10"
              strokeDasharray="565.48"
              animate={{ strokeDashoffset: 565.48 * (1 - db / 100) }}
              transform="rotate(-90 100 100)"
              transition={{ type: 'spring', damping: 15 }}
            />
            <text x="100" y="90" textAnchor="middle" fill="#fff" fontSize="32" fontWeight="900">{db}</text>
            <text x="100" y="120" textAnchor="middle" fill="var(--color-text-muted)" fontSize="14">dB (est.)</text>
          </svg>
        </div>

        <div style={{ ...styles.levelCard, borderColor: info.color }}>
          <span style={{ color: info.color, fontWeight: '800' }}>{info.label.toUpperCase()}</span>
          <div style={styles.peakBox}>
            Peak: {peak} dB <button onClick={resetPeak} style={styles.resetBtn}>Reset</button>
          </div>
        </div>

        <div style={styles.sparkline}>
          {history.map((val, i) => (
            <div key={i} style={{
              ...styles.sparkbar,
              height: `${val}%`,
              background: getNoiseLabel(val).color,
              opacity: 1 - (i / history.length)
            }} />
          ))}
        </div>

        <div style={styles.controls}>
          {!active ? (
            <motion.button onClick={start} style={styles.mainBtn} whileTap={{ scale: 0.95 }}>
              Start Sensing
            </motion.button>
          ) : (
            <motion.button onClick={stop} style={styles.stopBtn} whileTap={{ scale: 0.95 }}>
              Stop
            </motion.button>
          )}
        </div>
        
        <p style={styles.hint}>
          30dB: Library · 60dB: Conversation · 85dB: Heavy Traffic · 100dB: Chainsaw
        </p>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '20px' },
  error: { color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 20px', borderRadius: '8px' },
  meterContainer: { position: 'relative', width: '200px', height: '200px' },
  levelCard: { 
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
    padding: '16px 24px', borderRadius: '16px', border: '1px solid', background: 'var(--color-bg-surface)' 
  },
  peakBox: { fontSize: '13px', color: 'var(--color-text-muted)', display: 'flex', gap: '10px', alignItems: 'center' },
  resetBtn: { background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  sparkline: { 
    width: '100%', maxWidth: '300px', height: '60px', display: 'flex', 
    alignItems: 'flex-end', gap: '2px', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px' 
  },
  sparkbar: { width: '4px', borderRadius: '2px', minHeight: '1px' },
  controls: { width: '100%', display: 'flex', justifyContent: 'center' },
  mainBtn: {
    background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)', border: 'none', borderRadius: '12px',
    color: '#fff', fontSize: '14px', fontWeight: '700', padding: '14px 40px', cursor: 'pointer'
  },
  stopBtn: {
    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', 
    borderRadius: '12px', color: '#EF4444', padding: '14px 40px', cursor: 'pointer'
  },
  hint: { fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '300px' }
};
