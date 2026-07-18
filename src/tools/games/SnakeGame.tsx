import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { ThemeContext } from '../../context/ThemeContext';

const CELL = 20;
const COLS = 20;
const ROWS = 20;
const INITIAL_SPEED = 150;

interface Point {
  x: number;
  y: number;
}

const DIR = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

function randomFood(snake: Point[]): Point {
  let pos: Point;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

export default function SnakeGame() {
  const { tokens } = useContext(ThemeContext);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cellSizeRef = useRef(CELL);
  const [containerWidth, setContainerWidth] = useState(380);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  
  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }] as Point[],
    dir: DIR.RIGHT as Point,
    nextDir: DIR.RIGHT as Point,
    food: { x: 15, y: 10 } as Point,
    score: 0,
    running: false,
    gameOver: false,
  });

  const loopRef = useRef<NodeJS.Timeout | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const [display, setDisplay] = useState({
    score: 0,
    highScore: parseInt(localStorage.getItem('snake_hs') || '0'),
    gameOver: false,
    running: false,
    started: false
  });

  const getSpeed = (score: number) => Math.max(60, INITIAL_SPEED - Math.floor(score / 10) * 5);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;
    const drawCellSize = cellSizeRef.current;

    // Draw background
    ctx.fillStyle = tokens.surface || '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = tokens.border || 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * drawCellSize, 0);
      ctx.lineTo(x * drawCellSize, ROWS * drawCellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * drawCellSize);
      ctx.lineTo(COLS * drawCellSize, y * drawCellSize);
      ctx.stroke();
    }

    // Food
    const fx = s.food.x * drawCellSize + drawCellSize / 2;
    const fy = s.food.y * drawCellSize + drawCellSize / 2;
    ctx.save();
    ctx.shadowColor = tokens.accent || '#c9a96e';
    ctx.shadowBlur = 12;
    ctx.fillStyle = tokens.accent || '#c9a96e';
    ctx.beginPath();
    ctx.arc(fx, fy, drawCellSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Snake
    s.snake.forEach((seg, i) => {
      const isHead = i === 0;
      const t = 1 - i / s.snake.length;
      ctx.save();
      
      if (isHead) {
        ctx.shadowColor = tokens.accent || '#00ff88';
        ctx.shadowBlur = 15;
      }

      // Snake body gradient: starting with Accent, fading to AccentDim
      const g = ctx.createLinearGradient(seg.x * drawCellSize, seg.y * drawCellSize, seg.x * drawCellSize + drawCellSize, seg.y * drawCellSize + drawCellSize);
      const accColor = tokens.accent || '#00ff88';
      g.addColorStop(0, isHead ? accColor : `rgba(0,180,100,${0.4 + t * 0.6})`);
      g.addColorStop(1, isHead ? accColor : `rgba(0,120,60,${0.2 + t * 0.6})`);
      
      ctx.fillStyle = g;
      ctx.beginPath();
      
      // Standard roundRect fallback
      const rx = seg.x * drawCellSize + 1;
      const ry = seg.y * drawCellSize + 1;
      const rw = drawCellSize - 2;
      const rh = drawCellSize - 2;
      const radius = isHead ? 6 : 4;
      
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(rx, ry, rw, rh, radius);
      } else {
        ctx.rect(rx, ry, rw, rh);
      }
      
      ctx.fill();
      ctx.restore();
    });
  }, [tokens]);

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;
    s.dir = s.nextDir;
    const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return endGame();
    // Self collision
    if (s.snake.some(seg => seg.x === head.x && seg.y === head.y)) return endGame();

    s.snake.unshift(head);
    if (head.x === s.food.x && head.y === s.food.y) {
      s.score++;
      s.food = randomFood(s.snake);
      setDisplay(d => ({ ...d, score: s.score }));
      if (navigator.vibrate) navigator.vibrate(20);
    } else {
      s.snake.pop();
    }
    draw();
    loopRef.current = setTimeout(tick, getSpeed(s.score));
  }, [draw]);

  const endGame = useCallback(() => {
    const s = stateRef.current;
    s.running = false;
    s.gameOver = true;
    if (loopRef.current) clearTimeout(loopRef.current);
    const hs = Math.max(s.score, parseInt(localStorage.getItem('snake_hs') || '0'));
    localStorage.setItem('snake_hs', String(hs));
    setDisplay(d => ({ ...d, gameOver: true, running: false, highScore: hs }));
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  }, []);

  const startGame = useCallback(() => {
    if (loopRef.current) clearTimeout(loopRef.current);
    const initSnake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    stateRef.current = {
      snake: initSnake,
      dir: DIR.RIGHT,
      nextDir: DIR.RIGHT,
      food: randomFood(initSnake),
      score: 0,
      running: true,
      gameOver: false,
    };
    setDisplay(d => ({ ...d, score: 0, gameOver: false, running: true, started: true }));
    loopRef.current = setTimeout(tick, INITIAL_SPEED);
  }, [tick]);

  const setDir = useCallback((dir: Point) => {
    const s = stateRef.current;
    if (!s.running) return;
    const opposite = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
    const currentName = Object.keys(DIR).find(k => (DIR as any)[k] === s.dir) as keyof typeof opposite;
    const newName = Object.keys(DIR).find(k => (DIR as any)[k] === dir) as string;
    if (opposite[currentName] !== newName) {
      s.nextDir = dir;
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Point> = { 
        ArrowUp: DIR.UP, 
        ArrowDown: DIR.DOWN, 
        ArrowLeft: DIR.LEFT, 
        ArrowRight: DIR.RIGHT, 
        w: DIR.UP, 
        s: DIR.DOWN, 
        a: DIR.LEFT, 
        d: DIR.RIGHT 
      };
      if (map[e.key]) {
        e.preventDefault();
        setDir(map[e.key]);
      }
      if (e.key === ' ') {
        e.preventDefault();
        if (!stateRef.current.running) startGame();
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (loopRef.current) clearTimeout(loopRef.current);
    };
  }, [setDir, startGame]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Touch handlers for swipe controls
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return; // threshold for swipe

    if (Math.abs(dx) > Math.abs(dy)) {
      setDir(dx > 0 ? DIR.RIGHT : DIR.LEFT);
    } else {
      setDir(dy > 0 ? DIR.DOWN : DIR.UP);
    }
    touchStart.current = null;
  };

  const canvasSize = Math.min(containerWidth, 380);
  const cellSize = Math.floor(canvasSize / COLS);
  const actualSize = cellSize * COLS;
  cellSizeRef.current = cellSize;

  return (
    <ToolWrapper toolName="Snake Game">
      <div ref={containerRef} style={styles.container}>
        {/* Score */}
        <div style={styles.scoreRow}>
          <div style={{ ...styles.scoreBox, borderColor: tokens.border, background: tokens.surface }}>
            <span style={styles.scoreLabel}>Score</span>
            <span style={{ ...styles.scoreVal, color: tokens.accent }}>{display.score}</span>
          </div>
          <div style={{ ...styles.scoreBox, borderColor: tokens.border, background: tokens.surface }}>
            <span style={styles.scoreLabel}>Best</span>
            <span style={{ ...styles.scoreVal, color: tokens.textPrimary }}>{display.highScore}</span>
          </div>
          <div style={{ ...styles.scoreBox, borderColor: tokens.border, background: tokens.surface }}>
            <span style={styles.scoreLabel}>Speed</span>
            <span style={{ ...styles.scoreVal, fontSize: '14px' }}>
              {display.score < 10 ? '🐢' : display.score < 30 ? '🐇' : display.score < 60 ? '⚡' : '🚀'}
            </span>
          </div>
        </div>

        {/* Canvas Wrap with Touch Event listeners */}
        <div 
          style={{ position: 'relative', width: `${actualSize}px`, height: `${actualSize}px` }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <canvas
            ref={canvasRef}
            width={actualSize}
            height={actualSize}
            style={{
              ...styles.canvas,
              width: `${actualSize}px`,
              height: `${actualSize}px`,
              borderColor: tokens.border,
            }}
          />

          {/* Overlay */}
          <AnimatePresence>
            {(!display.started || display.gameOver) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ ...styles.overlay, background: tokens.surface }}
              >
                {display.gameOver ? (
                  <>
                    <div style={{ ...styles.overlayTitle, color: tokens.accent }}>Game Over</div>
                    <div style={styles.overlayScore}>Score: <span style={{ color: tokens.accent }}>{display.score}</span></div>
                    {display.score > 0 && display.score >= display.highScore && (
                      <div style={{ ...styles.newRecord, color: tokens.accent }}>🏆 New Record!</div>
                    )}
                    <motion.button onClick={startGame} style={{ ...styles.startBtn, background: tokens.accent, color: tokens.surface }} whileTap={{ scale: 0.95 }}>
                      Play Again
                    </motion.button>
                  </>
                ) : (
                  <>
                    <div style={{ ...styles.overlayTitle, color: tokens.accent }}>Snake</div>
                    <p style={styles.overlayHint}>Swipe inside board or use D-pad below</p>
                    <motion.button onClick={startGame} style={{ ...styles.startBtn, background: tokens.accent, color: tokens.surface }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      ▶ Start Game
                    </motion.button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile D-pad */}
        <div style={styles.dpad}>
          <div style={styles.dpadRow}>
            <button onClick={() => setDir(DIR.UP)} style={{ ...styles.dpadBtn, background: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }}>▲</button>
          </div>
          <div style={styles.dpadRow}>
            <button onClick={() => setDir(DIR.LEFT)} style={{ ...styles.dpadBtn, background: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }}>◀</button>
            <div style={styles.dpadCenter} />
            <button onClick={() => setDir(DIR.RIGHT)} style={{ ...styles.dpadBtn, background: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }}>▶</button>
          </div>
          <div style={styles.dpadRow}>
            <button onClick={() => setDir(DIR.DOWN)} style={{ ...styles.dpadBtn, background: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }}>▼</button>
          </div>
        </div>

        <p style={styles.hint}>Keyboard: Arrow keys / WASD · Space to start</p>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--color-text-main)' },
  scoreRow: { display: 'flex', gap: '12px' },
  scoreBox: {
    border: '1px solid',
    borderRadius: '12px', padding: '10px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
  },
  scoreLabel: { fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  scoreVal: { fontFamily: "'Orbitron', sans-serif", fontSize: '20px', fontWeight: '800' },
  canvas: {
    display: 'block', borderRadius: '12px',
    border: '2px solid',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    imageRendering: 'pixelated',
  },
  overlay: {
    position: 'absolute', inset: 0, borderRadius: '12px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
    zIndex: 5,
    opacity: 0.96,
    backdropFilter: 'blur(4px)',
  },
  overlayTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: '32px', fontWeight: '900', textShadow: '0 0 24px rgba(0,0,0,0.1)' },
  overlayScore: { fontFamily: "'Rajdhani', sans-serif", fontSize: '18px', color: 'var(--color-text-main)' },
  newRecord: { fontFamily: "'Orbitron', sans-serif", fontSize: '14px' },
  overlayHint: { fontFamily: "'Rajdhani', sans-serif", fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 },
  startBtn: {
    border: 'none', borderRadius: '12px',
    fontFamily: "'Orbitron', sans-serif", fontSize: '15px', fontWeight: '700',
    padding: '13px 32px', cursor: 'pointer', letterSpacing: '1px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  dpad: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '4px' },
  dpadRow: { display: 'flex', gap: '4px', alignItems: 'center' },
  dpadBtn: {
    width: '56px', height: '56px',
    border: '1px solid', borderRadius: '12px',
    fontSize: '20px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.1s', WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
  },
  dpadCenter: { width: '56px', height: '56px' },
  hint: { fontFamily: "'Rajdhani', sans-serif", fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' },
};
