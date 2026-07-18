import React, { useState, useCallback, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { ThemeContext } from '../../context/ThemeContext';

// ── Piece Unicode ──────────────────────────────────────────────────
const PIECES: Record<string, string> = {
  wK:'♔', wQ:'♕', wR:'♖', wB:'♗', wN:'♘', wP:'♙',
  bK:'♚', bQ:'♛', bR:'♜', bB:'♝', bN:'♞', bP:'♟',
};

function initBoard(): (string | null)[][] {
  const b: (string | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  const order = ['R','N','B','Q','K','B','N','R'];
  order.forEach((p,c) => { b[0][c] = `b${p}`; b[7][c] = `w${p}`; });
  for (let c=0;c<8;c++) { b[1][c]='bP'; b[6][c]='wP'; }
  return b;
}

function color(piece: string | null) { return piece ? piece[0] : null; }
function type(piece: string | null) { return piece ? piece[1] : null; }
function opp(c: string) { return c === 'w' ? 'b' : 'w'; }
function inBounds(r: number, c: number) { return r>=0&&r<8&&c>=0&&c<8; }

function getRawMoves(board: (string | null)[][], r: number, c: number, enPassant: [number, number] | null, castleRights: any) {
  const piece = board[r][c];
  if (!piece) return [];
  const col = color(piece), t = type(piece);
  const moves: [number, number][] = [];
  const add = (nr: number, nc: number) => { if (inBounds(nr,nc)) moves.push([nr,nc]); };
  const slide = (dr: number, dc: number) => {
    let nr=r+dr, nc=c+dc;
    while (inBounds(nr,nc)) {
      if (board[nr][nc]) { if (color(board[nr][nc])!==col) add(nr,nc); break; }
      add(nr,nc); nr+=dr; nc+=dc;
    }
  };

  if (t==='P') {
    const dir = col==='w' ? -1 : 1;
    const start = col==='w' ? 6 : 1;
    if (inBounds(r+dir,c) && !board[r+dir][c]) {
      add(r+dir,c);
      if (r===start && !board[r+2*dir][c]) add(r+2*dir,c);
    }
    [[-1],[1]].forEach(([dc]) => {
      if (inBounds(r+dir,c+dc)) {
        if (board[r+dir][c+dc] && color(board[r+dir][c+dc])!==col) add(r+dir,c+dc);
        if (enPassant && enPassant[0]===r+dir && enPassant[1]===c+dc) add(r+dir,c+dc);
      }
    });
  }
  if (t==='R'||t==='Q') { slide(1,0);slide(-1,0);slide(0,1);slide(0,-1); }
  if (t==='B'||t==='Q') { slide(1,1);slide(1,-1);slide(-1,1);slide(-1,-1); }
  if (t==='N') { [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc)); }
  if (t==='K') {
    [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
    if (castleRights) {
      const row = col==='w'?7:0;
      if (r===row&&c===4) {
        if (castleRights[col+'K'] && !board[row][5] && !board[row][6] && board[row][7]===col+'R') add(row,6);
        if (castleRights[col+'Q'] && !board[row][3] && !board[row][2] && !board[row][1] && board[row][0]===col+'R') add(row,2);
      }
    }
  }
  return moves.filter(([nr,nc]) => !board[nr][nc] || color(board[nr][nc])!==col);
}

function applyMove(board: (string | null)[][], fr: number, fc: number, tr: number, tc: number, enPassant: [number, number] | null, promo='Q') {
  const b = board.map(r=>[...r]);
  const piece = b[fr][fc];
  const col = color(piece) as string, t = type(piece);
  let newEP: [number, number] | null = null;
  const newCastle = { wK:true, wQ:true, bK:true, bQ:true };

  // En passant capture
  if (t==='P' && enPassant && tr===enPassant[0] && tc===enPassant[1]) {
    b[fr][tc] = null;
  }
  // Castling
  if (t==='K') {
    (newCastle as any)[col+'K'] = false; (newCastle as any)[col+'Q'] = false;
    if (Math.abs(tc-fc)===2) {
      if (tc===6) { b[fr][5]=b[fr][7]; b[fr][7]=null; }
      else { b[fr][3]=b[fr][0]; b[fr][0]=null; }
    }
  }
  if (t==='R') {
    if (fc===0) (newCastle as any)[col+'Q']=false;
    if (fc===7) (newCastle as any)[col+'K']=false;
  }
  // Pawn double move → en passant
  if (t==='P' && Math.abs(tr-fr)===2) newEP = [(fr+tr)/2, tc];
  // Pawn promotion
  b[tr][tc] = (t==='P' && (tr===0||tr===7)) ? col+promo : piece;
  b[fr][fc] = null;
  return { board: b, enPassant: newEP, castleRights: newCastle };
}

function findKing(board: (string | null)[][], col: string): [number, number] | null {
  for (let r=0;r<8;r++) {
    for (let c=0;c<8;c++) {
      if (board[r][c]===col+'K') return [r,c];
    }
  }
  return null;
}

function isInCheck(board: (string | null)[][], col: string, enPassant: [number, number] | null): boolean {
  const king = findKing(board, col);
  if (!king) return false;
  for (let r=0;r<8;r++) {
    for (let c=0;c<8;c++) {
      if (color(board[r][c])===opp(col)) {
        const moves = getRawMoves(board,r,c,enPassant,null);
        if (moves.some(([mr,mc])=>mr===king[0]&&mc===king[1])) return true;
      }
    }
  }
  return false;
}

function getLegalMoves(board: (string | null)[][], r: number, c: number, enPassant: [number, number] | null, castleRights: any): [number, number][] {
  const piece = board[r][c];
  if (!piece) return [];
  const col = color(piece) as string;
  const raw = getRawMoves(board,r,c,enPassant,castleRights);
  return raw.filter(([tr,tc]) => {
    const {board: nb, enPassant: nep} = applyMove(board,r,c,tr,tc,enPassant);
    return !isInCheck(nb, col, nep);
  });
}

function getAllLegal(board: (string | null)[][], col: string, enPassant: [number, number] | null, castleRights: any): number[][] {
  const all: number[][] = [];
  for (let r=0;r<8;r++) {
    for (let c=0;c<8;c++) {
      if (color(board[r][c])===col) {
        getLegalMoves(board,r,c,enPassant,castleRights).forEach(m=>all.push([r,c,...m]));
      }
    }
  }
  return all;
}

// ── Chess AI Heuristics minimax ──
const PIECE_VALUES: Record<string, number> = {
  P: 10, N: 30, B: 30, R: 50, Q: 90, K: 9000
};

function evaluateBoard(board: (string | null)[][]) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const pc = board[r][c];
      if (!pc) continue;
      const col = pc[0];
      const t = pc[1];
      let val = PIECE_VALUES[t] || 0;
      
      if (t === 'P') {
        val += col === 'w' ? (6 - r) * 0.5 : (r - 1) * 0.5;
      } else if (t === 'N' || t === 'B') {
        const distToCenter = Math.abs(3.5 - r) + Math.abs(3.5 - c);
        val += (6 - distToCenter) * 0.2;
      }

      if (col === 'w') {
        score += val;
      } else {
        score -= val;
      }
    }
  }
  return score;
}

