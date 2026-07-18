import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

const ICONS = ['⚡','🔥','💎','🌙','⭐','🎯','🔮','🎸','🚀','🦋','🌊','🎲'];

function createDeck(pairs) {
  const selected = ICONS.slice(0, pairs);
  const deck = [...selected, ...selected].map((icon, i) => ({ id: i, icon, flipped: false, matched: false }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const DIFFICULTIES = {
  easy: { pairs: 6, label: 'Easy', cols: 3 },
  medium: { pairs: 8, label: 'Medium', cols: 4 },
  hard: { pairs: 12, label: 'Hard', cols: 4 },
};

export default function MemoryCardGame() {
  const [difficulty, setDifficulty] = useState('medium');
  const [cards, setCards] = useState(() => createDeck(DIFFICULTIES.medium.pairs));
  const [flipped, setFlipped] = useState([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [locked, setLocked] = useState(false);
  const [bestTimes, setBestTimes] = useState(() => JSON.parse(localStorage.getItem('memory_best') || '{}'));
  const timerRef = useRef(null);

  const totalPairs = DIFFICULTIES[difficulty].pairs;

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [running]);

  const startGame = (diff = difficulty) => {
    clearInterval(timerRef.current);
    const cfg = DIFFICULTIES[diff];
    setCards(createDeck(cfg.pairs));
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setTimer(0);
    setRunning(false);
    setWon(false);
    setLocked(false);
  };

  const handleCard = (card) => {
    if (locked || card.flipped || card.matched || won) return;
    if (!running) setRunning(true);

    const newFlipped = [...flipped, card];
    const newCards = cards.map(c => c.id === card.id ? { ...c, flipped: true } : c);
    setCards(newCards);
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setLocked(true);
      const [a, b] = newFlipped;
      if (a.icon === b.icon) {
        // Match
        setTimeout(() => {
          setCards(prev => prev.map(c => c.icon === a.icon ? { ...c, matched: true } : c));
          const newMatches = matches + 1;
          setMatches(newMatches);
          setFlipped([]);
          setLocked(false);
          if (navigator.vibrate) navigator.vibrate(30);
          if (newMatches === totalPairs) {
            setRunning(false);
            setWon(true);
            clearInterval(timerRef.current);
            if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);
            // Save best time
            setBestTimes(prev => {
              const updated = { ...prev, [difficulty]: prev[difficulty] ? Math.min(prev[difficulty], timer + 1) : timer + 1 };
              localStorage.setItem('memory_best', JSON.stringify(updated));
              return updated;
            });
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === a.id || c.id === b.id) ? { ...c, flipped: false } : c));
          setFlipped([]);
          setLocked(false);
          if (navigator.vibrate) navigator.vibrate(20);
        }, 900);
      }
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const cfg = DIFFICULTIES[difficulty];

  return (
    <ToolWrapper toolName="Memory Card Game">
      <div style={styles.container}>
        {/* Difficulty */}
        <div style={styles.diffRow}>
          {Object.entries(DIFFICULTIES).map(([key, val]) => (
            <button key={key} onClick={() => { setDifficulty(key); startGame(key); }} style={{
              ...styles.diffBtn,
              ...(difficulty === key ? styles.diffBtnActive : {}),
            }}>{val.label} ({val.pairs * 2})</button>
          ))}
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          {[
            { label: 'Moves', val: moves, color: '#00d4ff' },
            { label: 'Pairs', val: `${matches}/${totalPairs}`, color: '#c9a96e' },
            { label: 'Time', val: formatTime(timer), color: '#e91e8c' },
            { label: 'Best', val: bestTimes[difficulty] ? formatTime(bestTimes[difficulty]) : '—', color: '#00ff88' },
          ].map(s => (
            <div key={s.label} style={styles.statBox}>
              <span style={{ ...styles.statVal, color: s.color }}>{s.val}</span>
              <span style={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={styles.progressTrack}>
          <motion.div
            style={styles.progressFill}
            animate={{ width: `${(matches / totalPairs) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Card grid */}
        <div style={{
          ...styles.grid,
          gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`,
        }}>
          {cards.map((card) => (
            <motion.div
              key={card.id}
              onClick={() => handleCard(card)}
              style={{
                ...styles.cardWrap,
                cursor: card.matched || card.flipped ? 'default' : 'pointer',
              }}
              whileHover={!card.flipped && !card.matched ? { scale: 1.05 } : {}}
              whileTap={!card.flipped && !card.matched ? { scale: 0.95 } : {}}
            >
              <motion.div
                style={{
                  ...styles.card,
                  rotateY: card.flipped || card.matched ? 0 : 180,
                }}
                animate={{ rotateY: card.flipped || card.matched ? 0 : 180 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                {/* Front */}
                <div style={{
                  ...styles.cardFace,
                  ...styles.cardFront,
                  background: card.matched
                    ? 'rgba(0,255,136,0.12)'
                    : 'rgba(255,255,255,0.06)',
                  border: card.matched
                    ? '2px solid rgba(0,255,136,0.4)'
                    : '2px solid rgba(255,255,255,0.12)',
                  boxShadow: card.matched ? '0 0 16px rgba(0,255,136,0.25)' : 'none',
                }}>
                  <span style={styles.cardIcon}>{card.icon}</span>
                </div>
                {/* Back */}
                <div style={{ ...styles.cardFace, ...styles.cardBack }}>
                  <span style={styles.cardQuestion}>?</span>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Win overlay */}
        <AnimatePresence>
          {won && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={styles.winCard}
            >
              <div style={styles.winEmoji}>🎉</div>
              <div style={styles.winTitle}>You Won!</div>
              <div style={styles.winStats}>
                <span>{moves} moves</span>
                <span>·</span>
                <span>{formatTime(timer)}</span>
              </div>
              {bestTimes[difficulty] === timer && timer > 0 && (
                <div style={styles.newBest}>🏆 New Best Time!</div>
              )}
              <motion.button onClick={() => startGame()} style={styles.playAgainBtn} whileTap={{ scale: 0.97 }}>
                Play Again
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button onClick={() => startGame()} style={styles.resetBtn} whileTap={{ scale: 0.97 }}>
          🔄 New Game
        </motion.button>
      </div>
    </ToolWrapper>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', position: 'relative' },
  diffRow: { display: 'flex', gap: '8px' },
  diffBtn: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
    color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif",
    fontSize: '13px', fontWeight: '700', padding: '8px 14px', transition: 'all 0.2s', minHeight: '36px',
  },
  diffBtnActive: { background: 'rgba(201,169,110,0.12)', borderColor: 'rgba(201,169,110,0.3)', color: '#c9a96e' },
  statsRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' },
  statBox: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '10px', padding: '10px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
  },
  statVal: { fontFamily: "'Orbitron', sans-serif", fontSize: '16px', fontWeight: '700' },
  statLabel: { fontFamily: "'Rajdhani', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' },
  progressTrack: { width: '100%', height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #c9a96e, #00d4ff)', borderRadius: '2px' },
  grid: { display: 'grid', gap: '8px', width: '100%', maxWidth: '380px' },
  cardWrap: { aspectRatio: '1', perspective: '600px' },
  card: {
    width: '100%', height: '100%', position: 'relative',
    transformStyle: 'preserve-3d',
  },
  cardFace: {
    position: 'absolute', inset: 0, borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    transition: 'background 0.3s, border 0.3s',
  },
  cardFront: {},
  cardBack: {
    background: 'linear-gradient(135deg, rgba(233,30,140,0.2), rgba(255,107,53,0.15))',
    border: '2px solid rgba(233,30,140,0.2)',
    transform: 'rotateY(180deg)',
  },
  cardIcon: { fontSize: 'clamp(20px, 5vw, 32px)', userSelect: 'none' },
  cardQuestion: {
    fontFamily: "'Orbitron', sans-serif", fontSize: 'clamp(18px, 4vw, 28px)',
    fontWeight: '900', color: 'rgba(233,30,140,0.6)', userSelect: 'none',
  },
  winCard: {
    position: 'absolute', inset: 0, background: 'rgba(10,10,15,0.92)',
    backdropFilter: 'blur(8px)', borderRadius: '16px', zIndex: 10,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '12px',
  },
  winEmoji: { fontSize: '56px' },
  winTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: '28px', fontWeight: '900', color: '#00ff88', textShadow: '0 0 24px rgba(0,255,136,0.6)' },
  winStats: { fontFamily: "'Rajdhani', sans-serif", fontSize: '18px', color: 'rgba(255,255,255,0.6)', display: 'flex', gap: '8px' },
  newBest: { fontFamily: "'Orbitron', sans-serif", fontSize: '14px', color: '#c9a96e' },
  playAgainBtn: {
    background: 'linear-gradient(135deg, #e91e8c, #ff6b35)', border: 'none', borderRadius: '12px',
    color: '#fff', fontFamily: "'Orbitron', sans-serif", fontSize: '14px', fontWeight: '700',
    padding: '13px 28px', cursor: 'pointer', letterSpacing: '1px',
  },
  resetBtn: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '10px',
    color: 'rgba(255,255,255,0.5)', fontFamily: "'Rajdhani', sans-serif",
    fontSize: '14px', fontWeight: '600', padding: '10px 20px', cursor: 'pointer', minHeight: '40px',
  },
};
