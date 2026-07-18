import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type ConvType = 'binary' | 'hex' | 'base64' | 'ascii';

const CONVERTERS: Record<ConvType, { name: string; to: (s: string) => string; from: (s: string) => string }> = {
  binary: {
    name: 'Binary',
    to: (s) => s.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' '),
    from: (s) => s.split(/\s+/).map(b => String.fromCharCode(parseInt(b, 2))).join('')
  },
  hex: {
    name: 'Hex',
    to: (s) => s.split('').map(c => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join(' '),
    from: (s) => s.split(/\s+/).map(h => String.fromCharCode(parseInt(h, 16))).join('')
  },
  base64: {
    name: 'Base64',
    to: (s) => btoa(s),
    from: (s) => atob(s)
  },
  ascii: {
    name: 'ASCII',
    to: (s) => s.split('').map(c => c.charCodeAt(0)).join(' '),
    from: (s) => s.split(/\s+/).map(n => String.fromCharCode(parseInt(n))).join('')
  }
};

export default function TextToBinary(props?: any) {
  const location = useLocation();
  const [input, setInput] = useState('');
  const [type, setType] = useState<ConvType>('binary');
  const [isEncode, setIsEncode] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const data = props?.params || props?.aiPayload || location.state?.aiPayload || location.state?.params;
    if (data) {
      if (data.text) setInput(String(data.text));
      // Support 'binary', 'hex', 'base64', 'ascii' types
      const convType = data.type || data.format || data.conversion;
      if (convType && Object.keys(CONVERTERS).includes(String(convType).toLowerCase())) {
        setType(String(convType).toLowerCase() as ConvType);
      }
      if (data.mode === 'decode' || data.decode === true) setIsEncode(false);
    }
  }, [location.state]);

  const result = useMemo(() => {
    if (!input) return '';
    try {
      return isEncode ? CONVERTERS[type].to(input) : CONVERTERS[type].from(input);
    } catch {
      return 'Err: Invalid input format';
    }
  }, [input, type, isEncode]);

  return (
    <ToolWrapper toolName="Text Converter">
      <div style={styles.container}>
        <div style={styles.tabs}>
          {(Object.keys(CONVERTERS) as ConvType[]).map(t => (
            <button 
              key={t} 
              onClick={() => setType(t)}
              style={{ ...styles.tab, ...(type === t ? styles.tabActive : {}) }}
            >
              {CONVERTERS[t].name}
            </button>
          ))}
        </div>

        <div style={styles.direction}>
          <button 
            onClick={() => setIsEncode(true)}
            style={{ ...styles.dirBtn, ...(isEncode ? styles.dirActive : {}) }}
          >
            TEXT TO {type.toUpperCase()}
          </button>
          <button 
            onClick={() => setIsEncode(false)}
            style={{ ...styles.dirBtn, ...(!isEncode ? styles.dirActive : {}) }}
          >
            {type.toUpperCase()} TO TEXT
          </button>
        </div>

        <div style={styles.ioArea}>
          <div style={styles.box}>
            <div style={styles.label}>{isEncode ? 'Plain Text' : CONVERTERS[type].name}</div>
            <textarea 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder={isEncode ? 'Type text...' : `Type ${type}...`} 
              style={styles.textarea}
            />
          </div>

          <div style={styles.box}>
            <div style={styles.resHeader}>
              <span style={styles.label}>Result</span>
              {result && !result.startsWith('Err') && (
                <button onClick={() => { navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={styles.copyBtn}>
                  {copied ? '✓ COPIED' : 'COPY'}
                </button>
              )}
            </div>
            <div style={{ ...styles.textarea, ...styles.output, background: 'var(--color-bg-elevated)', color: result.startsWith('Err') ? '#EF4444' : '#fff' }}>
              {result || 'Output will appear here...'}
            </div>
          </div>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '32px', padding: '20px', maxWidth: '640px', margin: '0 auto' },
  tabs: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' },
  tab: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 'bold', padding: '10px 20px', cursor: 'pointer', whiteSpace: 'nowrap' },
  tabActive: { background: 'var(--color-accent)', color: '#fff', borderColor: 'var(--color-accent)' },
  direction: { display: 'flex', gap: '10px', background: 'var(--color-bg-surface)', padding: '6px', borderRadius: '14px', border: '1px solid var(--color-border)' },
  dirBtn: { flex: 1, background: 'none', border: 'none', borderRadius: '10px', color: 'var(--color-text-muted)', fontSize: '11px', fontWeight: 'bold', padding: '10px', cursor: 'pointer' },
  dirActive: { background: 'var(--color-bg-elevated)', color: 'var(--color-accent)' },
  ioArea: { display: 'flex', flexDirection: 'column', gap: '20px' },
  box: { display: 'flex', flexDirection: 'column', gap: '10px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  textarea: { width: '100%', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', color: '#fff', padding: '16px', fontSize: '15px', minHeight: '120px', outline: 'none', resize: 'vertical', fontFamily: 'monospace' },
  output: { borderStyle: 'dashed' },
  resHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  copyBtn: { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', color: '#fff', padding: '6px 14px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }
};
