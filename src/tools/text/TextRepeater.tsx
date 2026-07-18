import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

const SEPARATORS = [
  { label: 'New Line', value: '\n' },
  { label: 'Space', value: ' ' },
  { label: 'Comma', value: ', ' },
  { label: 'No Separator', value: '' },
  { label: 'Custom...', value: 'custom' },
];

const QUICK_PICKER_ITEMS = [
  '⭐', '🔥', '❤️', '🚀', '👍', '💥', '💡', '⚡', '⚠️', '🍀', 
  '🏁', '✨', '🎉', '💩', '😍', '😂', '✔️', '❌', '💯', '🔔',
  '✿', '✦', '✪', '⬤', '■', '▲', '▼', '◆', '➔', '➜',
  '➕', '➖', '━', '┃', 'divider', ' | ', ' ~ ', ' - ', ' * ', ' # '
];

export default function TextRepeater(props?: any) {
  const location = useLocation();
  const [text, setText] = useState('');
  const [count, setCount] = useState(10);
  const [sepType, setSepType] = useState('\n');
  const [customSep, setCustomSep] = useState(' • ');
  const [copied, setCopied] = useState(false);
  const [showPicker, setShowPicker] = useState(true);
  const [lastFocused, setLastFocused] = useState<'text' | 'sep'>('text');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sepInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const data = props?.params || props?.aiPayload || location.state?.aiPayload || location.state?.params;
    if (data) {
      if (data.text) setText(String(data.text));
      if (data.count !== undefined) setCount(Number(data.count));
      if (data.times !== undefined) setCount(Number(data.times));
      if (data.repeat !== undefined) setCount(Number(data.repeat));
      if (data.separator) {
        const sep = String(data.separator);
        const found = SEPARATORS.find(s => s.value === sep || s.label.toLowerCase() === sep.toLowerCase());
        if (found) setSepType(found.value);
        else { setSepType('custom'); setCustomSep(sep); }
      }
    }
  }, [location.state]);

  const activeSeparator = sepType === 'custom' ? customSep : sepType;

  const result = useMemo(() => {
    if (!text || count < 1) return '';
    if (count > 50000) return 'Limit exceeded (Max 50,000)';
    try {
      return Array(count).fill(text).join(activeSeparator);
    } catch {
      return 'Err: Memory overflow';
    }
  }, [text, count, activeSeparator]);

  const stats = useMemo(() => ({
    chars: result.length,
    words: result.split(/\s+/).filter(Boolean).length,
    bytes: new Blob([result]).size
  }), [result]);

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePick = (symbol: string) => {
    if (lastFocused === 'text') {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText = text.substring(0, start) + symbol + text.substring(end);
        setText(newText);
        // Put focus back and restore cursor
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + symbol.length, start + symbol.length);
        }, 0);
      } else {
        setText(prev => prev + symbol);
      }
    } else {
      const input = sepInputRef.current;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const newSep = customSep.substring(0, start) + symbol + customSep.substring(end);
        setCustomSep(newSep);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + symbol.length, start + symbol.length);
        }, 0);
      } else {
        setCustomSep(prev => prev + symbol);
      }
    }
  };

  return (
    <ToolWrapper toolName="Text Repeater">
      <div style={styles.container}>
        <div style={styles.configArea}>
          <div style={styles.inputBox}>
            <div style={styles.label}>Text to repeat</div>
            <textarea 
              ref={textareaRef}
              value={text} 
              onFocus={() => setLastFocused('text')}
              onChange={e => setText(e.target.value)} 
              placeholder="Enter text, emojis, or symbols..." 
              style={styles.textarea}
            />
          </div>

          <div style={styles.controls}>
            <div style={styles.param}>
              <div style={styles.row}>
                <span style={styles.label}>Repeats</span>
                <span style={styles.val}>{count.toLocaleString()}</span>
              </div>
              <input 
                type="range" min="1" max="1000" value={Math.min(count, 1000)} 
                onChange={e => setCount(Number(e.target.value))} 
                style={styles.slider}
              />
              <div style={styles.quickGrid}>
                {[10, 100, 500, 1000].map(n => (
                  <button key={n} onClick={() => setCount(n)} style={styles.qBtn}>{n}</button>
                ))}
              </div>
            </div>

            <div style={styles.param}>
              <div style={styles.label}>Separator</div>
              <div style={styles.sepGrid}>
                {SEPARATORS.map(s => (
                  <button 
                    key={s.label} 
                    onClick={() => setSepType(s.value)}
                    style={{ ...styles.sBtn, ...(sepType === s.value ? styles.sActive : {}) }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {sepType === 'custom' && (
                <div style={styles.customSepBox}>
                  <label style={styles.label}>Custom Separator String</label>
                  <input 
                    ref={sepInputRef}
                    type="text" 
                    value={customSep} 
                    onFocus={() => setLastFocused('sep')}
                    onChange={e => setCustomSep(e.target.value)}
                    style={styles.customSepInput}
                    placeholder="Enter custom separator"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Quick Picker Drawer */}
          <div style={styles.pickerSection}>
            <button 
              type="button" 
              onClick={() => setShowPicker(!showPicker)} 
              style={styles.pickerToggle}
            >
              <span>✨ Emojis & Symbols Quick Picker</span>
              <span>{showPicker ? '▲' : '▼'}</span>
            </button>
            
            <AnimatePresence>
              {showPicker && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={styles.pickerDrawer}
                >
                  <div style={styles.pickerInfo}>
                    Inserting into: <strong style={{ color: 'var(--color-accent)' }}>{lastFocused === 'text' ? 'Main Text' : 'Custom Separator'}</strong> (Click input to swap)
                  </div>
                  <div style={styles.symbolGrid}>
                    {QUICK_PICKER_ITEMS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePick(item)}
                        style={styles.symbolBtn}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={styles.outputArea}>
            <div style={styles.statGrid}>
              <div style={styles.stat}>
                <div style={styles.statVal}>{stats.chars.toLocaleString()}</div>
                <div style={styles.statLab}>Chars</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statVal}>{stats.words.toLocaleString()}</div>
                <div style={styles.statLab}>Words</div>
              </div>
              <div style={styles.stat}>
                <div style={styles.statVal}>{(stats.bytes / 1024).toFixed(1)} KB</div>
                <div style={styles.statLab}>Size</div>
              </div>
            </div>

            <div style={styles.resBox}>
              <div style={styles.resHeader}>
                <span>Preview (Truncated after 10k chars)</span>
                <button onClick={copy} style={styles.copyBtn}>
                  {copied ? '✓ COPIED' : 'COPY ALL'}
                </button>
              </div>
              <div style={styles.preview}>
                {result.length > 10000 ? result.slice(0, 10000) + '\n... [Truncated]' : result}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px', maxWidth: '600px', margin: '0 auto', color: 'var(--color-text-main)' },
  configArea: { display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px' },
  inputBox: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' },
  textarea: { width: '100%', background: 'var(--color-bg-elevated, #2D3748)', border: '1px solid var(--color-border)', borderRadius: '14px', color: 'var(--color-text-main)', padding: '14px', fontSize: '15px', minHeight: '100px', outline: 'none', resize: 'vertical' },
  controls: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  param: { display: 'flex', flexDirection: 'column', gap: '12px' },
  row: { display: 'flex', justifyContent: 'space-between' },
  val: { color: 'var(--color-accent)', fontWeight: 'bold' },
  slider: { width: '100%', accentColor: 'var(--color-accent)' },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' },
  qBtn: { background: 'var(--color-bg-elevated, #2D3748)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-main)', padding: '6px 2px', fontSize: '11px', cursor: 'pointer', textAlign: 'center' },
  sepGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '6px' },
  sBtn: { background: 'var(--color-bg-elevated, #2D3748)', border: '1px solid var(--color-border)', borderRadius: '10px', color: 'var(--color-text-muted)', padding: '10px', fontSize: '12px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' },
  sActive: { borderColor: 'var(--color-accent)', color: 'var(--color-accent)', background: 'var(--color-bg-elevated, rgba(99, 102, 241, 0.05))' },
  customSepBox: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' },
  customSepInput: { background: 'var(--color-bg-elevated, #2D3748)', border: '1px solid var(--color-border)', borderRadius: '10px', color: 'var(--color-text-main)', padding: '10px', fontSize: '14px', outline: 'none' },
  
  // Picker Drawer
  pickerSection: { display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border)', borderRadius: '16px', overflow: 'hidden' },
  pickerToggle: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-elevated, #2D3748)', border: 'none', padding: '12px 16px', color: 'var(--color-text-main)', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  pickerDrawer: { padding: '12px', background: 'var(--color-bg-surface)', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' },
  pickerInfo: { fontSize: '11px', color: 'var(--color-text-muted)' },
  symbolGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  symbolBtn: { background: 'var(--color-bg-elevated, #2D3748)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text-main)', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', transition: 'all 0.1s' },
  
  outputArea: { display: 'flex', flexDirection: 'column', gap: '20px' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  stat: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '16px', textAlign: 'center' },
  statVal: { fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text-main)' },
  statLab: { fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' },
  resBox: { background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  resHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)' },
  copyBtn: { background: 'var(--color-accent)', border: 'none', borderRadius: '10px', color: 'var(--color-bg-main, #000)', padding: '8px 16px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  preview: { background: 'var(--color-bg-elevated, #2D3748)', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '16px', fontSize: '14px', lineHeight: '1.6', color: 'var(--color-text-main)', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto', fontFamily: 'monospace' }
};
