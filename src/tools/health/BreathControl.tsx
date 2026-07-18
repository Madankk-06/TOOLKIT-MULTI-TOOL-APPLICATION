import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';

type Phase = {
  label: string;
  duration: number;
  color: string;
  scale: number;
};

type Pattern = {
  id: string;
  name: string;
  phases: Phase[];
  benefit: string;
};

const PATTERNS: Pattern[] = [
  {
    id: '478',
    name: '4-7-8 Relax',
    benefit: 'Reduce anxiety & fall asleep',
    phases: [
      { label: 'Inhale', duration: 4, color: '#6366F1', scale: 1.5 },
      { label: 'Hold', duration: 7, color: '#8B5CF6', scale: 1.5 },
      { label: 'Exhale', duration: 8, color: '#EC4899', scale: 1.0 }
    ]
  },
  {
    id: 'box',
    name: 'Box Breathing',
    benefit: 'Boost focus & performance',
    phases: [
      { label: 'Inhale', duration: 4, color: '#6366F1', scale: 1.5 },
      { label: 'Hold', duration: 4, color: '#8B5CF6', scale: 1.5 },
      { label: 'Exhale', duration: 4, color: '#EC4899', scale: 1.0 },
      { label: 'Hold', duration: 4, color: '#8B5CF6', scale: 1.0 }
    ]
  },
  {
    id: 'equal',
    name: 'Equal Balance',
    benefit: 'Mindfulness & grounding',
    phases: [
      { label: 'Inhale', duration: 5, color: '#6366F1', scale: 1.5 },
      { label: 'Exhale', duration: 5, color: '#EC4899', scale: 1.0 }
    ]
  },
  {
    id: 'calm',
    name: 'Deep Calm',
    benefit: 'Soothe nerves & slow heart rate',
    phases: [
      { label: 'Inhale', duration: 4, color: '#10B981', scale: 1.4 },
      { label: 'Hold', duration: 2, color: '#059669', scale: 1.4 },
      { label: 'Exhale', duration: 4, color: '#34D399', scale: 1.0 }
    ]
  },
  {
    id: 'awake',
    name: 'Energy Boost',
    benefit: 'Awaken body & increase alert state',
    phases: [
      { label: 'Inhale', duration: 2, color: '#F59E0B', scale: 1.4 },
      { label: 'Exhale', duration: 2, color: '#EF4444', scale: 1.0 }
    ]
  }
];

export default function BreathControl() {
  const [patternId, setPatternId] = useState('478');
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [rounds, setRounds] = useState(0);
  
  const { tokens } = useTheme();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pattern = PATTERNS.find(p => p.id === patternId) || PATTERNS[0];
  const currentPhase = pattern.phases[phaseIdx];

  const start = useCallback(() => {
    setRunning(true);
    setPhaseIdx(0);
    setRounds(0);
    setTimeLeft(pattern.phases[0].duration);
  }, [pattern]);

  const stop = () => {
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setPhaseIdx(prev => {
              const next = (prev + 1) % pattern.phases.length;
              if (next === 0) setRounds(r => r + 1);
              return next;
            });
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, pattern.phases.length]);

  useEffect(() => {
    if (timeLeft === 0 && running) {
      setTimeLeft(pattern.phases[phaseIdx].duration);
      if ('vibrate' in navigator) {
        navigator.vibrate(30); // minor pulse on phase change
      }
    }
  }, [phaseIdx, timeLeft, running, pattern]);

  return (
    <ToolWrapper toolName="Breath Control">
      <div style={styles.container}>
        {!running ? (
          <div style={styles.picker}>
            {PATTERNS.map(p => (
              <button 
                key={p.id} 
                onClick={() => setPatternId(p.id)}
                style={{ 
                  ...styles.pBtn, 
                  background: tokens.surface, 
                  borderColor: patternId === p.id ? tokens.accent : tokens.border 
                }}
              >
                <div style={{ ...styles.pName, color: tokens.textPrimary }}>{p.name}</div>
                <div style={{ ...styles.pBenefit, color: tokens.textSecondary }}>{p.benefit}</div>
              </button>
            ))}
            <button onClick={start} style={{ ...styles.startBtn, background: tokens.accent }}>START SESSION</button>
          </div>
        ) : (
          <div style={styles.session}>
            <div style={styles.stats}>
              <div style={{ ...styles.stat, color: tokens.textSecondary }}>Round {rounds + 1}</div>
              <button onClick={stop} style={{ ...styles.stopBtn, color: tokens.textPrimary }}>Exit</button>
            </div>

            <div style={styles.visualizer}>
              <motion.div 
                animate={{ 
                  scale: currentPhase.scale,
                  backgroundColor: currentPhase.color,
                  boxShadow: `0 0 80px ${currentPhase.color}55`
                }}
                transition={{ duration: currentPhase.duration, ease: 'easeInOut' }}
                style={styles.circle}
              >
                <div style={styles.timer}>{timeLeft}</div>
                <div style={styles.label}>{currentPhase.label}</div>
              </motion.div>
            </div>

            <div style={styles.progTrack}>
              {pattern.phases.map((ph, i) => (
                <div key={i} style={{ ...styles.progStep, opacity: phaseIdx === i ? 1 : 0.25, background: ph.color }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '32px', padding: '10px', maxWidth: '500px', margin: '0 auto', minHeight: '480px', justifyContent: 'center' },
  picker: { display: 'flex', flexDirection: 'column', gap: '14px' },
  pBtn: { border: '1px solid', borderRadius: '20px', padding: '20px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' },
  pName: { fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' },
  pBenefit: { fontSize: '12px' },
  startBtn: { border: 'none', borderRadius: '16px', color: '#fff', fontWeight: 'bold', padding: '18px', fontSize: '16px', cursor: 'pointer', marginTop: '12px' },
  session: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px', width: '100%' },
  stats: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  stat: { fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' },
  stopBtn: { background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' },
  visualizer: { width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  circle: { width: '160px', height: '160px', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' },
  timer: { fontSize: '48px', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.2)' },
  label: { fontSize: '13px', fontWeight: 'bold', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '1.5px', textShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  progTrack: { display: 'flex', gap: '8px' },
  progStep: { width: '12px', height: '12px', borderRadius: '6px', transition: 'opacity 0.3s' }
};
