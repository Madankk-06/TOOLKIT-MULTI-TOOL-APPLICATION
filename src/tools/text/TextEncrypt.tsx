import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import SkeuomorphicToggle from '../../components/SkeuomorphicToggle';

type CipherEngine = {
  name: string;
  description: string;
  hasShift?: boolean;
  hasKey?: boolean;
  isHash?: boolean;
  fn: (text: string, params: { shift?: number; key?: string; isDecrypt?: boolean }) => string;
};

const ENGINES: Record<string, CipherEngine> = {
  caesar: {
    name: 'Caesar',
    description: 'Ancient shift cipher (A → D)',
    hasShift: true,
    fn: (text, { shift = 3, isDecrypt = false }) => {
      const realShift = isDecrypt ? (26 - (shift % 26)) % 26 : shift % 26;
      return text.replace(/[a-zA-Z]/g, c => {
        const base = c >= 'a' ? 97 : 65;
        return String.fromCharCode(((c.charCodeAt(0) - base + realShift) % 26) + base);
      });
    }
  },
  base64: {
    name: 'Base64',
    description: 'Binary-to-text encoding scheme',
    fn: (text, { isDecrypt = false }) => {
      if (isDecrypt) {
        try {
          return atob(text);
        } catch {
          return 'Err: Invalid Base64 content';
        }
      }
      try {
        return btoa(text);
      } catch {
        return 'Err: Cannot encode binary content';
      }
    }
  },
  reverse: {
    name: 'Reverse',
    description: 'Flips text character by character',
    fn: (text) => text.split('').reverse().join('')
  },
  morse: {
    name: 'Morse',
    description: 'Dots and dashes telecommunication',
    fn: (text, { isDecrypt = false }) => {
      const MAP: Record<string, string> = { 'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----', ' ': '/' };
      if (isDecrypt) {
        const REVERSE_MORSE = Object.fromEntries(Object.entries(MAP).map(([k, v]) => [v, k]));
        return text.split(' ').map(code => REVERSE_MORSE[code] || (code === '/' ? ' ' : code)).join('');
      }
      return text.toUpperCase().split('').map(c => MAP[c] || (c === ' ' ? '/' : '')).join(' ');
    }
  }
};

export default function TextEncrypt(props?: any) {
  const location = useLocation();
  const [input, setInput] = useState('');
  const [method, setMethod] = useState('caesar');
  const [shift, setShift] = useState(3);
  const [key, setKey] = useState('');
  const [isDecrypt, setIsDecrypt] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const data = props?.params || props?.aiPayload || location.state?.aiPayload || location.state?.params;
    if (data) {
      if (data.text) setInput(String(data.text));
      if (data.method && ENGINES[data.method]) setMethod(String(data.method));
      if (data.cipher && ENGINES[data.cipher]) setMethod(String(data.cipher));
      if (data.shift !== undefined) setShift(Number(data.shift));
      if (data.key) setKey(String(data.key));
      if (data.mode === 'decrypt') setIsDecrypt(true);
    }
  }, [location.state]);

  const output = useMemo(() => {
    if (!input) return '';
    try {
      return ENGINES[method].fn(input, { shift, key, isDecrypt });
    } catch {
      return 'Err: Logic mismatch';
    }
  }, [input, method, shift, key, isDecrypt]);

  return (
    <ToolWrapper toolName="Text Encryption">
      <div style={styles.container}>
        <div style={styles.configArea}>
          <div style={styles.methodGrid}>
            {Object.entries(ENGINES).map(([id, eng]) => (
              <button 
                key={id} 
                onClick={() => setMethod(id)}
                style={{ ...styles.mBtn, ...(method === id ? styles.mActive : {}) }}
              >
                <div style={styles.mName}>{eng.name}</div>
                <div style={styles.mDesc}>{eng.description}</div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ ...styles.paramBox, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '170px' }}>
              <div style={{ ...styles.label, marginBottom: '4px' }}>
                Mode: {isDecrypt ? 'Decrypt' : 'Encrypt'}
              </div>
              <SkeuomorphicToggle 
                checked={isDecrypt} 
                onChange={setIsDecrypt} 
                uncheckedLabel="+" 
                checkedLabel="–" 
                size={84}
              />
            </div>

            {ENGINES[method].hasShift && (
              <div style={{ ...styles.paramBox, flex: 1, minWidth: '200px' }}>
                <div style={styles.row}>
                  <span style={styles.label}>Shift Amount</span>
                  <span style={styles.val}>{shift}</span>
                </div>
                <input 
                  type="range" min="1" max="25" value={shift} 
                  onChange={e => setShift(Number(e.target.value))} 
                  style={styles.slider}
                />
              </div>
            )}
          </div>
        </div>

        <div style={styles.ioArea}>
          <div style={styles.box}>
            <div style={styles.boxHeader}>Input Content</div>
            <textarea 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder={isDecrypt ? "Enter encrypted cipher text..." : "Type your secret message..."} 
              style={styles.textarea}
            />
          </div>

          <div style={styles.box}>
            <div style={styles.boxHeader}>
              <span>Result</span>
              {output && (
                <button 
                  onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }} 
                  style={styles.copyBtn}
                >
                  {copied ? '✓' : 'Copy'}
                </button>
              )}
            </div>
            <div style={{ ...styles.textarea, ...styles.output, background: 'var(--color-bg-elevated)', color: output ? '#fff' : 'var(--color-text-muted)' }}>
              {output || 'Output will appear here...'}
            </div>
          </div>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '32px', padding: '20px' },
  configArea: { display: 'flex', flexDirection: 'column', gap: '20px' },
  methodGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' },
  mBtn: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' },
  mActive: { borderColor: 'var(--color-accent)', background: 'rgba(99, 102, 241, 0.05)' },
  mName: { fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' },
  mDesc: { fontSize: '10px', color: 'var(--color-text-muted)', lineHeight: '1.4' },
  paramBox: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px' },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  val: { color: 'var(--color-accent)', fontWeight: 'bold' },
  slider: { width: '100%', accentColor: 'var(--color-accent)' },
  ioArea: { display: 'flex', flexDirection: 'column', gap: '16px' },
  box: { display: 'flex', flexDirection: 'column', gap: '8px' },
  boxHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', paddingLeft: '4px' },
  textarea: { width: '100%', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', color: '#fff', padding: '16px', fontSize: '14px', minHeight: '120px', outline: 'none', resize: 'vertical', fontFamily: 'monospace' },
  output: { borderStyle: 'dashed' },
  copyBtn: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '6px', color: '#fff', padding: '4px 12px', fontSize: '10px', cursor: 'pointer' }
};
