import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import SkeuomorphicToggle from '../../components/SkeuomorphicToggle';

const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function checkWinner(board) {
  for (const [a,b,c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a], line: [a,b,c] };
  }
  if (board.every(Boolean)) return { winner: 'draw', line: [] };
  return null;
}

function minimax(board, isMax, depth = 0) {
  const result = checkWinner(board);
  if (result) {
    if (result.winner === 'O') return 10 - depth;
    if (result.winner === 'X') return depth - 10;
    return 0;
  }
  const scores = [];
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = isMax ? 'O' : 'X';
      scores.push(minimax(board, !isMax, depth + 1));
      board[i] = null;
    }
  }
  return isMax ? Math.max(...scores) : Math.min(...scores);
}

function getBestMove(board) {
  let best = -Infinity, move = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const score = minimax(board, false);
      board[i] = null;
      if (score > best) { best = score; move = i; }
    }
  }
  return move;
}

export default function TicTacToe() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isX, setIsX] = useState(true);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('ai'); // ai | 2p
  const [difficulty, setDifficulty] = useState('hard'); // hard | easy
  const [scores, setScores] = useState({ X: 0, O: 0, draw: 0 });
  const [winLine, setWinLine] = useState([]);
  const [aiThinking, setAiThinking] = useState(false);

  useEffect(() => {
    if (mode === 'ai' && !isX && !result) {
      setAiThinking(true);
      const timer = setTimeout(() => {
        const newBoard = [...board];
        let move;
        if (difficulty === 'easy') {
          const empty = newBoard.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
          move = empty[Math.floor(Math.random() * empty.length)];
        } else {
          move = getBestMove(newBoard);
        }
        if (move !== undefined && move !== -1) {
          newBoard[move] = 'O';
          const res = checkWinner(newBoard);
          setBoard(newBoard);
          if (res) {
            setResult(res);
            setWinLine(res.line);
            setScores(s => ({ ...s, [res.winner]: (s[res.winner] || 0) + 1 }));
          } else {
            setIsX(true);
          }
        }
        setAiThinking(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [board, isX, mode, result, difficulty]);

  const handleClick = (i) => {
    if (board[i] || result || aiThinking) return;
    if (mode === 'ai' && !isX) return;
    const newBoard = [...board];
    newBoard[i] = isX ? 'X' : 'O';
    const res = checkWinner(newBoard);
    setBoard(newBoard);
    if (res) {
      setResult(res);
      setWinLine(res.line);
      setScores(s => ({ ...s, [res.winner]: (s[res.winner] || 0) + 1 }));
    } else {
      setIsX(!isX);
    }
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setIsX(true);
    setResult(null);
    setWinLine([]);
  };

  const fullReset = () => { reset(); setScores({ X: 0, O: 0, draw: 0 }); };

  const currentPlayer = isX ? 'X' : 'O';
  const playerColor = { X: '#00d4ff', O: '#c9a96e' };

  return (
    <ToolWrapper toolName="Tic Tac Toe">
      <div style={styles.container}>
        {/* Mode & Difficulty */}
        <div style={{ ...styles.optionsRow, alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontFamily: "'Rajdhani', sans-serif" }}>
              Mode
            </span>
            <SkeuomorphicToggle
              checked={mode === '2p'}
              onChange={(is2P) => { setMode(is2P ? '2p' : 'ai'); fullReset(); }}
              uncheckedLabel="🤖"
              checkedLabel="👥"
              size={58}
            />
          </div>
          {mode === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontFamily: "'Rajdhani', sans-serif" }}>
                Difficulty
              </span>
              <div style={styles.toggleGroup}>
                {[['easy', 'Easy'], ['hard', 'Hard']].map(([d, l]) => (
                  <button key={d} onClick={() => { setDifficulty(d); fullReset(); }} style={{
                    ...styles.optBtn,
                    ...(difficulty === d ? { ...styles.optBtnActive, borderColor: d === 'hard' ? 'rgba(233,30,140,0.4)' : 'rgba(0,212,255,0.4)', background: d === 'hard' ? 'rgba(233,30,140,0.12)' : 'rgba(0,212,255,0.12)', color: d === 'hard' ? '#e91e8c' : '#00d4ff' } : {}),
                  }}>{l}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Score board */}
        <div style={styles.scoreboard}>
          {[
            { label: mode === 'ai' ? 'You (X)' : 'Player X', key: 'X', color: '#00d4ff' },
            { label: 'Draw', key: 'draw', color: 'rgba(255,255,255,0.4)' },
            { label: mode === 'ai' ? 'AI (O)' : 'Player O', key: 'O', color: '#c9a96e' },
          ].map(s => (
            <div key={s.key} style={styles.scoreBox}>
              <span style={{ ...styles.scoreNum, color: s.color }}>{scores[s.key] || 0}</span>
              <span style={styles.scoreLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Status */}
        <div style={styles.status}>
          {result ? (
            result.winner === 'draw'
              ? <span style={{ color: 'rgba(255,255,255,0.6)' }}>It's a Draw!</span>
              : <span style={{ color: playerColor[result.winner] }}>
                  {mode === 'ai' ? (result.winner === 'X' ? '🎉 You Win!' : '🤖 AI Wins!') : `Player ${result.winner} Wins! 🎉`}
                </span>
          ) : aiThinking ? (
            <span style={{ color: '#c9a96e' }}>🤖 AI thinking…</span>
          ) : (
            <span style={{ color: playerColor[currentPlayer] }}>
              {mode === 'ai' ? (isX ? "Your turn (X)" : "AI's turn (O)") : `Player ${currentPlayer}'s turn`}
            </span>
          )}
        </div>

        {/* Board */}
        <div style={styles.board}>
          {board.map((cell, i) => {
            const isWinCell = winLine.includes(i);
            return (
              <motion.button
                key={i}
                onClick={() => handleClick(i)}
                style={{
                  ...styles.cell,
                  cursor: cell || result || (mode === 'ai' && !isX) ? 'default' : 'pointer',
                  background: isWinCell ? 'rgba(201,169,110,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${isWinCell ? '#c9a96e' : 'rgba(255,255,255,0.10)'}`,
                  boxShadow: isWinCell ? '0 0 20px rgba(201,169,110,0.3)' : 'none',
                }}
                whileHover={!cell && !result ? { background: 'rgba(255,255,255,0.06)', scale: 1.02 } : {}}
                whileTap={!cell && !result ? { scale: 0.96 } : {}}
              >
                <AnimatePresence>
                  {cell && (
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      style={{
                        fontFamily: "'Orbitron', sans-serif",
                        fontSize: '36px',
                        fontWeight: '900',
                        color: cell === 'X' ? '#00d4ff' : '#c9a96e',
                        textShadow: cell === 'X' ? '0 0 16px rgba(0,212,255,0.6)' : '0 0 16px rgba(201,169,110,0.6)',
                      }}
                    >{cell}</motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <motion.button onClick={reset} style={styles.newBtn} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            New Game
          </motion.button>
          <motion.button onClick={fullReset} style={styles.resetBtn} whileTap={{ scale: 0.97 }}>
            Reset Scores
          </motion.button>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', maxWidth: '420px', margin: '0 auto' },
  optionsRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' },
  toggleGroup: { display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '3px', gap: '3px' },
  optBtn: {
    background: 'transparent', border: '1px solid transparent', borderRadius: '8px',
    color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif",
    fontSize: '13px', fontWeight: '700', padding: '8px 14px', transition: 'all 0.2s', minHeight: '36px',
  },
  optBtnActive: { background: 'rgba(201,169,110,0.12)', borderColor: 'rgba(201,169,110,0.3)', color: '#c9a96e' },
  scoreboard: { display: 'flex', gap: '0', width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' },
  scoreBox: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '12px', borderRight: '1px solid rgba(255,255,255,0.06)' },
  scoreNum: { fontFamily: "'Orbitron', sans-serif", fontSize: '28px', fontWeight: '900' },
  scoreLabel: { fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' },
  status: { fontFamily: "'Orbitron', sans-serif", fontSize: '16px', fontWeight: '700', minHeight: '24px' },
  board: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
    width: '100%', maxWidth: '320px',
  },
  cell: {
    aspectRatio: '1', border: '2px solid', borderRadius: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s', minHeight: '88px',
  },
  actions: { display: 'flex', gap: '10px' },
  newBtn: {
    background: 'linear-gradient(135deg, #e91e8c, #ff6b35)', border: 'none', borderRadius: '12px',
    color: '#fff', fontFamily: "'Orbitron', sans-serif", fontSize: '13px', fontWeight: '700',
    padding: '12px 24px', cursor: 'pointer', minHeight: '44px', letterSpacing: '0.5px',
  },
  resetBtn: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px',
    color: 'rgba(255,255,255,0.5)', fontFamily: "'Rajdhani', sans-serif",
    fontSize: '14px', fontWeight: '600', padding: '12px 20px', cursor: 'pointer', minHeight: '44px',
  },
};
