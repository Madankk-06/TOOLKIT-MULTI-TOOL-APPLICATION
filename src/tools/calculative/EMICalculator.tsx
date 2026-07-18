import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import ToolWrapper from '../../components/ToolWrapper';

type Result = {
  emi: string;
  total: string;
  interest: string;
  data: any[];
};

export default function EMICalculator(props?: any) {
  const location = useLocation();
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [tenureType, setTenureType] = useState<'years' | 'months'>('years');
  const [result, setResult] = useState<Result | null>(null);

  const calculate = useCallback((pVal?: string, rVal?: string, tVal?: string) => {
    const P = parseFloat(pVal !== undefined ? pVal : principal);
    const annualRate = parseFloat(rVal !== undefined ? rVal : rate);
    const T = parseFloat(tVal !== undefined ? tVal : tenure);
    if (!P || !annualRate || !T) return;

    const r = annualRate / 12 / 100;
    const n = tenureType === 'years' ? T * 12 : T;
    
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = emi * n;
    const interest = total - P;

    const data: any[] = [];
    let balance = P;
    const totalYears = Math.min(Math.ceil(n / 12), 40);

    for (let y = 1; y <= totalYears; y++) {
      let yearPrincipal = 0;
      let yearInterest = 0;
      for (let m = 0; m < 12 && balance > 0; m++) {
        const intPart = balance * r;
        const prinPart = Math.min(emi - intPart, balance);
        yearInterest += intPart;
        yearPrincipal += prinPart;
        balance -= prinPart;
      }
      data.push({ 
        year: `Year ${y}`, 
        principal: Math.round(yearPrincipal), 
        interest: Math.round(yearInterest) 
      });
    }

    setResult({ emi: emi.toFixed(2), total: total.toFixed(2), interest: interest.toFixed(2), data });
  }, [principal, rate, tenure, tenureType]);

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
      const p = data.loanAmount || data.principal || '';
      const r = data.interestRate || data.rate || '';
      const t = data.tenure || '';
      if (p) setPrincipal(String(p));
      if (r) setRate(String(r));
      if (t) setTenure(String(t));

      const finalPrincipal = p || principal || '500000';
      const finalRate = r || rate || '8.5';
      const finalTenure = t || tenure || '15';

      if (finalPrincipal && finalRate && finalTenure) {
        calculate(String(finalPrincipal), String(finalRate), String(finalTenure));
      }
    }
  }, [location.state]);

  const fmt = (n: string | number) => {
    const val = typeof n === 'string' ? parseFloat(n) : n;
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <ToolWrapper toolName="EMI Calculator">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.inputGroup}>
            <div style={styles.field}>
              <label style={styles.label}>Principal Amount</label>
              <input 
                type="number" value={principal} onChange={e => setPrincipal(e.target.value)} 
                placeholder="500,000" style={styles.input} 
              />
            </div>
            
            <div style={styles.field}>
              <label style={styles.label}>Interest Rate (% p.a.)</label>
              <input 
                type="number" value={rate} onChange={e => setRate(e.target.value)} 
                placeholder="8.5" style={styles.input} 
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Loan Tenure</label>
              <div style={styles.row}>
                <input 
                  type="number" value={tenure} onChange={e => setTenure(e.target.value)} 
                  placeholder="20" style={{ ...styles.input, flex: 1 }} 
                />
                <select 
                  value={tenureType} onChange={e => setTenureType(e.target.value as any)} 
                  style={styles.select}
                >
                  <option value="years">Years</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
          </div>

          <motion.button 
            onClick={() => calculate()} 
            style={styles.calcBtn}
            whileTap={{ scale: 0.97 }}
          >
            Calculate Repayments
          </motion.button>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.resultBox}>
                <div style={styles.emiHighlight}>
                  <div style={styles.highlightLabel}>Monthly Installment</div>
                  <div style={styles.highlightValue}>
                    <span style={styles.currency}>$</span>{fmt(result.emi)}
                  </div>
                </div>

                <div style={styles.grid}>
                  <div style={styles.stat}>
                    <div style={styles.statLabel}>Total Interest</div>
                    <div style={{ ...styles.statValue, color: '#F59E0B' }}>{fmt(result.interest)}</div>
                  </div>
                  <div style={styles.stat}>
                    <div style={styles.statLabel}>Total Principal</div>
                    <div style={{ ...styles.statValue, color: '#38B6FF' }}>{fmt(principal)}</div>
                  </div>
                  <div style={styles.stat}>
                    <div style={styles.statLabel}>Total Payable</div>
                    <div style={{ ...styles.statValue, color: '#22C55E' }}>{fmt(result.total)}</div>
                  </div>
                </div>

                <div style={styles.chartBox}>
                  <div style={styles.chartTitle}>Amortization Projection</div>
                  <div style={{ height: '240px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={result.data}>
                        <XAxis dataKey="year" stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="var(--color-text-muted)" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`} />
                        <Tooltip 
                          contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
                        <Bar dataKey="principal" fill="#38B6FF" radius={[4, 4, 0, 0]} stackId="a" />
                        <Bar dataKey="interest" fill="#F59E0B" radius={[4, 4, 0, 0]} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '520px', margin: '0 auto', padding: '20px' },
  card: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  input: {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px',
    color: '#fff', fontSize: '18px', padding: '14px', outline: 'none'
  },
  row: { display: 'flex', gap: '10px' },
  select: {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px',
    color: '#fff', padding: '10px', fontSize: '14px', cursor: 'pointer'
  },
  calcBtn: {
    background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)', border: 'none', borderRadius: '14px',
    color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer', fontSize: '16px'
  },
  resultBox: { display: 'flex', flexDirection: 'column', gap: '24px' },
  emiHighlight: {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-accent)', borderRadius: '20px',
    padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  highlightLabel: { fontSize: '14px', color: 'var(--color-text-muted)' },
  highlightValue: { fontSize: '32px', fontWeight: '900', color: 'var(--color-accent)' },
  currency: { fontSize: '18px', verticalAlign: 'top', marginRight: '4px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
  stat: { background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '14px', border: '1px solid var(--color-border)', textAlign: 'center' },
  statLabel: { fontSize: '9px', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '4px' },
  statValue: { fontSize: '14px', fontWeight: 'bold' },
  chartBox: { marginTop: '10px' },
  chartTitle: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '16px', textAlign: 'center' }
};
