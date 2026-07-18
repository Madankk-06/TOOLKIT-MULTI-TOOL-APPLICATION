import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

const SIZE = 4;
const TILE_COLORS: Record<number, { bg: string; color: string }> = {
  0: { bg: 'rgba(255,255,255,0.04)', color: 'transparent' },
  2: { bg: 'var(--color-bg-elevated, #2D3748)', color: 'var(--color-text-main)' },
  4: { bg: 'var(--color-border, #4A5568)', color: 'var(--color-text-main)' },
  8: { bg: 'var(--color-accent)', color: 'var(--color-bg-main, #000)' },
  16: { bg: '#c9a96e', color: '#0a0a0f' },
  32: { bg: '#ff6b35', color: '#fff' },
  64: { bg: '#e91e8c', color: '#fff' },
  128: { bg: '#00d4ff', color: '#0a0a0f' },
  256: { bg: '#00b8d4', color: '#0a0a0f' },
  512: { bg: '#00ff88', color: '#0a0a0f' },
  1024: { bg: '#7c4dff', color: '#fff' },
  2048: { bg: '#ffd700', color: '#0a0a0f' },
};

function emptyGrid(): number[][] {
  return Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
}

function addTile(grid: number[][]): number[][] {
  const empty: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) empty.push([r, c]);
    }
  }
  if (!empty.length) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newGrid = grid.map(row => [...row]);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
}

function compress(row: number[]): { row: number[]; gained: number } {
  const nums = row.filter(v => v !== 0);
  const merged: number[] = [];
  let gained = 0;
  let i = 0;
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      merged.push(nums[i] * 2);
      gained += nums[i] * 2;
      i += 2;
    } else {
      merged.push(nums[i]);
      i++;
    }
  }
  while (merged.length < SIZE) merged.push(0);
  return { row: merged, gained };
}

function move(grid: number[][], dir: 'left' | 'right' | 'up' | 'down'): { grid: number[][]; gained: number; changed: boolean } {
  let newGrid = grid.map(r => [...r]);
  let gained = 0;
  let changed = false;

  const processRows = (g: number[][]) => {
    return g.map(row => {
      const { row: r, gained: g2 } = compress(row);
      gained += g2;
      if (r.join(',') !== row.join(',')) changed = true;
      return r;
    });
  };

  if (dir === 'left') {
    newGrid = processRows(newGrid);
  } else if (dir === 'right') {
    newGrid = processRows(newGrid.map(r => [...r].reverse())).map(r => [...r].reverse());
  } else if (dir === 'up') {
    let t = transpose(newGrid);
    t = processRows(t);
    newGrid = transpose(t);
  } else if (dir === 'down') {
    let t = transpose(newGrid).map(r => [...r].reverse());
    t = processRows(t);
    newGrid = transpose(t.map(r => [...r].reverse()));
  }

  return { grid: newGrid, gained, changed };
}

function transpose(g: number[][]): number[][] {
  return g[0].map((_, i) => g.map(r => r[i]));
}

function isGameOver(grid: number[][]): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) return false;
      if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return false;
      if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return false;
    }
  }
  return true;
}

function hasWon(grid: number[][]): boolean {
  return grid.some(r => r.some(v => v >= 2048));
}

