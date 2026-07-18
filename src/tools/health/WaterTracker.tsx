import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

export default function WaterTracker(props?: any) {
  const location = useLocation();
  const [intake, setIntake] = useState(0);
  const [goal, setGoal] = useState(2500); // ml

  useEffect(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem('toolkit_water_data');
    let loadedIntake = 0;
    let loadedGoal = 2500;
    if (saved) {
      const { date, amount, userGoal } = JSON.parse(saved);
      if (date === today) {
        loadedIntake = amount;
        loadedGoal = userGoal;
        setIntake(amount);
        setGoal(userGoal);
      }
    }

    // Process parameters from navigation state
    let data = null;
        if (props && (props.params || props.aiPayload)) {
          data = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          data = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          data = props;
        }
    if (data && data.amount) {
      const ml = Number(data.amount);
      if (ml > 0) {
        setIntake(prev => Math.min(prev + ml, loadedGoal * 2));
      }
    }
  }, [location.state]);

  useEffect(() => {
    const data = {
      date: new Date().toDateString(),
      amount: intake,
      userGoal: goal
    };
    localStorage.setItem('toolkit_water_data', JSON.stringify(data));
  }, [intake, goal]);

  const add = (ml: number) => setIntake(i => Math.min(i + ml, goal * 2));
  
  const pct = Math.min((intake / goal) * 100, 100);

  return (
    <ToolWrapper toolName="Water Tracker">
      <div style={styles.container}>
        <div style={styles.stats}>
          <div style={styles.stat}>
            <div style={styles.sVal}>{(intake / 1000).toFixed(1)}L</div>
            <div style={styles.sLab}>Current</div>
          </div>
          <div style={styles.stat}>
            <div style={styles.sVal}>{(goal / 1000).toFixed(1)}L</div>
            <div style={styles.sLab}>Target</div>
          </div>
        </div>

        <div style={styles.visualizer}>
          <div style={styles.glass}>
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: `${pct}%` }}
              style={styles.water}
            />
            <div style={styles.overlay}>
              <div style={styles.pct}>{Math.round(pct)}%</div>
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={() => add(250)} style={styles.aBtn}>
            <span style={styles.aIcon}>🥛</span>
            <span style={styles.aText}>250ml</span>
          </button>
          <button onClick={() => add(500)} style={styles.aBtn}>
            <span style={styles.aIcon}>🥤</span>
            <span style={styles.aText}>500ml</span>
          </button>
          <button onClick={() => add(750)} style={styles.aBtn}>
            <span style={styles.aIcon}>🍼</span>
            <span style={styles.aText}>750ml</span>
          </button>
        </div>

        <div style={styles.settings}>
          <div style={styles.row}>
            <span style={styles.label}>Daily Goal</span>
            <span style={styles.goalVal}>{goal} ml</span>
          </div>
          <input 
            type="range" min="1000" max="5000" step="100" 
            value={goal} onChange={e => setGoal(Number(e.target.value))} 
            style={styles.slider}
          />
        </div>

        <button onClick={() => setIntake(0)} style={styles.resetBtn}>RESET DAY</button>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '40px', padding: '20px', maxWidth: '440px', margin: '0 auto' },
  stats: { display: 'flex', justifyContent: 'center', gap: '32px' },
  stat: { textAlign: 'center' },
  sVal: { fontSize: '28px', fontWeight: '900', color: 'var(--color-accent)' },
  sLab: { fontSize: '10px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' },
  visualizer: { display: 'flex', justifyContent: 'center', padding: '20px 0' },
  glass: { width: '140px', height: '240px', background: 'var(--color-bg-surface)', border: '4px solid var(--color-border)', borderRadius: '16px 16px 40px 40px', position: 'relative', overflow: 'hidden' },
  water: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(180deg, #60A5FA 0%, #2563EB 100%)', transition: 'height 0.5s ease-out' },
  overlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', mixBlendMode: 'difference' },
  pct: { fontSize: '32px', fontWeight: '900', color: '#fff' },
  actions: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  aBtn: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' },
  aIcon: { fontSize: '24px' },
  aText: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)' },
  settings: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  goalVal: { fontSize: '16px', fontWeight: 'bold', color: 'var(--color-accent)' },
  slider: { width: '100%', accentColor: 'var(--color-accent)' },
  resetBtn: { background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', opacity: 0.7 }
};
