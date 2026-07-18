import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

const CHAR_SETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}|;:,.<>?",
};

type Strength = {
  label: string;
  color: string;
  width: number;
};

export default function PasswordGenerator(props?: { standalone?: boolean; params?: any; aiPayload?: any; [key: string]: any }) {
  const { standalone = true } = props || {};
  const location = useLocation();
  const [length, setLength] = useState(16);
  const [opts, setOpts] = useState({ upper: true, lower: true, numbers: true, symbols: true });
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const data = props?.params || props?.aiPayload || location.state?.aiPayload || location.state?.params;
    if (data) {
      if (data.length !== undefined) setLength(Number(data.length));
      const newOpts = { ...opts };
      if (data.uppercase !== undefined) newOpts.upper = Boolean(data.uppercase);
      if (data.lowercase !== undefined) newOpts.lower = Boolean(data.lowercase);
      if (data.numbers !== undefined) newOpts.numbers = Boolean(data.numbers);
      if (data.symbols !== undefined || data.special !== undefined) {
        newOpts.symbols = Boolean(data.symbols ?? data.special);
      }
      setOpts(newOpts);
    }
  }, [location.state]);

  const getStrength = (pw: string): Strength => {
    let score = 0;
    if (pw.length >= 12) score++;
    if (pw.length >= 16) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    
    if (score <= 2) return { label: 'Weak', color: '#EF4444', width: 25 };
    if (score <= 4) return { label: 'Fair', color: '#F59E0B', width: 50 };
    if (score <= 5) return { label: 'Strong', color: '#10B981', width: 75 };
    return { label: 'Master', color: 'var(--color-accent)', width: 100 };
  };

  const generate = useCallback(() => {
    const active = Object.entries(opts).filter(([_, v]) => v).map(([k]) => k as keyof typeof CHAR_SETS);
    if (active.length === 0) return;

    let pool = active.map(k => CHAR_SETS[k]).join('');
    let result = active.map(k => {
      const set = CHAR_SETS[k];
      return set[Math.floor(Math.random() * set.length)];
    });

    for (let i = result.length; i < length; i++) {
      result.push(pool[Math.floor(Math.random() * pool.length)]);
    }

    // Shuffle
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    setPassword(result.join(''));
    setCopied(false);
  }, [length, opts]);

  const copy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = password ? getStrength(password) : null;

  const content = (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.lengthArea}>
          <div style={styles.row}>
            <span style={styles.label}>Length</span>
            <span style={styles.lenVal}>{length}</span>
          </div>
          <input 
            type="range" min="8" max="64" value={length} 
            onChange={e => setLength(Number(e.target.value))} 
            style={styles.slider} 
          />
        </div>

        <div style={styles.grid}>
          {Object.keys(opts).map(k => (
            <button 
              key={k} 
              onClick={() => setOpts(o => ({ ...o, [k]: !o[k as keyof typeof opts] }))}
              style={{ ...styles.optBtn, ...(opts[k as keyof typeof opts] ? styles.optActive : {}) }}
            >
              {k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        <motion.button onClick={generate} style={styles.genBtn} whileTap={{ scale: 0.97 }}>
          Generate Secure Key
        </motion.button>
      </div>

      <AnimatePresence>
        {password && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={styles.resArea}>
            {strength && (
              <div style={styles.strengthBox}>
                <div style={styles.row}>
                  <span style={styles.label}>Strength: {strength.label}</span>
                </div>
                <div style={styles.track}>
                  <motion.div animate={{ width: `${strength.width}%`, background: strength.color }} style={styles.fill} />
                </div>
              </div>
            )}

            <div style={styles.pwBox}>
              <div style={styles.pwText}>{password}</div>
              <button onClick={copy} style={styles.copyBtn}>
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (!standalone) return content;
  return <ToolWrapper toolName="Password Generator">{content}</ToolWrapper>;
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '440px', margin: '0 auto', padding: '20px' },
  card: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' },
  lengthArea: { display: 'flex', flexDirection: 'column', gap: '12px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  lenVal: { fontSize: '24px', fontWeight: '900', color: 'var(--color-accent)' },
  slider: { width: '100%', accentColor: 'var(--color-accent)', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  optBtn: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', color: 'var(--color-text-muted)', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' },
  optActive: { background: 'rgba(99, 102, 241, 0.1)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' },
  genBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer', fontSize: '15px' },
  resArea: { display: 'flex', flexDirection: 'column', gap: '16px' },
  strengthBox: { display: 'flex', flexDirection: 'column', gap: '8px' },
  track: { height: '6px', background: 'var(--color-bg-elevated)', borderRadius: '3px', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: '3px' },
  pwBox: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' },
  pwText: { fontSize: '16px', color: '#fff', fontWeight: 'bold', wordBreak: 'break-all', fontFamily: 'monospace' },
  copyBtn: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', color: '#fff', padding: '8px 16px', cursor: 'pointer', fontSize: '12px' }
};
