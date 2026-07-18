import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ToolWrapper from '../../components/ToolWrapper';
import { motion, AnimatePresence } from 'framer-motion';

type Lap = {
  id: number;
  time: number;
};

export default function Stopwatch(props?: any) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastElapsedRef = useRef<number>(0);
  const location = useLocation();

  useEffect(() => {
    let data = null;
        if (props && (props.params || props.aiPayload)) {
          data = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          data = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          data = props;
        }
    if (data && data.action === 'start') {
      lastElapsedRef.current = elapsed;
      setRunning(true);
    }
  }, [location.state]);

  const format = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const animate = useCallback((time: number) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = time;
    }
    const deltaTime = time - startTimeRef.current;
    setElapsed(lastElapsedRef.current + deltaTime);
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (running) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
      startTimeRef.current = null;
    }
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [running, animate]);

  const start = () => {
    lastElapsedRef.current = elapsed;
    setRunning(true);
  };

  const pause = () => {
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    lastElapsedRef.current = 0;
  };

  const lap = () => {
    setLaps((prev) => [{ id: prev.length + 1, time: elapsed }, ...prev]);
  };

  const bestLap = laps.length > 1 ? Math.min(...laps.map((l) => l.time)) : null;
  const worstLap = laps.length > 1 ? Math.max(...laps.map((l) => l.time)) : null;

  return (
    <ToolWrapper toolName="Stopwatch">
      <div style={styles.container}>
        <div style={styles.displayCard}>
          <div style={styles.timeDisplay}>{format(elapsed)}</div>
          <div style={styles.lapCount}>{laps.length > 0 ? `Lap ${laps.length + 1}` : 'Ready'}</div>
        </div>

        <div style={styles.controls}>
          <motion.button
            onClick={lap}
            disabled={!running}
            style={{ ...styles.btn, ...styles.btnSecondary, opacity: running ? 1 : 0.4 }}
            whileHover={running ? { scale: 1.05 } : {}}
            whileTap={running ? { scale: 0.95 } : {}}
          >
            Lap
          </motion.button>

          {running ? (
            <motion.button onClick={pause} style={{ ...styles.btn, ...styles.btnPrimary }} whileTap={{ scale: 0.95 }}>
              Pause
            </motion.button>
          ) : (
            <motion.button onClick={start} style={{ ...styles.btn, ...styles.btnPrimary }} whileTap={{ scale: 0.95 }}>
              {elapsed === 0 ? 'Start' : 'Resume'}
            </motion.button>
          )}

          <motion.button
            onClick={reset}
            style={{ ...styles.btn, ...styles.btnSecondary }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Reset
          </motion.button>
        </div>

        {laps.length > 0 && (
          <div style={styles.lapsContainer}>
            <h3 style={styles.lapsTitle}>Lap Times</h3>
            <div style={styles.lapsList}>
              <AnimatePresence>
                {laps.map((lap) => {
                  const isBest = laps.length > 1 && lap.time === bestLap;
                  const isWorst = laps.length > 1 && lap.time === worstLap;
                  return (
                    <motion.div
                      key={lap.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      style={{
                        ...styles.lapRow,
                        borderColor: isBest ? '#22C55E' : isWorst ? '#EF4444' : 'rgba(255,255,255,0.06)',
                      }}
                    >
                      <span style={styles.lapNum}>Lap {lap.id}</span>
                      <span style={{
                        ...styles.lapTime,
                        color: isBest ? '#22C55E' : isWorst ? '#EF4444' : '#EAEAF0',
                      }}>
                        {format(lap.time)}
                      </span>
                      {isBest && <span style={getLapBadgeStyle('#22C55E')}>Best</span>}
                      {isWorst && <span style={getLapBadgeStyle('#EF4444')}>Slow</span>}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </ToolWrapper>
  );
}

const getLapBadgeStyle = (color: string): React.CSSProperties => ({
  fontSize: '10px',
  fontWeight: '700',
  color,
  background: `${color}18`,
  border: `1px solid ${color}40`,
  borderRadius: '6px',
  padding: '2px 8px',
  letterSpacing: '0.5px',
});

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' },
  displayCard: {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '20px',
    padding: '40px 48px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    minWidth: 'clamp(320px, 100%, 400px)',
    boxShadow: '0 0 40px rgba(108,99,255,0.06)',
  },
  timeDisplay: {
    fontFamily: "var(--font-stack)",
    fontSize: 'clamp(40px, 10vw, 72px)',
    fontWeight: '900',
    color: '#00d4ff',
    textShadow: '0 0 30px rgba(0,212,255,0.5)',
    letterSpacing: '2px',
  },
  lapCount: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  controls: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' },
  btn: {
    fontSize: '14px',
    fontWeight: '700',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 28px',
    cursor: 'pointer',
    letterSpacing: '1px',
    minHeight: '48px',
    minWidth: '100px',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(108,99,255,0.3)',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.10)',
  },
  lapsContainer: { width: '100%', maxWidth: '480px' },
  lapsTitle: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    marginBottom: '12px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  lapsList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  lapRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid',
    borderRadius: '10px',
    padding: '10px 16px',
  },
  lapNum: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', flex: 1 },
  lapTime: { fontSize: '15px', fontWeight: '700' },
};
