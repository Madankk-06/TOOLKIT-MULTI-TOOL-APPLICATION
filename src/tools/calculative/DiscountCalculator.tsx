import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

export default function DiscountCalculator(props?: any) {
  const location = useLocation();
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [result, setResult] = useState<{ final: number, saved: number, originalPrice: number } | null>(null);

  const calculate = useCallback((pVal?: string, dVal?: string) => {
    const p = parseFloat(pVal !== undefined ? pVal : price);
    const d = parseFloat(dVal !== undefined ? dVal : discount);
    if (!p || !d) return;

    const saved = (p * d) / 100;
    const final = p - saved;

    setResult({ final, saved, originalPrice: p });
  }, [price, discount]);

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
      const p = data.originalPrice || data.price || '';
      const d = data.discountPercent || data.discount || '';
      if (p) setPrice(String(p));
      if (d) setDiscount(String(d));
      if (p && d) {
        calculate(String(p), String(d));
      }
    }
  }, [location.state, calculate]);

  return (
    <ToolWrapper toolName="Discount Calculator">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.field}>
            <label style={styles.label}>Original Price</label>
            <input 
              type="number" value={price} onChange={e => setPrice(e.target.value)} 
              placeholder="e.g. 1000" style={styles.input} 
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Discount %</label>
            <input 
              type="number" value={discount} onChange={e => setDiscount(e.target.value)} 
              placeholder="20" style={styles.input} 
            />
          </div>

          <motion.button 
            onClick={() => calculate()} style={styles.calcBtn}
            whileTap={{ scale: 0.97 }}
          >
            Calculate Savings
          </motion.button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.resultBox}>
              <div style={styles.finalCard}>
                <div style={styles.finalLabel}>Final Price</div>
                <div style={styles.finalVal}>${result.final.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>

              <div style={styles.statBox}>
                <div style={styles.statLabel}>You Save</div>
                <div style={{ ...styles.statVal, color: '#22C55E' }}>-${result.saved.toLocaleString()}</div>
              </div>

              <div style={styles.barContainer}>
                <div style={styles.barBg}>
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: `${(1 - result.saved/result.originalPrice) * 100}%` }}
                    style={styles.barFill} 
                  />
                </div>
                <div style={styles.barLabels}>
                  <span>0%</span>
                  <span>{Math.round((result.final / result.originalPrice) * 100)}% of original</span>
                  <span>100%</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '440px', margin: '0 auto', padding: '20px' },
  card: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  row: { display: 'flex', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', fontSize: '18px', padding: '14px', outline: 'none' },
  calcBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer' },
  resultBox: { display: 'flex', flexDirection: 'column', gap: '16px' },
  finalCard: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-accent)', borderRadius: '24px', padding: '32px', textAlign: 'center' },
  finalLabel: { fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '8px' },
  finalVal: { fontSize: '48px', fontWeight: '900', color: 'var(--color-accent)' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  statBox: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px' },
  statLabel: { fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' },
  statVal: { fontSize: '18px', fontWeight: 'bold' },
  barContainer: { marginTop: '10px' },
  barBg: { height: '8px', background: 'var(--color-bg-elevated)', borderRadius: '4px', overflow: 'hidden' },
  barFill: { height: '100%', background: 'var(--color-accent)', borderRadius: '4px' },
  barLabels: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '8px' }
};
