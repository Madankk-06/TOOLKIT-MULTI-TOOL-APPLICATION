import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';

const TYPES = [
  { id: 'url', label: 'URL', placeholder: 'https://example.com' },
  { id: 'text', label: 'Text', placeholder: 'Enter any message...' },
  { id: 'wifi', label: 'WiFi', placeholder: 'SSID:Password' },
  { id: 'vcard', label: 'Contact', placeholder: 'Name;Phone;Email' },
];

export default function QRGenerator(props?: any) {
  const { tokens } = useTheme();
  const location = useLocation();
  
  // Persistent inputs stored in localStorage
  const [text, setText] = useState(() => localStorage.getItem('qr-gen-text') || '');
  const [type, setType] = useState(() => localStorage.getItem('qr-gen-type') || 'url');
  
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Prefill from chatbot navigation state
  useEffect(() => {
    const data = props?.params || props?.aiPayload || location.state?.aiPayload || location.state?.params;
    if (data) {
      if (data.text || data.url || data.content || data.data) {
        setText(String(data.text || data.url || data.content || data.data));
      }
      if (data.type) {
        const qrType = String(data.type).toLowerCase();
        const validTypes = TYPES.map(t => t.id);
        if (validTypes.includes(qrType)) setType(qrType);
      }
    }
  }, [location.state]);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('qr-gen-text', text);
    localStorage.setItem('qr-gen-type', type);
  }, [text, type]);

  useEffect(() => {
    const generate = async () => {
      if (!text.trim()) {
        setQrDataUrl('');
        return;
      }
      setLoading(true);
      try {
        let content = text;
        if (type === 'wifi') {
          const [ssid, pass] = text.split(':');
          content = `WIFI:T:WPA;S:${ssid};P:${pass || ''};;`;
        } else if (type === 'vcard') {
          const [name, phone, email] = text.split(';');
          content = `BEGIN:VCARD\nVERSION:3.0\nN:${name}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`;
        }

        const url = await QRCode.toDataURL(content, {
          width: 600,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(generate, 300);
    return () => clearTimeout(timer);
  }, [text, type]);

  const download = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr-code-${Date.now()}.png`;
    link.click();
  };

  return (
    <ToolWrapper toolName="QR Generator">
      <div style={styles.container}>
        <div style={{ ...styles.card, background: tokens.surface, borderColor: tokens.border }}>
          <div style={styles.typeTabs}>
            {TYPES.map(t => (
              <button 
                key={t.id} 
                onClick={() => { setType(t.id); }} // Keep text so they can see dynamic conversion!
                style={{ 
                  ...styles.tab, 
                  background: type === t.id ? tokens.accent : tokens.inputBg, 
                  borderColor: type === t.id ? tokens.accent : tokens.border,
                  color: type === t.id ? '#ffffff' : tokens.textSecondary
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={styles.inputArea}>
            <label style={{ ...styles.label, color: tokens.textSecondary }}>{TYPES.find(t => t.id === type)?.label} Content</label>
            <textarea
              value={text} 
              onChange={e => setText(e.target.value)}
              placeholder={TYPES.find(t => t.id === type)?.placeholder}
              style={{ ...styles.textarea, background: tokens.inputBg, color: tokens.textPrimary, borderColor: tokens.border }}
            />
          </div>
        </div>

        <div style={{ ...styles.previewCard, background: tokens.surface, borderColor: tokens.border }}>
          <div style={styles.qrContainer}>
            {qrDataUrl ? (
              <motion.img 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                src={qrDataUrl} 
                alt="QR Code" 
                style={styles.qrImg} 
              />
            ) : (
              <div style={styles.placeholder}>Type details above to render QR</div>
            )}
          </div>
          
          <motion.button 
            onClick={download} 
            disabled={!qrDataUrl || loading}
            style={{ ...styles.downloadBtn, background: tokens.accent, opacity: qrDataUrl ? 1 : 0.4 }}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? 'Generating...' : 'Download PNG'}
          </motion.button>
        </div>

        <p style={{ ...styles.hint, color: tokens.textSecondary }}>
          {type === 'wifi' && "Format: NetworkSSID:Password"}
          {type === 'vcard' && "Format: Name;PhoneNumber;Email"}
        </p>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '440px', margin: '0 auto', padding: '10px' },
  card: { border: '1px solid', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  typeTabs: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' },
  tab: { padding: '10px 4px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid', transition: 'all 0.2s' },
  inputArea: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' },
  textarea: { border: '1px solid', borderRadius: '12px', padding: '14px', fontSize: '14px', minHeight: '100px', outline: 'none', resize: 'none' },
  previewCard: { border: '1px solid', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' },
  qrContainer: { width: '220px', height: '220px', background: '#fff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
  qrImg: { width: '100%', height: '100%', objectFit: 'contain' },
  placeholder: { color: '#888', fontSize: '13px', textAlign: 'center', opacity: 0.8 },
  downloadBtn: { width: '100%', border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 'bold', padding: '16px', cursor: 'pointer' },
  hint: { fontSize: '11px', textAlign: 'center', opacity: 0.7 }
};
