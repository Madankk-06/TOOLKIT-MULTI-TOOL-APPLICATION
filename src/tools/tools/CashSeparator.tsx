import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type Denom = {
  denom: number;
  count: number;
};

const DENOMINATIONS: Record<string, number[]> = {
  INR: [500, 200, 100, 50, 20, 10, 5, 2, 1],
  USD: [100, 50, 20, 10, 5, 2, 1],
  EUR: [500, 200, 100, 50, 20, 10, 5, 2, 1],
  GBP: [50, 20, 10, 5, 2, 1]
};

export default function CashSeparator(props?: any) {
  const location = useLocation();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [result, setResult] = useState<Denom[] | null>(null);

  useEffect(() => {
    const data = props?.params || props?.aiPayload || location.state?.aiPayload || location.state?.params;
    if (data) {
      if (data.amount !== undefined) {
        setAmount(String(data.amount));
        // Auto-calculate if amount is provided
        setTimeout(() => {
          let rem = Math.floor(parseFloat(String(data.amount)) || 0);
          if (rem > 0) {
            const currencyVal = (data.currency || 'INR').toUpperCase();
            const validCurrency = Object.keys(DENOMINATIONS).includes(currencyVal) ? currencyVal : 'INR';
            setCurrency(validCurrency);
            const denoms = DENOMINATIONS[validCurrency];
            const breakdown: Denom[] = [];
            for (const d of denoms) {
              if (rem >= d) { const count = Math.floor(rem / d); breakdown.push({ denom: d, count }); rem -= count * d; }
            }
            setResult(breakdown);
          }
        }, 50);
      }
      if (data.currency) {
        const c = String(data.currency).toUpperCase();
        if (Object.keys(DENOMINATIONS).includes(c)) setCurrency(c);
      }
    }
  }, [location.state]);

  const calculate = () => {
    let rem = Math.floor(parseFloat(amount) || 0);
    if (rem <= 0) return;

    const denoms = DENOMINATIONS[currency];
    const breakdown: Denom[] = [];

    for (const d of denoms) {
      if (rem >= d) {
        const count = Math.floor(rem / d);
        breakdown.push({ denom: d, count });
        rem -= count * d;
      }
    }
    setResult(breakdown);
  };

  const getSymbol = (c: string) => {
    switch(c) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return '';
    }
  };

  return (
    <ToolWrapper toolName="Cash Separator">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.inputRow}>
            <div style={styles.field}>
              <label style={styles.label}>Total Cash Amount</label>
              <input
                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && calculate()}
                placeholder="e.g. 15450" style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Currency</label>
              <select value={currency} onChange={e => { setCurrency(e.target.value); setResult(null); }} style={styles.select}>
                {Object.keys(DENOMINATIONS).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <motion.button 
            onClick={calculate} 
            style={styles.calcBtn}
            whileTap={{ scale: 0.97 }}
          >
            Calculate Denominations
          </motion.button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={styles.resultCard}
            >
              <div style={styles.resultHeader}>Breakdown</div>
              <div style={styles.list}>
                {result.map((r, i) => (
                  <motion.div 
                    key={r.denom} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={styles.denomRow}
                  >
                    <div style={styles.denomVisual}>
                       <span style={styles.symbol}>{getSymbol(currency)}</span>
                       <span style={styles.val}>{r.denom}</span>
                    </div>
                    <div style={styles.connector}>..................................................</div>
                    <div style={styles.countBox}>
                      <span style={styles.countText}>× {r.count}</span>
                      <span style={styles.totalText}>= {getSymbol(currency)}{(r.denom * r.count).toLocaleString()}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div style={styles.summary}>
                Total Notes: {result.reduce((acc, r) => acc + r.count, 0)}
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
  inputRow: { display: 'flex', gap: '12px' },
  field: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', fontSize: '18px', padding: '14px', outline: 'none' },
  select: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: 'var(--color-accent)', padding: '14px', fontSize: '14px', fontWeight: 'bold' },
  calcBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer', fontSize: '16px' },
  resultCard: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px' },
  resultHeader: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '20px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  denomRow: { display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' },
  denomVisual: { width: '80px', display: 'flex', alignItems: 'baseline', gap: '4px' },
  symbol: { fontSize: '12px', color: 'var(--color-text-muted)' },
  val: { fontSize: '20px', fontWeight: 'bold', color: '#fff' },
  connector: { flex: 1, color: 'var(--color-border)', overflow: 'hidden', whiteSpace: 'nowrap', opacity: 0.3 },
  countBox: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '70px' },
  countText: { fontSize: '14px', fontWeight: 'bold', color: 'var(--color-accent)' },
  totalText: { fontSize: '10px', color: 'var(--color-text-muted)' },
  summary: { marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }
};