export default function Game2048() {
  const [grid, setGrid] = useState<number[][]>(() => addTile(addTile(emptyGrid())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('g2048_best') || '0'));
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [wonShown, setWonShown] = useState(false);
  const [history, setHistory] = useState<{ grid: number[][]; score: number }[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const doMove = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    setGrid(prev => {
      const { grid: newGrid, gained, changed } = move(prev, dir);
      if (!changed) return prev;
      setHistory(h => [{ grid: prev, score: score }, ...h.slice(0, 4)]);
      const withNew = addTile(newGrid);
      setScore(s => {
        const ns = s + gained;
        setBest(b => {
          const nb = Math.max(b, ns);
          localStorage.setItem('g2048_best', String(nb));
          return nb;
        });
        return ns;
      });
      if (isGameOver(withNew)) {
        setGameOver(true);
        if (navigator.vibrate) navigator.vibrate([50, 30, 80]);
      }
      if (!wonShown && hasWon(withNew)) {
        setWon(true);
        setWonShown(true);
      }
      return withNew;
    });
  }, [score, wonShown]);

  const undo = () => {
    if (!history.length) return;
    const last = history[0];
    setGrid(last.grid);
    setScore(last.score);
    setHistory(h => h.slice(1));
    setGameOver(false);
  };

  const newGame = () => {
    setGrid(addTile(addTile(emptyGrid())));
    setScore(0);
    setGameOver(false);
    setWon(false);
    setWonShown(false);
    setHistory([]);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, 'left' | 'right' | 'up' | 'down'> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
        a: 'left',
        d: 'right',
        w: 'up',
        s: 'down',
      };
      if (map[e.key]) {
        e.preventDefault();
        doMove(map[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doMove]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      doMove(dx > 0 ? 'right' : 'left');
    } else {
      doMove(dy > 0 ? 'down' : 'up');
    }
    touchStart.current = null;
  };

  const getTileStyle = (val: number) => {
    const base = TILE_COLORS[val] || TILE_COLORS[2048];
    return {
      background: base.bg,
      color: base.color,
      boxShadow: val >= 2048 
        ? '0 0 24px rgba(255,215,0,0.6)' 
        : val >= 512 
        ? '0 0 12px rgba(0,255,136,0.3)' 
        : val >= 64 
        ? '0 0 8px rgba(233,30,140,0.3)' 
        : 'none',
    };
  };

  return (
    <ToolWrapper toolName="2048">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleBox}>
            <span style={styles.title}>2048</span>
          </div>
          <div style={styles.scoresRow}>
            <div style={styles.scoreBox}>
              <span style={styles.scoreLbl}>Score</span>
              <motion.span key={score} initial={{ scale: 1.3 }} animate={{ scale: 1 }} style={styles.scoreVal}>{score}</motion.span>
            </div>
            <div style={styles.scoreBox}>
              <span style={styles.scoreLbl}>Best</span>
              <span style={{ ...styles.scoreVal, color: 'var(--color-accent)' }}>{best}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          <button onClick={newGame} style={styles.newBtn}>New Game</button>
          <button onClick={undo} disabled={!history.length} style={{ ...styles.undoBtn, opacity: history.length ? 1 : 0.3 }}>↩ Undo</button>
        </div>

        {/* Board */}
        <div
          style={styles.board}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Background cells */}
          {Array(SIZE).fill(0).map((_, r) => Array(SIZE).fill(0).map((_, c) => (
            <div 
              key={`bg-${r}-${c}`} 
              style={{
                ...styles.bgCell,
                gridRow: r + 1,
                gridColumn: c + 1
              }} 
            />
          )))}

          {/* Tiles stacked explicitly on grid cells */}
          {grid.map((row, r) => row.map((val, c) => val > 0 && (
            <motion.div
              key={`${r}-${c}-${val}`}
              style={{
                ...styles.tile,
                ...getTileStyle(val),
                gridRow: r + 1,
                gridColumn: c + 1,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <span style={{
                ...styles.tileNum,
                fontSize: val >= 1024 ? '18px' : val >= 128 ? '22px' : val >= 16 ? '26px' : '30px',
              }}>{val}</span>
            </motion.div>
          )))}

          {/* Game Over */}
          <AnimatePresence>
            {(gameOver || won) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={styles.overlay}
              >
                {won && !gameOver ? (
                  <>
                    <div style={styles.overlayTitle2048} >🏆 You Win!</div>
                    <p style={styles.overlayMsg}>You reached 2048!</p>
                    <button onClick={() => setWon(false)} style={styles.continueBtn}>Keep Playing</button>
                    <button onClick={newGame} style={styles.newGameBtn}>New Game</button>
                  </>
                ) : (
                  <>
                    <div style={{ ...styles.overlayTitle2048, color: '#e91e8c' }}>Game Over</div>
                    <p style={styles.overlayMsg}>Score: {score}</p>
                    <button onClick={newGame} style={styles.newGameBtn}>Try Again</button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p style={styles.hint}>Swipe or use Arrow Keys to merge tiles</p>
      </div>
    </ToolWrapper>
  );
}

const CELL_SIZE = 'minmax(0, 1fr)';
const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '400px', margin: '0 auto', color: 'var(--color-text-main)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  titleBox: {},
  title: { fontFamily: "'Orbitron', sans-serif", fontSize: '32px', fontWeight: '900', color: 'var(--color-accent)' },
  scoresRow: { display: 'flex', gap: '8px' },
  scoreBox: {
    background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
    borderRadius: '10px', padding: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
  },
  scoreLbl: { fontFamily: "'Rajdhani', sans-serif", fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  scoreVal: { fontFamily: "'Orbitron', sans-serif", fontSize: '18px', fontWeight: '700', color: 'var(--color-text-main)' },
  controls: { display: 'flex', gap: '8px', width: '100%' },
  newBtn: {
    flex: 1, background: 'var(--color-accent)', border: 'none', borderRadius: '10px',
    color: 'var(--color-bg-main, #000)', fontFamily: "'Orbitron', sans-serif", fontSize: '13px', fontWeight: '700',
    padding: '10px', cursor: 'pointer', minHeight: '40px', letterSpacing: '0.5px',
  },
  undoBtn: {
    background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '10px',
    color: 'var(--color-text-main)', fontFamily: "'Rajdhani', sans-serif", fontSize: '14px', fontWeight: '700',
    padding: '10px 18px', cursor: 'pointer', minHeight: '40px', transition: 'opacity 0.2s',
  },
  board: {
    display: 'grid',
    gridTemplateColumns: `repeat(${SIZE}, ${CELL_SIZE})`,
    gridTemplateRows: `repeat(${SIZE}, ${CELL_SIZE})`,
    gap: '8px',
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '16px',
    padding: '10px',
    width: '100%',
    aspectRatio: '1',
    position: 'relative',
    touchAction: 'none',
    userSelect: 'none',
  },
  bgCell: {
    background: 'var(--color-bg-elevated, rgba(255,255,255,0.04))', borderRadius: '8px',
    width: '100%', height: '100%',
  },
  tile: {
    borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.1s ease',
    width: '100%', height: '100%',
    zIndex: 2,
  },
  tileNum: { fontFamily: "'Orbitron', sans-serif", fontWeight: '800', lineHeight: 1 },
  overlay: {
    position: 'absolute', inset: 0, borderRadius: '14px',
    background: 'var(--color-bg-surface)', opacity: 0.96, backdropFilter: 'blur(4px)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', zIndex: 5,
  },
  overlayTitle2048: { fontFamily: "'Orbitron', sans-serif", fontSize: '28px', fontWeight: '900', color: '#ffd700', textShadow: '0 0 24px rgba(255,215,0,0.6)' },
  overlayMsg: { fontFamily: "'Rajdhani', sans-serif", fontSize: '16px', color: 'var(--color-text-muted)', margin: 0 },
  continueBtn: {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '10px',
    color: 'var(--color-accent)', fontFamily: "'Rajdhani', sans-serif", fontSize: '15px', fontWeight: '700',
    padding: '11px 22px', cursor: 'pointer', minHeight: '42px',
  },
  newGameBtn: {
    background: 'var(--color-accent)', border: 'none', borderRadius: '10px',
    color: 'var(--color-bg-main, #000)', fontFamily: "'Orbitron', sans-serif", fontSize: '13px', fontWeight: '700',
    padding: '11px 22px', cursor: 'pointer', minHeight: '42px',
  },
  hint: { fontFamily: "'Rajdhani', sans-serif", fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' },
};
