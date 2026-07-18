import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type SleepMode = 'wake' | 'bed';
type ActiveTab = 'calculator' | 'journal';

interface SleepLog {
  id: string;
  bedTime: string; // ISO string
  wakeTime: string; // ISO string
  quality: number; // 1-5
  notes: string;
}

export default function SleepAssistant(props?: any) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculator');
  const [mode, setMode] = useState<SleepMode>('wake');
  const [time, setTime] = useState('07:00');

  // Journal form states
  const [bedDateTime, setBedDateTime] = useState('');
  const [wakeDateTime, setWakeDateTime] = useState('');
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [logs, setLogs] = useState<SleepLog[]>([]);

  // Load logs on mount
  useEffect(() => {
    const saved = localStorage.getItem('toolkit_sleep_logs');
    if (saved) {
      try {
        setLogs(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Prefill from chatbot navigation state
  useEffect(() => {
    const data = props?.params || props?.aiPayload || location.state?.aiPayload || location.state?.params;
    if (data) {
      if (data.mode === 'bed' || data.mode === 'sleep') setMode('bed');
      if (data.mode === 'wake' || data.mode === 'wakeup') setMode('wake');
      if (data.time) setTime(String(data.time));
      if (data.wakeTime) setWakeDateTime(String(data.wakeTime));
      if (data.bedTime) setBedDateTime(String(data.bedTime));
      if (data.quality !== undefined) setQuality(Math.min(5, Math.max(1, Number(data.quality))));
    }
  }, [location.state]);

  const saveLogs = (newLogs: SleepLog[]) => {
    setLogs(newLogs);
    localStorage.setItem('toolkit_sleep_logs', JSON.stringify(newLogs));
  };

  const addLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedDateTime || !wakeDateTime) return;

    const newLog: SleepLog = {
      id: Math.random().toString(36).substring(2, 9),
      bedTime: bedDateTime,
      wakeTime: wakeDateTime,
      quality,
      notes
    };

    saveLogs([newLog, ...logs]);
    // Reset form
    setBedDateTime('');
    setWakeDateTime('');
    setQuality(3);
    setNotes('');
  };

  const deleteLog = (id: string) => {
    const filtered = logs.filter(l => l.id !== id);
    saveLogs(filtered);
  };

  const suggestions = useMemo(() => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);

    const FALL_ASLEEP_MINS = 14;
    const CYCLE_MINS = 90;

    if (mode === 'wake') {
      return [6, 5, 4, 3].map(cycles => {
        const d = new Date(date.getTime() - (cycles * CYCLE_MINS * 60000) - (FALL_ASLEEP_MINS * 60000));
        return {
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hours: (cycles * 1.5).toFixed(1),
          cycles,
          label: cycles >= 5 ? 'Optimal' : 'Light'
        };
      });
    } else {
      return [3, 4, 5, 6].map(cycles => {
        const d = new Date(date.getTime() + (cycles * CYCLE_MINS * 60000) + (FALL_ASLEEP_MINS * 60000));
        return {
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hours: (cycles * 1.5).toFixed(1),
          cycles,
          label: cycles >= 5 ? 'Optimal' : 'Light'
        };
      });
    }
  }, [time, mode]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (logs.length === 0) return { avgHours: 0, avgQuality: 0 };
    let totalMs = 0;
    let totalQuality = 0;
    logs.forEach(log => {
      const diff = new Date(log.wakeTime).getTime() - new Date(log.bedTime).getTime();
      totalMs += diff > 0 ? diff : 0;
      totalQuality += log.quality;
    });
    const avgHours = (totalMs / (1000 * 60 * 60 * logs.length)).toFixed(1);
    const avgQuality = (totalQuality / logs.length).toFixed(1);
    return { avgHours, avgQuality };
  }, [logs]);

  const qualityEmojis = ['😫', '🥱', '🙂', '😴', '🤩'];

  return (
    <ToolWrapper toolName="Sleep Assistant">
      <div style={styles.container}>
        {/* Navigation Tabs */}
        <div style={styles.tabContainer}>
          <button 
            onClick={() => setActiveTab('calculator')} 
            style={{ ...styles.tabBtn, ...(activeTab === 'calculator' ? styles.tabBtnActive : {}) }}
          >
            ⏰ Calculator
          </button>
          <button 
            onClick={() => setActiveTab('journal')} 
            style={{ ...styles.tabBtn, ...(activeTab === 'journal' ? styles.tabBtnActive : {}) }}
          >
            📝 Sleep Journal
          </button>
        </div>

        {activeTab === 'calculator' ? (
          <>
            <div style={styles.modeToggle}>
              <button 
                onClick={() => setMode('wake')}
                style={{ ...styles.mBtn, ...(mode === 'wake' ? styles.mActive : {}) }}
              >WAKE UP AT</button>
              <button 
                onClick={() => setMode('bed')}
                style={{ ...styles.mBtn, ...(mode === 'bed' ? styles.mActive : {}) }}
              >GO TO BED AT</button>
            </div>

            <div style={styles.inputArea}>
              <input 
                type="time" 
                value={time} 
                onChange={e => setTime(e.target.value)} 
                style={styles.timeInput}
              />
              <div style={styles.hint}>
                {mode === 'wake' ? 'When should I go to sleep?' : 'When should I wake up?'}
              </div>
            </div>

            <div style={styles.results}>
              {suggestions.map((s, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ ...styles.card, ...(s.label === 'Optimal' ? styles.cardOpt : {}) }}
                >
                  <div style={styles.cMain}>
                    <div style={styles.cTime}>{s.time}</div>
                    <div style={styles.cMeta}>{s.hours} hours sleep · {s.cycles} cycles</div>
                  </div>
                  <div style={{ ...styles.badge, color: s.label === 'Optimal' ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                    {s.label.toUpperCase()}
                  </div>
                </motion.div>
              ))}
            </div>

            <div style={styles.info}>
              <div style={styles.infoTitle}>Scientific Method</div>
              <div style={styles.infoText}>
                Waking up in the middle of a sleep cycle leaves you feeling tired and groggy. 
                Waking up between cycles makes you feel refreshed and alert. This assistant 
                calculates the best times based on 90-minute sleep cycles.
              </div>
            </div>
          </>
        ) : (
          <div style={styles.journalSection}>
            {/* Stats Dashboard */}
            <div style={styles.statsDashboard}>
              <div style={styles.statCard}>
                <div style={styles.statVal}>{stats.avgHours}h</div>
                <div style={styles.statLabel}>Avg Duration</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statVal}>{stats.avgQuality}/5</div>
                <div style={styles.statLabel}>Avg Quality</div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={addLog} style={styles.logForm}>
              <div style={styles.formTitle}>Log Last Sleep</div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Bed Time</label>
                  <input 
                    type="datetime-local" 
                    value={bedDateTime} 
                    onChange={e => setBedDateTime(e.target.value)} 
                    required
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Wake Time</label>
                  <input 
                    type="datetime-local" 
                    value={wakeDateTime} 
                    onChange={e => setWakeDateTime(e.target.value)} 
                    required
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>How did you sleep?</label>
                <div style={styles.emojiRow}>
                  {qualityEmojis.map((emoji, index) => (
                    <button
                      type="button"
                      key={index}
                      onClick={() => setQuality(index + 1)}
                      style={{
                        ...styles.emojiBtn,
                        ...(quality === index + 1 ? styles.emojiBtnActive : {})
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Notes</label>
                <input 
                  type="text" 
                  value={notes} 
                  placeholder="E.g. felt deep sleep"
                  onChange={e => setNotes(e.target.value)} 
                  style={styles.formInput}
                />
              </div>

              <button type="submit" style={styles.submitBtn}>
                Log Entry
              </button>
            </form>

            {/* History logs */}
            <div style={styles.logsList}>
              <div style={styles.listHeader}>Sleep History ({logs.length})</div>
              {logs.length === 0 ? (
                <div style={styles.emptyState}>No sleep logs recorded yet.</div>
              ) : (
                logs.map(log => {
                  const hrs = ((new Date(log.wakeTime).getTime() - new Date(log.bedTime).getTime()) / (1000 * 60 * 60)).toFixed(1);
                  const bedStr = new Date(log.bedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const wakeStr = new Date(log.wakeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateStr = new Date(log.wakeTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
                  return (
                    <div key={log.id} style={styles.logCard}>
                      <div style={styles.logCardLeft}>
                        <div style={styles.logDate}>{dateStr}</div>
                        <div style={styles.logDuration}>{hrs} hrs ({bedStr} - {wakeStr})</div>
                        {log.notes && <div style={styles.logNotes}>{log.notes}</div>}
                      </div>
                      <div style={styles.logCardRight}>
                        <span style={styles.logEmoji}>{qualityEmojis[log.quality - 1]}</span>
                        <button onClick={() => deleteLog(log.id)} style={styles.deleteBtn} aria-label="Delete log">
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px', maxWidth: '500px', margin: '0 auto', color: 'var(--color-text-main)' },
  tabContainer: { display: 'flex', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '4px' },
  tabBtn: { flex: 1, background: 'none', border: 'none', borderRadius: '12px', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 'bold', padding: '12px', cursor: 'pointer', transition: 'all 0.2s' },
  tabBtnActive: { background: 'var(--color-accent)', color: 'var(--color-bg-main, #000)' },
  
  modeToggle: { display: 'flex', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '6px' },
  mBtn: { flex: 1, background: 'none', border: 'none', borderRadius: '10px', color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: 'bold', padding: '12px', cursor: 'pointer' },
  mActive: { background: 'var(--color-accent)', color: 'var(--color-bg-main, #000)' },
  
  inputArea: { textAlign: 'center', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '32px', padding: '30px 40px' },
  timeInput: { background: 'none', border: 'none', color: 'var(--color-text-main)', fontSize: '64px', fontWeight: '900', outline: 'none', textAlign: 'center', width: '100%', fontFamily: 'monospace' },
  hint: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '1px' },
  
  results: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardOpt: { borderColor: 'var(--color-accent)', background: 'var(--color-bg-elevated, rgba(99, 102, 241, 0.05))' },
  cMain: { display: 'flex', flexDirection: 'column', gap: '4px' },
  cTime: { fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-main)' },
  cMeta: { fontSize: '12px', color: 'var(--color-text-muted)' },
  badge: { fontSize: '10px', fontWeight: '900', letterSpacing: '1px' },
  
  info: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '20px' },
  infoTitle: { fontSize: '13px', fontWeight: 'bold', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '8px' },
  infoText: { fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.6' },

  // Journal Section
  journalSection: { display: 'flex', flexDirection: 'column', gap: '24px' },
  statsDashboard: { display: 'flex', gap: '16px' },
  statCard: { flex: 1, background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '16px', textAlign: 'center' },
  statVal: { fontSize: '28px', fontWeight: '900', color: 'var(--color-accent)' },
  statLabel: { fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' },
  
  logForm: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  formTitle: { fontSize: '16px', fontWeight: 'bold' },
  formRow: { display: 'flex', gap: '12px' },
  formGroup: { flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)' },
  formInput: { background: 'var(--color-bg-elevated, #2D3748)', border: '1px solid var(--color-border)', borderRadius: '12px', color: 'var(--color-text-main)', padding: '12px', fontSize: '14px', outline: 'none' },
  emojiRow: { display: 'flex', gap: '8px', justifyContent: 'space-between' },
  emojiBtn: { flex: 1, background: 'var(--color-bg-elevated, #2D3748)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '8px 0', cursor: 'pointer', display: 'flex', justifyContent: 'center', transition: 'all 0.2s' },
  emojiBtnActive: { background: 'var(--color-accent-dim, rgba(99, 102, 241, 0.2))', borderColor: 'var(--color-accent)' },
  submitBtn: { background: 'var(--color-accent)', color: 'var(--color-bg-main, #000)', border: 'none', borderRadius: '16px', padding: '14px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', marginTop: '8px' },
  
  logsList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  listHeader: { fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  emptyState: { padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', borderRadius: '20px', fontSize: '13px' },
  logCard: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logCardLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
  logDate: { fontSize: '14px', fontWeight: 'bold' },
  logDuration: { fontSize: '12px', color: 'var(--color-text-muted)' },
  logNotes: { fontSize: '12px', color: 'var(--color-accent)', fontStyle: 'italic', marginTop: '2px' },
  logCardRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  logEmoji: { fontSize: '24px' },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '6px', fontSize: '16px', borderRadius: '8px', transition: 'background 0.2s' }
};
