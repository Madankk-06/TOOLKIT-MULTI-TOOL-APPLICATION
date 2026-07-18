import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import ToolWrapper from '../../components/ToolWrapper';

type Result = {
  year: number;
  isLeap: boolean;
  reason: string;
};

export default function LeapYear(props?: any) {
  const [year, setYear] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const location = useLocation();

  const checkLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

  useEffect(() => {
    let data = null;
        if (props && (props.params || props.aiPayload)) {
          data = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          data = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          data = props;
        }
    if (data && data.year) {
      const y = parseInt(String(data.year), 10);
      if (y) {
        setYear(String(y));
        const isLeap = checkLeap(y);
        let reason = '';
        if (isLeap) {
          reason = y % 400 === 0 ? 'Divisible by 400' : 'Divisible by 4 and not by 100';
        } else {
          reason = y % 100 === 0 ? 'Divisible by 100 but not by 400' : 'Not divisible by 4';
        }
        setResult({ year: y, isLeap, reason });
      }
    }
  }, [location.state]);

  const handleCheck = () => {
    const y = parseInt(year);
    if (!y) return;

    const isLeap = checkLeap(y);
    let reason = '';
    if (isLeap) {
      reason = y % 400 === 0 ? 'Divisible by 400' : 'Divisible by 4 and not by 100';
    } else {
      reason = y % 100 === 0 ? 'Divisible by 100 but not by 400' : 'Not divisible by 4';
    }

    setResult({ year: y, isLeap, reason });
  };

  const nextLeaps = [];
  let currentYear = new Date().getFullYear();
  while (nextLeaps.length < 3) {
    if (checkLeap(currentYear)) nextLeaps.push(currentYear);
    currentYear++;
  }

  return (
    <ToolWrapper toolName="Leap Year">
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.inputGroup}>
            <input 
              type="number" 
              value={year} 
              onChange={e => setYear(e.target.value)} 
              placeholder="Enter Year (e.g. 2024)"
              style={styles.input}
              onKeyDown={e => e.key === 'Enter' && handleCheck()}
            />
            <button onClick={handleCheck} style={styles.checkBtn}>Check</button>
          </div>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div 
                key={result.year}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ 
                  ...styles.resultDisplay, 
                  borderColor: result.isLeap ? 'var(--color-accent)' : '#EF4444' 
                }}
              >
                <div style={styles.resYear}>{result.year}</div>
                <div style={{ ...styles.resStatus, color: result.isLeap ? 'var(--color-accent)' : '#EF4444' }}>
                  {result.isLeap ? 'LEAP YEAR' : 'COMMON YEAR'}
                </div>
                <div style={styles.resReason}>{result.reason}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={styles.nextBatch}>
            <div style={styles.nextTitle}>Upcoming Leap Years</div>
            <div style={styles.nextGrid}>
              {nextLeaps.map(y => (
                <div key={y} style={styles.nextItem}>{y}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '400px', margin: '0 auto', padding: '20px' },
  card: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' },
  inputGroup: { display: 'flex', gap: '10px' },
  input: { flex: 1, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', color: '#fff', padding: '12px', fontSize: '16px', outline: 'none' },
  checkBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold', padding: '12px 20px', cursor: 'pointer' },
  resultDisplay: { background: 'var(--color-bg-elevated)', border: '2px solid', borderRadius: '20px', padding: '24px', textAlign: 'center' },
  resYear: { fontSize: '42px', fontWeight: '900', color: '#fff', lineHeight: 1 },
  resStatus: { fontSize: '14px', fontWeight: 'bold', margin: '8px 0', letterSpacing: '2px' },
  resReason: { fontSize: '12px', color: 'var(--color-text-muted)' },
  nextBatch: { textAlign: 'center' },
  nextTitle: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '12px' },
  nextGrid: { display: 'flex', justifyContent: 'center', gap: '12px' },
  nextItem: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '8px 16px', color: 'var(--color-accent)', fontWeight: 'bold', fontSize: '14px' }
};
