import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type HistoryLog = {
  id: string;
  type: 'inc' | 'dec' | 'reset';
  amount: number;
  time: string;
};

export default function Counter() {
  const [count, setCount] = useState(() => Number(localStorage.getItem('toolkit_counter_val') || 0));
  const [step, setStep] = useState(() => Number(localStorage.getItem('toolkit_counter_step') || 1));
  const [history, setHistory] = useState<HistoryLog[]>([]);

  useEffect(() => {
    localStorage.setItem('toolkit_counter_val', count.toString());
  }, [count]);

  useEffect(() => {
    localStorage.setItem('toolkit_counter_step', step.toString());
  }, [step]);

  const update = (amt: number) => {
    setCount(prev => prev + amt);
    setHistory(prev => [
      { id: Date.now().toString(), type: amt > 0 ? 'inc' : 'dec', amount: Math.abs(amt), time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 9)
    ]);
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const reset = () => {
    setCount(0);
    setHistory([]);
    if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
  };

  return (
    <ToolWrapper toolName="Tally Counter">
      <div style={styles.container}>
        <div style={styles.display}>
          <motion.div 
            key={count} 
            initial={{ scale: 1.1, opacity: 0.8 }} 
            animate={{ scale: 1, opacity: 1 }}
            style={styles.countContainer}
          >
            <div style={styles.countLabel}>Total Count</div>
            <div style={styles.countValue}>{count.toLocaleString()}</div>
          </motion.div>
        </div>

        <div style={styles.controls}>
          <div style={styles.steps}>
            {[1, 5, 10, 50, 100].map(s => (
              <button 
                key={s} 
                onClick={() => setStep(s)}
                style={{ ...styles.sBtn, ...(step === s ? styles.sActive : {}) }}
              >
                {s}
              </button>
            ))}
          </div>

          <div style={styles.mainPad}>
            <motion.button 
              whileTap={{ scale: 0.95 }} 
              onClick={() => update(step)}
              style={styles.addBtn}
            >
              <span style={styles.plus}>+</span>
              <span style={styles.stepInd}>STEP {step}</span>
            </motion.button>
            <button onClick={() => update(-step)} style={styles.subBtn}>−</button>
          </div>

          <div style={styles.footer}>
            <button onClick={reset} style={styles.resetBtn}>RESET COUNTER</button>
          </div>
        </div>

        <div style={styles.history}>
          <div style={styles.hHead}>RECENT ACTIVITY</div>
          <div style={styles.hList}>
            {history.map(h => (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={h.id} style={styles.hItem}>
                <span style={{ ...styles.hType, color: h.type === 'inc' ? '#10B981' : '#EF4444' }}>
                  {h.type === 'inc' ? 'ADDED' : 'SUBTRACTED'} {h.amount}
                </span>
                <span style={styles.hTime}>{h.time}</span>
              </motion.div>
            ))}
            {history.length === 0 && <div style={styles.empty}>No recent activity</div>}
          </div>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '32px', padding: '20px', maxWidth: '500px', margin: '0 auto' },
  display: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '32px', padding: '64px 32px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' },
  countContainer: {},
  countLabel: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' },
  countValue: { fontSize: '80px', fontWeight: '900', color: '#fff', lineHeight: '1', fontFamily: 'monospace' },
  controls: { display: 'flex', flexDirection: 'column', gap: '24px' },
  steps: { display: 'flex', gap: '8px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', padding: '6px', borderRadius: '16px' },
  sBtn: { flex: 1, background: 'none', border: 'none', borderRadius: '10px', color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: 'bold', padding: '12px', cursor: 'pointer' },
  sActive: { background: 'var(--color-accent)', color: '#fff' },
  mainPad: { display: 'flex', gap: '16px' },
  addBtn: { flex: 4, background: 'var(--color-accent)', border: 'none', borderRadius: '24px', padding: '40px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' },
  plus: { fontSize: '48px', fontWeight: '900', color: '#fff', lineHeight: '1' },
  stepInd: { fontSize: '10px', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)' },
  subBtn: { flex: 1, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', color: '#fff', fontSize: '32px', cursor: 'pointer' },
  footer: { textAlign: 'center' },
  resetBtn: { background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', opacity: 0.7, letterSpacing: '1px' },
  history: { display: 'flex', flexDirection: 'column', gap: '12px' },
  hHead: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', letterSpacing: '1px' },
  hList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  hItem: { display: 'flex', justifyContent: 'space-between', background: 'var(--color-bg-surface)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--color-border)' },
  hType: { fontSize: '11px', fontWeight: 'bold' },
  hTime: { fontSize: '10px', color: 'var(--color-text-muted)' },
  empty: { textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)', padding: '10px' }
};
