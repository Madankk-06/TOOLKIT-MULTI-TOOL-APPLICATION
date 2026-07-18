import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

const PARAGRAPHS = [
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.",
  "Architecture is the learned game, correct and magnificent, of forms assembled in the light.",
  "The greatest glory in living lies not in never falling, but in rising every time we fall.",
  "Your time is limited, so don't waste it living someone else's life. Innovation distinguishes a leader.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts."
];

type GameState = 'idle' | 'playing' | 'result';

export default function TypeTester() {
  const [para, setPara] = useState('');
  const [input, setInput] = useState('');
  const [state, setState] = useState<GameState>('idle');
  const [timeLeft, setTimeLeft] = useState(60);
  const [wpm, setWpm] = useState(0);
  const [acc, setAcc] = useState(100);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);

  const start = () => {
    setPara(PARAGRAPHS[Math.floor(Math.random() * PARAGRAPHS.length)]);
    setInput('');
    setState('playing');
    setTimeLeft(60);
    setWpm(0);
    setAcc(100);
    startTime.current = Date.now();
    
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          finish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const finish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('result');
  }, []);

  useEffect(() => {
    if (state === 'playing') {
      const words = input.trim().split(/\s+/).length;
      const elapsed = (Date.now() - startTime.current) / 60000;
      if (elapsed > 0) setWpm(Math.round(words / elapsed));

      let errors = 0;
      const minLen = Math.min(input.length, para.length);
      for (let i = 0; i < minLen; i++) {
        if (input[i] !== para[i]) errors++;
      }
      if (input.length > 0) setAcc(Math.max(0, Math.round(((input.length - errors) / input.length) * 100)));

      if (input === para) finish();
    }
  }, [input, para, state, finish]);

  return (
    <ToolWrapper toolName="Type Tester">
      <div style={styles.container}>
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.hero}>
              <div style={styles.heroIcon}>⌨️</div>
              <div style={styles.heroTitle}>Typing Speed Test</div>
              <div style={styles.heroText}>Test your typing skills in 60 seconds.</div>
              <button onClick={start} style={styles.startBtn}>START CHALLENGE</button>
            </motion.div>
          )}

          {state === 'playing' && (
            <motion.div key="playing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.gameArea}>
              <div style={styles.statsHeader}>
                <div style={styles.statChip}>
                  <span style={styles.statLabel}>WPM</span>
                  <span style={styles.statValue}>{wpm}</span>
                </div>
                <div style={styles.statChip}>
                  <span style={styles.statLabel}>ACC</span>
                  <span style={styles.statValue}>{acc}%</span>
                </div>
                <div style={styles.statChip}>
                  <span style={styles.statLabel}>SEC</span>
                  <span style={{ ...styles.statValue, color: timeLeft < 10 ? '#EF4444' : 'var(--color-accent)' }}>{timeLeft}</span>
                </div>
              </div>

              <div style={styles.textDisplay}>
                {para.split('').map((char, i) => {
                  let color = 'rgba(255,255,255,0.2)';
                  let bg = 'transparent';
                  if (i < input.length) {
                    color = input[i] === char ? '#fff' : '#EF4444';
                    if (input[i] !== char) bg = 'rgba(239, 68, 68, 0.1)';
                  }
                  return <span key={i} style={{ color, background: bg, borderBottom: i === input.length ? '2px solid var(--color-accent)' : 'none' }}>{char}</span>;
                })}
              </div>

              <textarea 
                autoFocus 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                style={styles.hiddenInput}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </motion.div>
          )}

          {state === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.resCard}>
              <div style={styles.resLabel}>Your Result</div>
              <div style={styles.resWpm}>{wpm}</div>
              <div style={styles.resUnit}>Words Per Minute</div>
              
              <div style={styles.resGrid}>
                <div style={styles.resStat}>
                  <div style={styles.resVal}>{acc}%</div>
                  <div style={styles.resLab}>Accuracy</div>
                </div>
                <div style={styles.resStat}>
                  <div style={styles.resVal}>{input.length}</div>
                  <div style={styles.resLab}>Chars</div>
                </div>
              </div>

              <button onClick={start} style={styles.startBtn}>TRY AGAIN</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '32px', padding: '20px', maxWidth: '700px', margin: '0 auto' },
  hero: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', padding: '60px 0' },
  heroIcon: { fontSize: '64px' },
  heroTitle: { fontSize: '28px', fontWeight: '900', color: '#fff' },
  heroText: { fontSize: '14px', color: 'var(--color-text-muted)' },
  startBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '16px', color: '#fff', fontWeight: 'bold', padding: '16px 48px', fontSize: '16px', cursor: 'pointer', letterSpacing: '1px' },
  gameArea: { display: 'flex', flexDirection: 'column', gap: '32px' },
  statsHeader: { display: 'flex', justifyContent: 'center', gap: '24px' },
  statChip: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '12px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  statLabel: { fontSize: '10px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  statValue: { fontSize: '24px', fontWeight: '900', color: '#fff' },
  textDisplay: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '32px', fontSize: '22px', lineHeight: '1.6', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', minHeight: '160px' },
  hiddenInput: { opacity: 0, position: 'absolute', pointerEvents: 'none' },
  resCard: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '32px', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center' },
  resLabel: { fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '2px' },
  resWpm: { fontSize: '96px', fontWeight: '900', color: 'var(--color-accent)', lineHeight: 1 },
  resUnit: { fontSize: '16px', color: '#fff', fontWeight: 'bold' },
  resGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', width: '100%', maxWidth: '300px', margin: '20px 0' },
  resStat: { display: 'flex', flexDirection: 'column', gap: '4px' },
  resVal: { fontSize: '24px', fontWeight: 'bold', color: '#fff' },
  resLab: { fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }
};
