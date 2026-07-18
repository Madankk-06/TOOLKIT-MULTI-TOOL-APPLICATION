import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[30, 30], [50, 50], [70, 70]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]],
};

export default function DiceRoller(props?: { standalone?: boolean; count?: number; params?: any; aiPayload?: any; [key: string]: any }) {
  const { standalone = true } = props || {};
  const location = useLocation();
  const [dice, setDice] = useState<number[]>([1]);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    const data = props?.params || props?.aiPayload || location.state?.aiPayload || location.state?.params;
    if (data) {
      if (data.count !== undefined) {
        const n = Math.min(6, Math.max(1, Number(data.count)));
        setDice(Array(n).fill(1));
      }
      if (data.sides !== undefined || data.diceType !== undefined) {
        // Future: support different dice types
      }
    }
  }, [location.state]);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    
    // Simulate physics/animation
    let count = 0;
    const interval = setInterval(() => {
      setDice(prev => prev.map(() => Math.floor(Math.random() * 6) + 1));
      count++;
      if (count > 10) {
        clearInterval(interval);
        const finals = dice.map(() => Math.floor(Math.random() * 6) + 1);
        setDice(finals);
        setRolling(false);
        const sum = finals.reduce((a, b) => a + b, 0);
        setHistory(h => [sum, ...h].slice(0, 5));
      }
    }, 80);
  };

  const addDie = () => dice.length < 6 && setDice([...dice, 1]);
  const removeDie = () => dice.length > 1 && setDice(dice.slice(0, -1));

  const content = (
    <div style={styles.container}>
      <div style={styles.controls}>
        <button onClick={removeDie} style={styles.ctrlBtn} disabled={dice.length <= 1}>-</button>
        <span style={styles.countLabel}>{dice.length} Dice</span>
        <button onClick={addDie} style={styles.ctrlBtn} disabled={dice.length >= 6}>+</button>
      </div>

      <div style={styles.diceArea}>
        <AnimatePresence mode="popLayout">
          {dice.map((v, i) => (
            <Die key={i} value={v} rolling={rolling} />
          ))}
        </AnimatePresence>
      </div>

      <div style={styles.actions}>
        <motion.button 
          onClick={roll} 
          disabled={rolling}
          style={styles.rollBtn}
          whileTap={{ scale: 0.95 }}
        >
          {rolling ? 'ROLLING...' : 'ROLL DICE'}
        </motion.button>
        
        <div style={styles.totalBox}>
          <div style={styles.label}>Sum</div>
          <div style={styles.sum}>{dice.reduce((a, b) => a + b, 0)}</div>
        </div>
      </div>

      {history.length > 0 && (
        <div style={styles.history}>
          <div style={styles.label}>Recent Rolls</div>
          <div style={styles.hList}>
            {history.map((s, i) => (
              <div key={i} style={styles.hItem}>{s}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (!standalone) return content;
  return <ToolWrapper toolName="Dice Roller">{content}</ToolWrapper>;
}

function Die({ value, rolling }: { value: number, rolling: boolean }) {
  const dots = DOT_POSITIONS[value] || DOT_POSITIONS[1];
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0, rotate: -45 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        rotate: rolling ? [0, 90, 180, 270, 360] : 0,
        y: rolling ? [0, -20, 0] : 0
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ duration: 0.3 }}
      style={styles.die}
    >
      <svg viewBox="0 0 100 100" style={styles.dieSvg}>
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="8" fill="var(--color-accent)" />
        ))}
      </svg>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '40px', alignItems: 'center', padding: '40px 20px' },
  controls: { display: 'flex', alignItems: 'center', gap: '20px', background: 'var(--color-bg-surface)', padding: '8px 24px', borderRadius: '32px', border: '1px solid var(--color-border)' },
  ctrlBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', padding: '0 8px' },
  countLabel: { fontSize: '14px', fontWeight: 'bold', color: 'var(--color-accent)', textTransform: 'uppercase' },
  diceArea: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', minHeight: '120px', maxWidth: '300px' },
  die: { width: '80px', height: '80px', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', cursor: 'default' },
  dieSvg: { width: '100%', height: '100%' },
  actions: { display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '240px' },
  rollBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '16px', color: '#fff', fontWeight: 'bold', padding: '18px', cursor: 'pointer', fontSize: '16px', letterSpacing: '1px' },
  totalBox: { textAlign: 'center' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '8px' },
  sum: { fontSize: '48px', fontWeight: '900', color: '#fff' },
  history: { textAlign: 'center' },
  hList: { display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' },
  hItem: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '8px 16px', color: 'var(--color-text-muted)', fontWeight: 'bold' }
};
