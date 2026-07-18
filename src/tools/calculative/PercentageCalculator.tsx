import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

const MODES = [
  { id: 'of', label: 'X% and Y', desc: 'Find X% of Y', formula: (x: number, y: number) => (x / 100) * y },
  { id: 'is_what', label: 'X of Y', desc: 'X is what % of Y', formula: (x: number, y: number) => (x / y) * 100 },
  { id: 'change', label: 'X to Y', desc: '% Increase/Decrease', formula: (x: number, y: number) => ((y - x) / x) * 100 },
];

export default function PercentageCalculator(props?: any) {
  const location = useLocation();
  const [mode, setMode] = useState(MODES[0]);
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const calculate = useCallback((xVal?: string, yVal?: string) => {
    const valX = parseFloat(xVal !== undefined ? xVal : x);
    const valY = parseFloat(yVal !== undefined ? yVal : y);
    if (isNaN(valX) || isNaN(valY)) return;
    const res = mode.formula(valX, valY);
    setResult(res);
  }, [x, y, mode]);

  useEffect(() => {
    let data = null;
        if (props && (props.params || props.aiPayload)) {
          data = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          data = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          data = props;
        }
    if (data) {
      const activeModeId = data.mode || 'of';
      const m = MODES.find(item => item.id === activeModeId) || MODES[0];
      setMode(m);
      
      const valX = data.x !== undefined ? data.x : (data.percentage !== undefined ? data.percentage : '');
      const valY = data.y !== undefined ? data.y : (data.value !== undefined ? data.value : '');
      
      if (valX !== '') setX(String(valX));
      if (valY !== '') setY(String(valY));
      
      if (valX !== '' && valY !== '') {
        const res = m.formula(parseFloat(String(valX)), parseFloat(String(valY)));
        setResult(res);
      }
    }
  }, [location.state]);

  return (
    <ToolWrapper toolName="Percentage Calculator">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.modeTabs}>
            {MODES.map(m => (
              <button 
                key={m.id} onClick={() => { setMode(m); setResult(null); }}
                style={{ ...styles.tab, ...(mode.id === m.id ? styles.tabActive : {}) }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div style={styles.inputArea}>
            <div style={styles.field}>
              <label style={styles.label}>{mode.id === 'change' ? 'Initial Value (X)' : 'Value X'}</label>
              <input type="number" value={x} onChange={e => setX(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>{mode.id === 'change' ? 'Final Value (Y)' : 'Value Y'}</label>
              <input type="number" value={y} onChange={e => setY(e.target.value)} style={styles.input} />
            </div>
          </div>

          <motion.button onClick={() => calculate()} style={styles.calcBtn} whileTap={{ scale: 0.97 }}>
            Calculate {mode.desc}
          </motion.button>
        </div>

        <AnimatePresence>
          {result !== null && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.resultCard}>
              <div style={styles.resLabel}>{mode.desc}</div>
              <div style={styles.resVal}>
                {Number.isInteger(result) ? result : result.toFixed(2)}
                <span style={styles.resSymbol}>{mode.id !== 'of' ? '%' : ''}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '440px', margin: '0 auto', padding: '20px' },
  card: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  modeTabs: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'var(--color-bg-elevated)', padding: '4px', borderRadius: '14px' },
  tab: { padding: '10px 4px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  tabActive: { background: 'var(--color-bg-surface)', color: 'var(--color-accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  inputArea: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', fontSize: '18px', padding: '14px', outline: 'none' },
  calcBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer' },
  resultCard: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-accent)', borderRadius: '24px', padding: '32px', textAlign: 'center' },
  resLabel: { fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '8px' },
  resVal: { fontSize: '48px', fontWeight: '900', color: 'var(--color-accent)' },
  resSymbol: { fontSize: '24px', marginLeft: '4px', color: 'var(--color-text-primary)', opacity: 0.8 }
};
