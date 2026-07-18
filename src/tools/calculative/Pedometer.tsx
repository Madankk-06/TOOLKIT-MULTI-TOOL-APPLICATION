import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';

export default function Pedometer() {
  const { tokens } = useTheme();
  const [steps, setSteps] = useState(() => parseInt(localStorage.getItem('pedometer_steps') || '0'));
  const [active, setActive] = useState(false);
  const [goal, setGoal] = useState(10000);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  const lastAccel = useRef<number | null>(null);
  const lastStepTime = useRef(0);
  const filterVal = useRef(9.8); // gravity filter baseline
  const threshold = 1.5; // step magnitude deviation threshold

  const requestPermission = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const state = await (DeviceMotionEvent as any).requestPermission();
        if (state === 'granted') {
          setPermissionState('granted');
          setActive(true);
        } else {
          setPermissionState('denied');
        }
      } catch (err) {
        setPermissionState('denied');
      }
    } else {
      setPermissionState('granted');
      setActive(true);
    }
  };

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    if (!window.DeviceMotionEvent) {
      setIsSupported(false);
      return;
    }

    const handleMotion = (e: DeviceMotionEvent) => {
      if (!active) return;
      
      let acc = e.acceleration;
      let includesGravity = false;
      
      // Fallback if raw linear acceleration is null (common on Android/Chrome)
      if (!acc || acc.x === null || acc.y === null || acc.z === null) {
        acc = e.accelerationIncludingGravity;
        includesGravity = true;
      }
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      let magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      
      if (includesGravity) {
        // Low-pass filter to extract gravity component
        filterVal.current = 0.85 * filterVal.current + 0.15 * magnitude;
        // Subtract gravity to isolate motion acceleration
        magnitude = Math.abs(magnitude - filterVal.current);
      }

      const now = Date.now();
      if (lastAccel.current !== null) {
        const delta = Math.abs(magnitude - lastAccel.current);
        // Step detection: crossing threshold + minimum pace frequency gate (350ms)
        if (delta > threshold && now - lastStepTime.current > 360) {
          setSteps(s => {
            const next = s + 1;
            localStorage.setItem('pedometer_steps', String(next));
            return next;
          });
          lastStepTime.current = now;
          if ('vibrate' in navigator) {
            navigator.vibrate(10); // minor haptic feedback on step detected
          }
        }
      }
      lastAccel.current = magnitude;
    };

    if (active) {
      window.addEventListener('devicemotion', handleMotion);
    }
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, [active]);

  const reset = () => {
    setSteps(0);
    localStorage.setItem('pedometer_steps', '0');
  };

  const calories = (steps * 0.04).toFixed(1);
  const distance = (steps * 0.00076).toFixed(2); // In km (avg step ~0.76m)
  const progress = Math.min((steps / goal) * 100, 100);

  return (
    <ToolWrapper toolName="Pedometer">
      <div style={styles.container}>
        <div style={styles.mainDisplay}>
          <svg width="240" height="240" viewBox="0 0 240 240">
            <circle cx="120" cy="120" r="100" fill="none" stroke={tokens.border} strokeWidth="12" style={{ opacity: 0.2 }} />
            <motion.circle
              cx="120" cy="120" r="100"
              fill="none"
              stroke={tokens.accent}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 100}
              initial={{ strokeDashoffset: 2 * Math.PI * 100 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 100 * (1 - progress / 100) }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          
          <div style={styles.innerContent}>
            <div style={{ ...styles.stepNum, color: tokens.textPrimary }}>{steps.toLocaleString()}</div>
            <div style={{ ...styles.stepLabel, color: tokens.textSecondary }}>STEPS</div>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={{ ...styles.statBox, background: tokens.surface, borderColor: tokens.border }}>
            <div style={{ ...styles.statVal, color: tokens.accent }}>{distance}</div>
            <div style={{ ...styles.statSub, color: tokens.textSecondary }}>Km</div>
          </div>
          <div style={{ ...styles.statBox, background: tokens.surface, borderColor: tokens.border }}>
            <div style={{ ...styles.statVal, color: tokens.accent }}>{calories}</div>
            <div style={{ ...styles.statSub, color: tokens.textSecondary }}>Kcal</div>
          </div>
          <div style={{ ...styles.statBox, background: tokens.surface, borderColor: tokens.border }}>
            <div style={{ ...styles.statVal, color: tokens.accent }}>{goal.toLocaleString()}</div>
            <div style={{ ...styles.statSub, color: tokens.textSecondary }}>Goal</div>
          </div>
        </div>

        {!isSupported && (
          <div style={styles.alert}>
            Sensor not found or blocked. Using manual mode.
            <button onClick={() => setSteps(s => s + 1)} style={styles.manualBtn}>+1 Step</button>
          </div>
        )}

        <div style={styles.controls}>
          <button 
            onClick={permissionState !== 'granted' ? requestPermission : () => setActive(!active)} 
            style={{ 
              ...styles.primaryBtn, 
              background: active ? '#EF4444' : tokens.accent 
            }}
          >
            {permissionState !== 'granted' ? 'Enable Permissions' : active ? 'Stop Tracking' : 'Start Tracking'}
          </button>
          <button onClick={reset} style={{ ...styles.secondaryBtn, background: tokens.inputBg, borderColor: tokens.border, color: tokens.textPrimary }}>Reset</button>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', padding: '10px' },
  mainDisplay: { position: 'relative', width: '240px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  innerContent: { position: 'absolute', textAlign: 'center' },
  stepNum: { fontSize: '48px', fontWeight: '900', lineHeight: 1 },
  stepLabel: { fontSize: '12px', fontWeight: 'bold', letterSpacing: '2px', marginTop: '4px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%', maxWidth: '400px' },
  statBox: { border: '1px solid', borderRadius: '20px', padding: '16px', textAlign: 'center' },
  statVal: { fontSize: '20px', fontWeight: 'bold' },
  statSub: { fontSize: '10px', textTransform: 'uppercase', marginTop: '2px' },
  alert: { background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: '12px', padding: '12px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px' },
  manualBtn: { background: '#EF4444', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', padding: '4px 10px', cursor: 'pointer' },
  controls: { display: 'flex', gap: '12px', width: '100%', maxWidth: '400px' },
  primaryBtn: { flex: 2, border: 'none', borderRadius: '16px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' },
  secondaryBtn: { flex: 1, border: '1px solid', borderRadius: '16px', fontWeight: 'bold', padding: '16px', cursor: 'pointer' }
};