function minimax(
  board: (string | null)[][], 
  depth: number, 
  isMaximizing: boolean, 
  alpha: number, 
  beta: number, 
  enPassant: [number, number] | null, 
  castleRights: any
): { score: number; move: number[] | null } {
  const nextTurn = isMaximizing ? 'w' : 'b';
  const legalMoves = getAllLegal(board, nextTurn, enPassant, castleRights);

  if (depth === 0 || legalMoves.length === 0) {
    return { score: evaluateBoard(board), move: null };
  }

  let bestMove: number[] | null = null;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const m of legalMoves) {
      const { board: nb } = applyMove(board, m[0], m[1], m[2], m[3], enPassant);
      const { score } = minimax(nb, depth - 1, false, alpha, beta, null, castleRights);
      if (score > maxScore) {
        maxScore = score;
        bestMove = m;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const m of legalMoves) {
      const { board: nb } = applyMove(board, m[0], m[1], m[2], m[3], enPassant);
      const { score } = minimax(nb, depth - 1, true, alpha, beta, null, castleRights);
      if (score < minScore) {
        minScore = score;
        bestMove = m;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minScore, move: bestMove };
  }
}

export default function Chess() {
  const { tokens } = useContext(ThemeContext);
  const [board, setBoard] = useState(initBoard());
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [vsComputer, setVsComputer] = useState(true); // VS Computer by default
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [legalMoves, setLegalMoves] = useState<[number, number][]>([]);
  const [enPassant, setEnPassant] = useState<[number, number] | null>(null);
  const [castleRights, setCastleRights] = useState({ wK:true, wQ:true, bK:true, bQ:true });
  const [check, setCheck] = useState(false);
  const [status, setStatus] = useState<'playing' | 'check' | 'checkmate' | 'stalemate'>('playing');
  const [flipped, setFlipped] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [captured, setCaptured] = useState<{ w: string[]; b: string[] }>({ w: [], b: [] });
  const [promoDialog, setPromoDialog] = useState<{ fr: number; fc: number; tr: number; tc: number } | null>(null);

  const files = flipped ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];
  const ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];

  const executeMove = useCallback((fr: number, fc: number, tr: number, tc: number, promo='Q') => {
    const nextTurn = opp(turn) as 'w' | 'b';
    const { board: nb, enPassant: nep, castleRights: ncr } = applyMove(board, fr, fc, tr, tc, enPassant, promo);
    const inCheck = isInCheck(nb, nextTurn, nep);
    const hasLegal = getAllLegal(nb, nextTurn, nep, ncr).length > 0;
    const captured_piece = board[tr][tc];

    if (captured_piece) {
      setCaptured(cap => ({ ...cap, [turn]: [...cap[turn], captured_piece] }));
    }

    const piece = board[fr][fc];
    const notation = piece ? `${PIECES[piece]}${files[fc]}${8-fr}→${files[tc]}${8-tr}` : '';
    setMoveHistory(h => [notation, ...h.slice(0, 19)]);

    setBoard(nb);
    setEnPassant(nep);
    setCastleRights(ncr);
    setTurn(nextTurn);
    setSelected(null);
    setLegalMoves([]);
    setPromoDialog(null);

    if (!hasLegal) setStatus(inCheck ? 'checkmate' : 'stalemate');
    else if (inCheck) { setStatus('check'); setCheck(true); }
    else { setStatus('playing'); setCheck(false); }

    if (navigator.vibrate) navigator.vibrate(15);
  }, [board, turn, enPassant, files]);

  const handleClick = useCallback((r: number, c: number) => {
    if (status === 'checkmate' || status === 'stalemate') return;
    if (vsComputer && turn === 'b') return; // block clicks during computer turn
    const piece = board[r][c];

    if (selected) {
      const isLegal = legalMoves.some(([mr,mc])=>mr===r&&mc===c);
      if (isLegal) {
        const fr = selected[0], fc = selected[1];
        const movePiece = board[fr][fc];
        const t = type(movePiece);

        // Check pawn promotion
        if (t==='P' && (r===0||r===7)) {
          setPromoDialog({ fr, fc, tr:r, tc:c });
          return;
        }

        executeMove(fr, fc, r, c, 'Q');
      } else if (piece && color(piece)===turn) {
        const moves = getLegalMoves(board, r, c, enPassant, castleRights);
        setSelected([r,c]);
        setLegalMoves(moves);
      } else {
        setSelected(null);
        setLegalMoves([]);
      }
    } else {
      if (piece && color(piece)===turn) {
        const moves = getLegalMoves(board, r, c, enPassant, castleRights);
        setSelected([r,c]);
        setLegalMoves(moves);
      }
    }
  }, [board, selected, legalMoves, turn, enPassant, castleRights, status, vsComputer, executeMove]);

  // Computer AI move trigger
  useEffect(() => {
    if (vsComputer && turn === 'b' && status !== 'checkmate' && status !== 'stalemate') {
      const timer = setTimeout(() => {
        const { move: aiMove } = minimax(board, 2, false, -Infinity, Infinity, enPassant, castleRights);
        if (aiMove) {
          executeMove(aiMove[0], aiMove[1], aiMove[2], aiMove[3]);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [turn, vsComputer, board, status, enPassant, castleRights, executeMove]);

  const resetGame = () => {
    setBoard(initBoard());
    setTurn('w');
    setSelected(null);
    setLegalMoves([]);
    setEnPassant(null);
    setCastleRights({ wK:true, wQ:true, bK:true, bQ:true });
    setCheck(false);
    setStatus('playing');
    setMoveHistory([]);
    setCaptured({ w:[], b:[] });
    setPromoDialog(null);
  };

  const boardR = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
  const boardC = flipped ? [...Array(8).keys()].reverse() : [...Array(8).keys()];

  const isLight = (r: number,c: number) => (r+c)%2===0;
  const isSelected = (r: number,c: number) => selected && selected[0]===r && selected[1]===c;
  const isLegal = (r: number,c: number) => legalMoves.some(([mr,mc])=>mr===r&&mc===c);
  const isCapture = (r: number,c: number) => isLegal(r,c) && board[r][c] !== null;

  return (
    <ToolWrapper toolName="Chess">
      <div style={styles.container}>
        {/* VS Mode Selector */}
        <div style={styles.modeToggle}>
          <button 
            onClick={() => { setVsComputer(true); resetGame(); }}
            style={{ ...styles.mBtn, ...(vsComputer ? styles.mActive : {}) }}
          >VS COMPUTER</button>
          <button 
            onClick={() => { setVsComputer(false); resetGame(); }}
            style={{ ...styles.mBtn, ...(!vsComputer ? styles.mActive : {}) }}
          >VS PLAYER (LOCAL)</button>
        </div>

        {/* Status */}
        <div style={styles.statusBar}>
          {status === 'checkmate' && <span style={{ color: '#e91e8c', fontFamily: "'Orbitron', sans-serif", fontSize: '16px', fontWeight: '800' }}>♚ Checkmate! {opp(turn) === 'w' ? 'White' : 'Black'} wins!</span>}
          {status === 'stalemate' && <span style={{ color: 'var(--color-accent)', fontFamily: "'Orbitron', sans-serif", fontSize: '16px', fontWeight: '800' }}>Stalemate — Draw!</span>}
          {status === 'check' && <span style={{ color: '#ff6b35', fontFamily: "'Orbitron', sans-serif", fontSize: '15px', fontWeight: '700' }}>⚠️ {turn === 'w' ? 'White' : 'Black'} is in Check!</span>}
          {status === 'playing' && (
            <span style={{ color: turn === 'w' ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontFamily: "'Rajdhani', sans-serif", fontSize: '15px' }}>
              {turn === 'w' ? '⬜ White' : '⬛ Black'} to move {vsComputer && turn === 'b' ? ' (Thinking...)' : ''}
            </span>
          )}
        </div>

        {/* Captured pieces */}
        <div style={styles.capturedRow}>
          <div style={styles.capturedGroup}>
            {captured.w.map((p,i) => <span key={i} style={{ ...styles.capturedPiece, color: 'var(--color-text-main)' }}>{PIECES[p]}</span>)}
          </div>
          <div style={styles.capturedGroup}>
            {captured.b.map((p,i) => <span key={i} style={{ ...styles.capturedPiece, color: 'var(--color-text-muted)' }}>{PIECES[p]}</span>)}
          </div>
        </div>

        {/* Board */}
        <div style={styles.boardWrap}>
          {/* Rank labels */}
          <div style={styles.rankLabels}>
            {ranks.map(r => <div key={r} style={styles.rankLabel}>{r}</div>)}
          </div>

          <div>
            <div style={{ ...styles.board, borderColor: tokens.border }}>
              {boardR.map(r => boardC.map(c => {
                const piece = board[r][c];
                const light = isLight(r,c);
                const sel = isSelected(r,c);
                const legal = isLegal(r,c);
                const capture = isCapture(r,c);
                const kingInCheck = check && piece && type(piece)==='K' && color(piece)===turn;

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleClick(r,c)}
                    style={{
                      ...styles.cell,
                      background: sel 
                        ? 'var(--color-accent-dim, rgba(99,102,241,0.2))' 
                        : kingInCheck 
                        ? 'rgba(239, 68, 68, 0.4)' 
                        : light 
                        ? 'var(--color-bg-surface)' 
                        : 'var(--color-bg-elevated, #2a2a3a)',
                      border: sel ? '2px solid var(--color-accent)' : '2px solid transparent',
                      cursor: (piece && color(piece)===turn && (!vsComputer || turn==='w')) || legal ? 'pointer' : 'default',
                    }}
                  >
                    {/* Legal move dot */}
                    {legal && !capture && <div style={{ ...styles.legalDot, background: 'var(--color-accent)' }} />}
                    {capture && <div style={{ ...styles.captureDot, borderColor: 'var(--color-accent)' }} />}

                    {piece && (
                      <motion.span
                        style={{
                          ...styles.piece,
                          color: color(piece)==='w' ? '#f0f0f0' : '#1a1a1a',
                          textShadow: color(piece)==='w' ? '0 1px 3px rgba(0,0,0,0.8)' : '0 1px 3px rgba(255,255,255,0.3)',
                          filter: sel ? 'drop-shadow(0 0 8px var(--color-accent))' : 'none',
                        }}
                        whileHover={{ scale: 1.1 }}
                      >
                        {PIECES[piece]}
                      </motion.span>
                    )}
                  </div>
                );
              }))}
            </div>

            {/* File labels */}
            <div style={styles.fileLabels}>
              {files.map(f => <div key={f} style={styles.fileLabel}>{f}</div>)}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          <button onClick={resetGame} style={styles.newBtn}>Reset Game</button>
          <button onClick={() => setFlipped(f=>!f)} style={{ ...styles.flipBtn, color: tokens.textPrimary, borderColor: tokens.border, background: tokens.surface }}>↕ Flip Board</button>
        </div>

        {/* Promotion dialog */}
        <AnimatePresence>
          {promoDialog && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={styles.promoOverlay}>
              <div style={{ ...styles.promoCard, background: tokens.surface, borderColor: tokens.border }}>
                <div style={{ ...styles.promoTitle, color: tokens.accent }}>Choose Promotion</div>
                <div style={styles.promoRow}>
                  {['Q','R','B','N'].map(p => (
                    <button 
                      key={p} 
                      onClick={() => executeMove(promoDialog.fr, promoDialog.fc, promoDialog.tr, promoDialog.tc, p)} 
                      style={{ ...styles.promoBtn, background: tokens.surface, borderColor: tokens.border, color: tokens.textPrimary }}
                    >
                      <span style={styles.promoPiece}>{PIECES[turn+p]}</span>
                      <span style={styles.promoLabel}>{p==='Q'?'Queen':p==='R'?'Rook':p==='B'?'Bishop':'Knight'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Move history */}
        {moveHistory.length > 0 && (
          <div style={{ ...styles.history, background: tokens.surface, borderColor: tokens.border }}>
            <div style={styles.histTitle}>Move History</div>
            <div style={styles.histList}>
              {moveHistory.slice(0,10).map((m,i) => (
                <span key={i} style={{ ...styles.histMove, color: tokens.textPrimary, background: tokens.border }}>{m}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', maxWidth: '480px', margin: '0 auto', color: 'var(--color-text-main)' },
  modeToggle: { display: 'flex', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '4px', width: '100%' },
  mBtn: { flex: 1, background: 'none', border: 'none', borderRadius: '12px', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 'bold', padding: '12px', cursor: 'pointer', transition: 'all 0.2s' },
  mActive: { background: 'var(--color-accent)', color: 'var(--color-bg-main, #000)' },
  statusBar: { minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  capturedRow: { display: 'flex', gap: '16px', minHeight: '24px', flexWrap: 'wrap', justifyContent: 'center' },
  capturedGroup: { display: 'flex', flexWrap: 'wrap', gap: '2px' },
  capturedPiece: { fontSize: '16px', opacity: 0.7 },
  boardWrap: { display: 'flex', gap: '4px', alignItems: 'flex-start' },
  rankLabels: { display: 'flex', flexDirection: 'column', gap: 0 },
  rankLabel: { fontFamily: "'Orbitron', sans-serif", fontSize: '10px', color: 'var(--color-text-muted)', height: 'clamp(40px, 11vw, 56px)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '14px' },
  board: { display: 'grid', gridTemplateColumns: 'repeat(8, clamp(40px, 11vw, 56px))', gridTemplateRows: 'repeat(8, clamp(40px, 11vw, 56px))', border: '2px solid', borderRadius: '4px', overflow: 'hidden' },
  cell: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', },
  legalDot: { position: 'absolute', width: '30%', height: '30%', borderRadius: '50%', opacity: 0.5, pointerEvents: 'none', zIndex: 2 },
  captureDot: { position: 'absolute', inset: '3px', borderRadius: '50%', border: '3px solid', opacity: 0.6, pointerEvents: 'none', zIndex: 2 },
  piece: { fontSize: 'clamp(24px, 7vw, 38px)', lineHeight: 1, userSelect: 'none', position: 'relative', zIndex: 3, transition: 'filter 0.2s' },
  fileLabels: { display: 'flex' },
  fileLabel: { fontFamily: "'Orbitron', sans-serif", fontSize: '10px', color: 'var(--color-text-muted)', width: 'clamp(40px, 11vw, 56px)', textAlign: 'center', paddingTop: '4px' },
  controls: { display: 'flex', gap: '10px' },
  newBtn: {
    background: 'var(--color-accent)', border: 'none', borderRadius: '10px',
    color: 'var(--color-bg-main, #000)', fontFamily: "'Orbitron', sans-serif", fontSize: '13px', fontWeight: '700',
    padding: '11px 22px', cursor: 'pointer', minHeight: '42px', letterSpacing: '0.5px',
  },
  flipBtn: {
    border: '1px solid', borderRadius: '10px',
    fontFamily: "'Rajdhani', sans-serif", fontSize: '14px', fontWeight: '700',
    padding: '11px 18px', cursor: 'pointer', minHeight: '42px',
  },
  promoOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(8px)' },
  promoCard: { border: '1px solid', borderRadius: '20px', padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  promoTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: '18px', fontWeight: '800' },
  promoRow: { display: 'flex', gap: '12px' },
  promoBtn: {
    border: '2px solid', borderRadius: '14px',
    cursor: 'pointer', padding: '12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
    transition: 'all 0.2s', minWidth: '72px',
  },
  promoPiece: { fontSize: '36px', lineHeight: 1 },
  promoLabel: { fontFamily: "'Rajdhani', sans-serif", fontSize: '12px', fontWeight: '600' },
  history: { width: '100%', border: '1px solid', borderRadius: '12px', padding: '12px 16px' },
  histTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' },
  histList: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  histMove: { fontFamily: "'Rajdhani', sans-serif", fontSize: '13px', borderRadius: '6px', padding: '3px 8px' },
};
