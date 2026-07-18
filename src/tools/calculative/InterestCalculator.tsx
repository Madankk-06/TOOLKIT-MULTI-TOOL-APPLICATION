import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import ToolWrapper from '../../components/ToolWrapper';

type Result = {
  total: number;
  interest: number;
  principal: number;
  data: { year: number, amount: number }[];
};

export default function InterestCalculator(props?: any) {
  const location = useLocation();
  const [type, setType] = useState<'simple' | 'compound'>('compound');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [time, setTime] = useState('');
  const [freq, setFreq] = useState('1');
  const [result, setResult] = useState<Result | null>(null);

  const calculate = (P_val = principal, r_val = rate, t_val = time, type_val = type) => {
    const P = parseFloat(P_val);
    const r = parseFloat(r_val) / 100;
    const t = parseFloat(t_val);
    const n = parseInt(freq);
    if (!P || !r || !t) return;

    const data: { year: number, amount: number }[] = [];
    for (let y = 0; y <= t; y++) {
      let amount = 0;
      if (type_val === 'simple') {
        amount = P * (1 + r * y);
      } else {
        amount = P * Math.pow(1 + r / n, n * y);
      }
      data.push({ year: y, amount: Math.round(amount) });
    }

    const total = data[data.length - 1].amount;
    setResult({
      total,
      interest: total - P,
      principal: P,
      data
    });
  };

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
      const p = data.principal || '';
      const r = data.rate || '';
      const t = data.time || '';
      const ty = data.type === 'simple' ? 'simple' : 'compound';
      
      if (p) setPrincipal(String(p));
      if (r) setRate(String(r));
      if (t) setTime(String(t));
      setType(ty);

      if (p && r && t) {
        calculate(String(p), String(r), String(t), ty);
      }
    }
  }, [location.state]);

  return (
    <ToolWrapper toolName="Interest Calculator">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.tabs}>
            <button 
              onClick={() => { setType('simple'); setResult(null); }}
              style={{ ...styles.tab, ...(type === 'simple' ? styles.tabActive : {}) }}
            >
              Simple
            </button>
            <button 
              onClick={() => { setType('compound'); setResult(null); }}
              style={{ ...styles.tab, ...(type === 'compound' ? styles.tabActive : {}) }}
            >
              Compound
            </button>
          </div>

          <div style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Principal</label>
              <input type="number" value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="10000" style={styles.input} />
            </div>
            <div style={styles.row}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Rate %</label>
                <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="8" style={styles.input} />
              </div>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Years</label>
                <input type="number" value={time} onChange={e => setTime(e.target.value)} placeholder="5" style={styles.input} />
              </div>
            </div>
            {type === 'compound' && (
              <div style={styles.field}>
                <label style={styles.label}>Compound Interval</label>
                <select value={freq} onChange={e => setFreq(e.target.value)} style={styles.select}>
                  <option value="1">Annually</option>
                  <option value="4">Quarterly</option>
                  <option value="12">Monthly</option>
                  <option value="365">Daily</option>
                </select>
              </div>
            )}
            <motion.button onClick={() => calculate()} style={styles.calcBtn} whileTap={{ scale: 0.97 }}>Calculate Growth</motion.button>
          </div>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.resultBox}>
              <div style={styles.statsRow}>
                <div style={styles.stat}>
                  <div style={styles.statLabel}>Total Amount</div>
                  <div style={{ ...styles.statVal, color: 'var(--color-accent)' }}>${result.total.toLocaleString()}</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statLabel}>Interest Total</div>
                  <div style={{ ...styles.statVal, color: '#22C55E' }}>${result.interest.toLocaleString()}</div>
                </div>
              </div>

              <div style={styles.chartTitle}>Wealth Projection</div>
              <div style={{ height: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.data}>
                    <defs>
                      <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" hide />
                    <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--color-bg-elevated)', border: 'none', borderRadius: '12px' }}
                      labelFormatter={(v) => `Year ${v}`}
                      formatter={(v) => [v !== undefined ? `$${Number(v).toLocaleString()}` : '', 'Balance']}
                    />
                    <Area type="monotone" dataKey="amount" stroke="var(--color-accent)" fillOpacity={1} fill="url(#colorAmt)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
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
  tabs: { display: 'flex', background: 'var(--color-bg-elevated)', padding: '4px', borderRadius: '12px' },
  tab: { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--color-text-muted)', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' },
  tabActive: { background: 'var(--color-bg-surface)', color: 'var(--color-accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  row: { display: 'flex', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', fontSize: '16px', padding: '12px', outline: 'none' },
  select: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', padding: '12px', cursor: 'pointer' },
  calcBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer' },
  resultBox: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  statsRow: { display: 'flex', gap: '12px' },
  stat: { flex: 1, background: 'var(--color-bg-elevated)', padding: '16px', borderRadius: '16px', textAlign: 'center' },
  statLabel: { fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' },
  statVal: { fontSize: '20px', fontWeight: 'bold' },
  chartTitle: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }
};
