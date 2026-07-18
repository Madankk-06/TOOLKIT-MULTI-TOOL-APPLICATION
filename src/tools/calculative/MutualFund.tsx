import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ToolWrapper from '../../components/ToolWrapper';

type Result = {
  invested: number;
  total: number;
  returns: number;
  data: { year: number, value: number, invested: number }[];
};

export default function MutualFund(props?: any) {
  const location = useLocation();
  const [mode, setMode] = useState<'sip' | 'lump'>('sip');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('12');
  const [years, setYears] = useState('10');
  const [result, setResult] = useState<Result | null>(null);

  const calculate = useCallback((aVal?: string, rVal?: string, yVal?: string, mVal?: 'sip' | 'lump') => {
    const activeMode = mVal !== undefined ? mVal : mode;
    const p = parseFloat(aVal !== undefined ? aVal : amount);
    const r = parseFloat(rVal !== undefined ? rVal : rate) / 100;
    const t = parseFloat(yVal !== undefined ? yVal : years);

    if (!p || !r || !t) return;

    let invested = 0;
    let total = 0;
    const data: { year: number, value: number, invested: number }[] = [];

    if (activeMode === 'sip') {
      const mr = r / 12;
      const months = t * 12;
      invested = p * months;
      total = p * ((Math.pow(1 + mr, months) - 1) / mr) * (1 + mr);
      
      for (let y = 1; y <= t; y++) {
        const m = y * 12;
        const val = p * ((Math.pow(1 + mr, m) - 1) / mr) * (1 + mr);
        data.push({ year: y, value: Math.round(val), invested: p * m });
      }
    } else {
      invested = p;
      total = p * Math.pow(1 + r, t);
      for (let y = 1; y <= t; y++) {
        data.push({ year: y, value: Math.round(p * Math.pow(1 + r, y)), invested: p });
      }
    }

    setResult({
      invested: Math.round(invested),
      total: Math.round(total),
      returns: Math.round(total - invested),
      data
    });
  }, [amount, rate, years, mode]);

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
      const a = data.amount || '';
      const r = data.rate || '';
      const y = data.tenure || data.years || '';
      const m = data.type === 'lumpsum' || data.type === 'lump' ? 'lump' : 'sip';
      if (a) setAmount(String(a));
      if (r) setRate(String(r));
      if (y) setYears(String(y));
      setMode(m);

      const finalAmount = a || amount || '5000';
      const finalRate = r || rate || '12';
      const finalYears = y || years || '10';

      if (finalAmount && finalRate && finalYears) {
        calculate(String(finalAmount), String(finalRate), String(finalYears), m);
      }
    }
  }, [location.state]);

  return (
    <ToolWrapper toolName="Mutual Fund">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.tabs}>
            <button 
              onClick={() => { setMode('sip'); setResult(null); }}
              style={{ ...styles.tab, ...(mode === 'sip' ? styles.tabActive : {}) }}
            >
              SIP (Monthly)
            </button>
            <button 
              onClick={() => { setMode('lump'); setResult(null); }}
              style={{ ...styles.tab, ...(mode === 'lump' ? styles.tabActive : {}) }}
            >
              Lump Sum
            </button>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>{mode === 'sip' ? 'Monthly Investment' : 'Total Investment'}</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000" style={styles.input} />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Expected Returns (%)</label>
              <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="12" style={styles.input} />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Years</label>
              <input type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="10" style={styles.input} />
            </div>
          </div>

          <motion.button onClick={() => calculate()} style={styles.calcBtn} whileTap={{ scale: 0.97 }}>
            Project Wealth
          </motion.button>
        </div>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.resultBox}>
              <div style={styles.statsRow}>
                <div style={styles.stat}>
                  <div style={styles.statLabel}>Total Wealth</div>
                  <div style={{ ...styles.statVal, color: 'var(--color-accent)' }}>${result.total.toLocaleString()}</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statLabel}>Est. Returns</div>
                  <div style={{ ...styles.statVal, color: '#22C55E' }}>${result.returns.toLocaleString()}</div>
                </div>
              </div>

              <div style={styles.chartTitle}>Return Projection</div>
              <div style={{ height: '220px', width: '100%', padding: '0 8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.data}>
                    <defs>
                      <linearGradient id="wealth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="principal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" hide />
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--color-bg-elevated)', border: 'none', borderRadius: '12px' }}
                      formatter={(v) => [v !== undefined ? `$${Number(v).toLocaleString()}` : '']}
                    />
                    <Area type="monotone" dataKey="value" stroke="var(--color-accent)" fillOpacity={1} fill="url(#wealth)" strokeWidth={3} />
                    <Area type="monotone" dataKey="invested" stroke="#9CA3AF" fillOpacity={1} fill="url(#principal)" strokeWidth={2} strokeDasharray="5 5" />
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
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '440px', margin: '0 auto', padding: '20px' },
  card: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  tabs: { display: 'flex', background: 'var(--color-bg-elevated)', padding: '4px', borderRadius: '12px' },
  tab: { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--color-text-muted)', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' },
  tabActive: { background: 'var(--color-bg-surface)', color: 'var(--color-accent)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  row: { display: 'flex', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', fontSize: '18px', padding: '14px', outline: 'none' },
  calcBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer' },
  resultBox: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  statsRow: { display: 'flex', gap: '12px' },
  stat: { flex: 1, background: 'var(--color-bg-elevated)', padding: '16px', borderRadius: '16px', textAlign: 'center' },
  statLabel: { fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '4px' },
  statVal: { fontSize: '20px', fontWeight: 'bold' },
  chartTitle: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }
};
