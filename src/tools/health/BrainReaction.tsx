import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type Phase = 'idle' | 'waiting' | 'ready' | 'result' | 'done';

const TOTAL_ROUNDS = 5;

export default function BrainReaction() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [results, setResults] = useState<number[]>([]);
  const [currentResult, setCurrentResult] = useState<number | null>(null);
  const [tooEarly, setTooEarly] = useState(false);
  const [litCount, setLitCount] = useState(0);

  const sequenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const triggerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);

  const cleanupTimers = useCallback(() => {
    if (sequenceIntervalRef.current) {
      clearInterval(sequenceIntervalRef.current);
      sequenceIntervalRef.current = null;
    }
    if (triggerTimeoutRef.current) {
      clearTimeout(triggerTimeoutRef.current);
      triggerTimeoutRef.current = null;
    }
  }, []);

  const startRound = useCallback(() => {
    cleanupTimers();
    setPhase('waiting');
    setTooEarly(false);
    setLitCount(0);

    // Sequence lights: 1, 2, 3, 4, 5 every 600ms
    let currentLit = 0;
    sequenceIntervalRef.current = setInterval(() => {
      currentLit += 1;
      setLitCount(currentLit);
      if (currentLit === 5) {
        if (sequenceIntervalRef.current) {
          clearInterval(sequenceIntervalRef.current);
          sequenceIntervalRef.current = null;
        }

        // Wait a random time before lights go out
        const randomDelay = 1000 + Math.random() * 2500;
        triggerTimeoutRef.current = setTimeout(() => {
          setLitCount(0);
          setPhase('ready');
          startTime.current = performance.now();
        }, randomDelay);
      }
    }, 600);
  }, [cleanupTimers]);

  useEffect(() => {
    return () => cleanupTimers();
  }, [cleanupTimers]);

  const handleClick = () => {
    if (phase === 'waiting') {
      cleanupTimers();
      setTooEarly(true);
      setPhase('result');
    } else if (phase === 'ready') {
      const reactionTime = Math.round(performance.now() - startTime.current);
      setResults(prev => [...prev, reactionTime]);
      setCurrentResult(reactionTime);
      setPhase('result');
    }
  };

  const next = () => {
    if (results.length >= TOTAL_ROUNDS) {
      setPhase('done');
    } else {
      startRound();
    }
  };

  const average = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;

  return (
    <ToolWrapper toolName="Brain Reaction">
      <div style={styles.container}>
        <div style={styles.progress}>
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.dot,
                background: i < results.length ? 'var(--color-accent)' : 'var(--color-bg-elevated, #2D3748)',
              }}
            />
          ))}
        </div>

        <div style={styles.gameArea}>
          <AnimatePresence mode="wait">
            {phase === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={styles.hero}
              >
                <div style={styles.heroIcon}>⚡</div>
                <div style={styles.heroTitle}>F1 Start Reaction Test</div>
                <div style={styles.heroText}>
                  The five lights will light up red one by one. Once they ALL go out at once, tap/click as fast as you can!
                </div>
                <button onClick={startRound} style={styles.btn}>
                  START TEST
                </button>
              </motion.div>
            )}

            {(phase === 'waiting' || phase === 'ready') && (
              <motion.div
                key="play-area"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleClick}
                style={{
                  ...styles.hitArea,
                  background: phase === 'ready' ? 'var(--color-accent-dim, rgba(16, 185, 129, 0.15))' : 'transparent',
                  border: phase === 'ready' ? '3px solid #10B981' : '3px dashed var(--color-border)',
                }}
              >
                <div style={styles.gantryContainer}>
                  <div style={styles.gantryBeam} />
                  <div style={styles.gantryPillarsContainer}>
                    <div style={styles.gantryPillar} />
                    <div style={{ flex: 1 }} />
                    <div style={styles.gantryPillar} />
                  </div>
                  <div style={styles.gantryBox}>
                    {Array.from({ length: 5 }).map((_, i) => {
                      const isLit = phase === 'waiting' && i < litCount;
                      return (
                        <div key={i} style={styles.lightPod}>
                          {/* Top Light */}
                          <div
                            style={{
                              ...styles.lampCircle,
                              background: isLit ? '#EF4444' : '#1A202C',
                              boxShadow: isLit ? '0 0 20px 4px #EF4444' : 'none',
                            }}
                          />
                          {/* Bottom Light */}
                          <div
                            style={{
                              ...styles.lampCircle,
                              background: isLit ? '#EF4444' : '#1A202C',
                              boxShadow: isLit ? '0 0 20px 4px #EF4444' : 'none',
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={styles.hitText}>
                  {phase === 'waiting' ? 'WAIT FOR LIGHTS OUT...' : 'GO GO GO!'}
                </div>
              </motion.div>
            )}

            {phase === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={styles.resWrap}
              >
                {tooEarly ? (
                  <div style={styles.early}>
                    <div style={styles.earlyIcon}>⚠️</div>
                    <div style={styles.earlyTitle}>Jump Start!</div>
                    <div style={styles.earlyText}>You reacted before the lights went out.</div>
                    <button onClick={startRound} style={styles.btn}>
                      TRY AGAIN
                    </button>
                  </div>
                ) : (
                  <div style={styles.success}>
                    <div style={styles.ms}>{currentResult}ms</div>
                    <div style={styles.msLabel}>Reaction Time</div>
                    <button onClick={next} style={styles.btn}>
                      {results.length >= TOTAL_ROUNDS ? 'VIEW RESULT' : 'NEXT ROUND'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {phase === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={styles.doneCard}
              >
                <div style={styles.doneLabel}>Average Reaction Time</div>
                <div style={styles.doneAvg}>{average}ms</div>

                <div style={styles.rankBox}>
                  <div style={styles.rankVal}>
                    {average < 180
                      ? 'F1 Driver'
                      : average < 230
                      ? 'Superhuman'
                      : average < 280
                      ? 'Pro Reflexes'
                      : average < 350
                      ? 'Average'
                      : 'Casual'}
                  </div>
                  <div style={styles.rankLab}>Reflex Tier</div>
                </div>

                <div style={styles.history}>
                  {results.map((r, i) => (
                    <div key={i} style={styles.hRow}>
                      <span>Round {i + 1}</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                        {r}ms
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setResults([]);
                    setPhase('idle');
                  }}
                  style={styles.btn}
                >
                  RESTART TEST
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
    padding: '20px',
    maxWidth: '500px',
    margin: '0 auto',
    color: 'var(--color-text-main)',
  },
  progress: { display: 'flex', gap: '8px', justifyContent: 'center' },
  dot: { width: '40px', height: '6px', borderRadius: '3px', transition: 'all 0.3s' },
  gameArea: { minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  hero: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' },
  heroIcon: { fontSize: '64px' },
  heroTitle: { fontSize: '28px', fontWeight: '900', color: 'var(--color-text-main)' },
  heroText: { fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: '1.6' },
  btn: {
    background: 'var(--color-accent)',
    border: 'none',
    borderRadius: '16px',
    color: 'var(--color-bg-main, #000)',
    fontWeight: 'bold',
    padding: '16px 48px',
    fontSize: '15px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px var(--color-accent-dim, rgba(0,0,0,0.1))',
  },
  hitArea: {
    width: '100%',
    minHeight: '380px',
    borderRadius: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    position: 'relative',
    padding: '20px',
    transition: 'all 0.2s ease',
  },
  hitText: {
    fontSize: '22px',
    fontWeight: '900',
    color: 'var(--color-text-main)',
    letterSpacing: '1px',
    marginTop: '30px',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  gantryContainer: {
    width: '100%',
    maxWidth: '380px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  gantryBeam: {
    width: '100%',
    height: '10px',
    background: '#334155',
    borderRadius: '4px',
    zIndex: 2,
  },
  gantryPillarsContainer: {
    position: 'absolute',
    top: '10px',
    left: '20px',
    right: '20px',
    height: '90px',
    display: 'flex',
    zIndex: 0,
  },
  gantryPillar: {
    width: '6px',
    height: '100%',
    background: '#475569',
  },
  gantryBox: {
    display: 'flex',
    background: '#1E293B',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '3px solid #334155',
    gap: '12px',
    marginTop: '0px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
    zIndex: 2,
  },
  lightPod: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    background: '#0F172A',
    padding: '6px',
    borderRadius: '6px',
  },
  lampCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    transition: 'all 0.05s ease',
  },
  resWrap: { textAlign: 'center', color: 'var(--color-text-main)' },
  early: { display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' },
  earlyIcon: { fontSize: '48px' },
  earlyTitle: { fontSize: '24px', fontWeight: 'bold', color: '#EF4444' },
  earlyText: { color: 'var(--color-text-muted)', marginBottom: '16px' },
  success: { display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' },
  ms: { fontSize: '72px', fontWeight: '900', color: 'var(--color-accent)', lineHeight: '1' },
  msLabel: { fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '24px' },
  doneCard: {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '32px',
    padding: '40px 24px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    textAlign: 'center',
  },
  doneLabel: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  doneAvg: { fontSize: '64px', fontWeight: '900', color: 'var(--color-text-main)', lineHeight: '1' },
  rankBox: {
    background: 'var(--color-bg-elevated, rgba(99, 102, 241, 0.05))',
    border: '1px solid var(--color-accent)',
    borderRadius: '16px',
    padding: '12px 24px',
  },
  rankVal: { fontSize: '18px', fontWeight: '900', color: 'var(--color-accent)', textTransform: 'uppercase' },
  rankLab: { fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' },
  history: { width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' },
  hRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)' },
};
