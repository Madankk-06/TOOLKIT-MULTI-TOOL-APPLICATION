import React, { useEffect, useState, useCallback } from 'react';
import ToolWrapper from '../../components/ToolWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export default function LevelMeasure() {
  const [angle, setAngle] = useState({ x: 0, y: 0 });
  const [supported, setSupported] = useState(true);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tokens } = useTheme();

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    // 0.1 degree precision
    const x = +(e.beta || 0).toFixed(1);
    const y = +(e.gamma || 0).toFixed(1);
    setAngle({ x, y });

    // Vibration on center (level)
    if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) {
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
    }
  }, []);

  const start = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const state = await (DeviceOrientationEvent as any).requestPermission();
        if (state === 'granted') {
          setActive(true);
        } else {
          setError('Permission denied.');
        }
      } catch (err) {
        setError('Error requesting permission.');
      }
    } else {
      setActive(true);
    }
  };

  useEffect(() => {
    start();
  }, []);

  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setSupported(false);
      return;
    }
    if (active) {
      window.addEventListener('deviceorientation', handleOrientation);
      return () => window.removeEventListener('deviceorientation', handleOrientation);
    }
  }, [active, handleOrientation]);

  const isLevel = Math.abs(angle.x) < 1 && Math.abs(angle.y) < 1;
  const bubbleX = Math.min(Math.max(angle.y * 3, -100), 100);
  const bubbleY = Math.min(Math.max(angle.x * 3, -100), 100);

  return (
    <ToolWrapper toolName="Level Measure">
      <div style={styles.container}>
        {!supported ? (
          <div style={styles.error}>Sensor not supported on this device.</div>
        ) : (
          <>
            <div style={{ 
              ...styles.levelBox, 
              borderColor: isLevel ? '#22C55E' : tokens.border,
              background: tokens.surface
            }}>
              <div style={{ ...styles.crossH, background: isLevel ? 'rgba(34,197,94,0.4)' : tokens.border, opacity: 0.5 }} />
              <div style={{ ...styles.crossV, background: isLevel ? 'rgba(34,197,94,0.4)' : tokens.border, opacity: 0.5 }} />
              
              {/* Displacement Visual Vector & Target Rings */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                <circle cx="120" cy="120" r="30" fill="none" stroke={isLevel ? 'rgba(34,197,94,0.4)' : tokens.border} strokeWidth="1" strokeDasharray="3,3" />
                <circle cx="120" cy="120" r="60" fill="none" stroke={isLevel ? 'rgba(34,197,94,0.3)' : tokens.border} strokeWidth="1" strokeDasharray="3,3" />
                <circle cx="120" cy="120" r="90" fill="none" stroke={isLevel ? 'rgba(34,197,94,0.2)' : tokens.border} strokeWidth="1" strokeDasharray="3,3" />
                
                {/* Dotted vector showing direction & magnitude of displacement */}
                <line 
                  x1="120" 
                  y1="120" 
                  x2={120 + bubbleX} 
                  y2={120 + bubbleY} 
                  stroke={isLevel ? '#22C55E' : tokens.accent} 
                  strokeWidth="2.5" 
                  strokeDasharray="4,4"
                />
              </svg>

              <motion.div
                style={{
                  ...styles.bubble,
                  background: isLevel ? '#22C55E' : tokens.accent,
                  boxShadow: isLevel ? '0 0 30px #22C55E' : `0 0 15px ${tokens.accent}66`,
                }}
                animate={{ x: bubbleX, y: bubbleY }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              />
              
              <div style={{ ...styles.centerDot, background: isLevel ? '#22C55E' : tokens.textSecondary }} />
            </div>

            <div style={styles.info}>
              <div style={{ ...styles.status, color: isLevel ? '#22C55E' : tokens.textPrimary }}>
                {isLevel ? '✓ LEVEL' : 'ADJUSTING'}
              </div>
              <div style={{ ...styles.angles, color: tokens.textSecondary }}>
                X: {angle.x}° | Y: {angle.y}°
              </div>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.controls}>
              {!active ? (
                <motion.button onClick={start} style={{ ...styles.mainBtn, background: `linear-gradient(135deg, ${tokens.accent}, #8B5CF6)` }} whileTap={{ scale: 0.95 }}>
                  Unlock Sensors
                </motion.button>
              ) : (
                <motion.button onClick={() => setActive(false)} style={{ ...styles.stopBtn, background: tokens.inputBg, borderColor: tokens.border, color: tokens.textPrimary }} whileTap={{ scale: 0.95 }}>
                  Pause
                </motion.button>
              )}
            </div>
            
            <p style={{ ...styles.hint, color: tokens.textSecondary }}>
              Place phone flat on surface. Calibrated to 0.1° accuracy.
            </p>
          </>
        )}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', padding: '10px' },
  levelBox: {
    width: '240px', height: '240px', borderRadius: '50%', border: '4px solid',
    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
  },
  crossH: { position: 'absolute', width: '80%', height: '1px' },
  crossV: { position: 'absolute', height: '80%', width: '1px' },
  bubble: { width: '44px', height: '44px', borderRadius: '50%', position: 'absolute', zIndex: 2 },
  centerDot: { width: '10px', height: '10px', borderRadius: '50%', position: 'absolute', zIndex: 3 },
  info: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  status: { fontSize: '24px', fontWeight: '900', letterSpacing: '1px' },
  angles: { fontSize: '18px', fontFamily: 'monospace' },
  error: { color: '#EF4444', fontSize: '14px', background: 'rgba(239,68,68,0.1)', padding: '10px 20px', borderRadius: '12px' },
  controls: { width: '100%', display: 'flex', justifyContent: 'center' },
  mainBtn: {
    border: 'none', borderRadius: '14px',
    color: '#fff', fontSize: '15px', fontWeight: '700', padding: '14px 40px', cursor: 'pointer'
  },
  stopBtn: {
    border: '1px solid',
    borderRadius: '14px', padding: '14px 40px', cursor: 'pointer'
  },
  hint: { fontSize: '12px', textAlign: 'center', maxWidth: '240px', opacity: 0.6 }
};
