import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

const BUTTONS = [
  ['C', '(', ')', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', '=']
];

const SCI_BUTTONS = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', '^', 'pi', 'e'];

export default function Calculator(props?: any) {
  const [display, setDisplay] = useState('0');
  const [history, setHistory] = useState<string[]>([]);
  const [scientific, setScientific] = useState(false);
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
    if (data && data.expression) {
      let expr = String(data.expression).trim();
      expr = expr.replace(/x/g, '*').replace(/=/g, '');
      if (expr) {
        setDisplay(expr);
        try {
          let mathExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
          mathExpr = mathExpr.replace(/sin/g, 'Math.sin').replace(/cos/g, 'Math.cos').replace(/tan/g, 'Math.tan');
          mathExpr = mathExpr.replace(/log/g, 'Math.log10').replace(/ln/g, 'Math.log').replace(/sqrt/g, 'Math.sqrt');
          mathExpr = mathExpr.replace(/pi/g, 'Math.PI').replace(/e/g, 'Math.E').replace(/\^/g, '**');

          const result = new Function(`return ${mathExpr}`)();
          const resStr = Number.isFinite(result) ? String(Number(result.toPrecision(10))) : 'Error';
          setHistory([expr + ' = ' + resStr]);
          setDisplay(resStr);
        } catch {
          setDisplay('Error');
        }
      }
    }
  }, [location.state]);

  const handleBtn = (btn: string) => {
    if (btn === 'C') {
      setDisplay('0');
    } else if (btn === '⌫') {
      setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (btn === '=') {
      try {
        // Safe evaluation (using a simple parser or just Math functions)
        // For production, a math parser like mathjs is better, but here we can clean and use Function
        let expr = display.replace(/×/g, '*').replace(/÷/g, '/');
        expr = expr.replace(/sin/g, 'Math.sin').replace(/cos/g, 'Math.cos').replace(/tan/g, 'Math.tan');
        expr = expr.replace(/log/g, 'Math.log10').replace(/ln/g, 'Math.log').replace(/sqrt/g, 'Math.sqrt');
        expr = expr.replace(/pi/g, 'Math.PI').replace(/e/g, 'Math.E').replace(/\^/g, '**');

        const result = new Function(`return ${expr}`)();
        const resStr = Number.isFinite(result) ? String(Number(result.toPrecision(10))) : 'Error';
        setHistory(prev => [display + ' = ' + resStr, ...prev.slice(0, 9)]);
        setDisplay(resStr);
      } catch (e) {
        setDisplay('Error');
      }
    } else {
      setDisplay(prev => {
        if (prev === '0' || prev === 'Error') return btn;
        return prev + btn;
      });
    }
  };

  return (
    <ToolWrapper toolName="Scientific Calculator">
      <div style={styles.container}>
        <div style={styles.calc}>
          <div style={styles.screen}>
            <div style={styles.history}>
              {history[0] || ''}
            </div>
            <div style={styles.display}>
              {display}
            </div>
          </div>

          <div style={styles.controls}>
            <button 
              onClick={() => setScientific(!scientific)} 
              style={{ ...styles.modeBtn, color: scientific ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
            >
              {scientific ? 'BASIC' : 'SCIENTIFIC'}
            </button>
          </div>

          <div style={styles.gridContainer}>
            <AnimatePresence>
              {scientific && (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                  style={styles.sciGrid}
                >
                  {SCI_BUTTONS.map(b => (
                    <button key={b} onClick={() => handleBtn(b + '(')} style={styles.btnSci}>{b}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div style={styles.mainGrid}>
              {BUTTONS.flat().map(b => (
                <motion.button 
                  key={b} onClick={() => handleBtn(b)} 
                  style={{ 
                    ...styles.btn, 
                    ...(b === '=' ? styles.btnEq : {}),
                    ...(isNaN(Number(b)) && b !== '.' ? styles.btnOp : {})
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  {b}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {history.length > 1 && (
          <div style={styles.historyCard}>
            <div style={styles.historyTitle}>Recent History</div>
            {history.slice(1).map((h, i) => (
              <div key={i} style={styles.historyRow}>{h}</div>
            ))}
          </div>
        )}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px', margin: '0 auto', padding: '20px' },
  calc: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '28px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' },
  screen: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minHeight: '100px', justifyContent: 'center' },
  history: { fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', fontFamily: 'monospace' },
  display: { fontSize: '32px', fontWeight: 'bold', color: '#fff', wordBreak: 'break-all', textAlign: 'right' },
  controls: { display: 'flex', justifyContent: 'flex-end' },
  modeBtn: { background: 'none', border: 'none', fontSize: '10px', fontWeight: '900', cursor: 'pointer', letterSpacing: '1px' },
  gridContainer: { display: 'flex', gap: '12px' },
  sciGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', overflow: 'hidden' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', flex: 1 },
  btn: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '14px', color: '#fff', fontSize: '18px', fontWeight: 'bold', height: '60px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnSci: { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: '10px', color: 'var(--color-text-muted)', fontSize: '12px', height: '40px', cursor: 'pointer', width: '60px' },
  btnOp: { color: 'var(--color-accent)' },
  btnEq: { background: 'var(--color-accent)', color: '#fff', border: 'none' },
  historyCard: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '20px' },
  historyTitle: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '12px' },
  historyRow: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontFamily: 'monospace' }
};
