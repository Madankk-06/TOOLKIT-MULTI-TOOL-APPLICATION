import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type Cycle = {
  id: string;
  startDate: string;
  duration: number;
};

export default function PeriodsTracker() {
  const [cycles, setCycles] = useState<Cycle[]>(() => {
    const saved = localStorage.getItem('toolkit_cycles');
    return saved ? JSON.parse(saved) : [];
  });
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState(5);

  const stats = useMemo(() => {
    if (cycles.length === 0) return { avgCycle: 28, avgPeriod: 5, nextDate: null };
    
    const sorted = [...cycles].sort((a, b) => b.startDate.localeCompare(a.startDate));
    const avgPeriod = Math.round(cycles.reduce((a, b) => a + b.duration, 0) / cycles.length);
    
    let avgCycle = 28;
    if (cycles.length > 1) {
      let totalDays = 0;
      for (let i = 0; i < sorted.length - 1; i++) {
        const d1 = new Date(sorted[i].startDate);
        const d2 = new Date(sorted[i+1].startDate);
        totalDays += (d1.getTime() - d2.getTime()) / (1000 * 3600 * 24);
      }
      avgCycle = Math.round(totalDays / (cycles.length - 1));
    }

    const lastDate = new Date(sorted[0].startDate);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + avgCycle);

    return { avgCycle, avgPeriod, nextDate };
  }, [cycles]);

  const addLog = () => {
    if (!startDate) return;
    const newCycles = [...cycles, { id: Date.now().toString(), startDate, duration }];
    setCycles(newCycles);
    localStorage.setItem('toolkit_cycles', JSON.stringify(newCycles));
    setStartDate('');
  };

  const removeLog = (id: string) => {
    const newCycles = cycles.filter(c => c.id !== id);
    setCycles(newCycles);
    localStorage.setItem('toolkit_cycles', JSON.stringify(newCycles));
  };

  return (
    <ToolWrapper toolName="Period Tracker">
      <div style={styles.container}>
        <div style={styles.statsRow}>
          <div style={styles.statChip}>
            <div style={styles.statVal}>{stats.avgCycle}d</div>
            <div style={styles.statLab}>Avg Cycle</div>
          </div>
          <div style={styles.statChip}>
            <div style={styles.statVal}>{stats.avgPeriod}d</div>
            <div style={styles.statLab}>Avg Length</div>
          </div>
          <div style={styles.statChip}>
            <div style={{ ...styles.statVal, color: 'var(--color-accent)' }}>
              {stats.nextDate ? stats.nextDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
            </div>
            <div style={styles.statLab}>Next Start</div>
          </div>
        </div>

        <div style={styles.logCard}>
          <div style={styles.cardHeader}>Log New Period</div>
          <div style={styles.form}>
            <div style={styles.field}>
              <div style={styles.label}>Start Date</div>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <div style={styles.row}>
                <span style={styles.label}>Duration</span>
                <span style={styles.val}>{duration} days</span>
              </div>
              <input 
                type="range" min="1" max="10" value={duration} 
                onChange={e => setDuration(Number(e.target.value))} 
                style={styles.slider}
              />
            </div>
            <button onClick={addLog} disabled={!startDate} style={styles.logBtn}>SAVE LOG</button>
          </div>
        </div>

        <div style={styles.history}>
          <div style={styles.cardHeader}>Recent History</div>
          <div style={styles.hList}>
            <AnimatePresence>
              {cycles.sort((a, b) => b.startDate.localeCompare(a.startDate)).map(c => (
                <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} style={styles.hItem}>
                  <div style={styles.hInfo}>
                    <div style={styles.hDate}>{new Date(c.startDate).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}</div>
                    <div style={styles.hDur}>{c.duration} days</div>
                  </div>
                  <button onClick={() => removeLog(c.id)} style={styles.delBtn}>Remove</button>
                </motion.div>
              ))}
            </AnimatePresence>
            {cycles.length === 0 && <div style={styles.empty}>No logs yet.</div>}
          </div>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '32px', padding: '20px', maxWidth: '500px', margin: '0 auto' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  statChip: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '20px', textAlign: 'center' },
  statVal: { fontSize: '20px', fontWeight: '900', color: '#fff' },
  statLab: { fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' },
  logCard: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  cardHeader: { fontSize: '14px', fontWeight: 'bold', color: '#fff', letterSpacing: '1px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  input: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', color: '#fff', colorScheme: 'dark' },
  row: { display: 'flex', justifyContent: 'space-between' },
  val: { color: 'var(--color-accent)', fontWeight: 'bold' },
  slider: { width: '100%', accentColor: 'var(--color-accent)' },
  logBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer' },
  history: { display: 'flex', flexDirection: 'column', gap: '16px' },
  hList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  hItem: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  hInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  hDate: { fontSize: '14px', fontWeight: 'bold', color: '#fff' },
  hDur: { fontSize: '12px', color: 'var(--color-text-muted)' },
  delBtn: { background: 'none', border: 'none', color: '#EF4444', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' },
  empty: { textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px' }
};
