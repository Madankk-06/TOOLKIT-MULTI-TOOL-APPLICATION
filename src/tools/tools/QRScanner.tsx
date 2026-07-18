import React, { useEffect, useRef, useState } from 'react';
import ToolWrapper from '../../components/ToolWrapper';
import { motion, AnimatePresence } from 'framer-motion';
import QrScanner from 'qr-scanner';
import { useTheme } from '../../context/ThemeContext';

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  
  const { tokens } = useTheme();
  const [result, setResult] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const startScan = async () => {
    setError('');
    setResult('');
    try {
      if (videoRef.current) {
        const qrScanner = new QrScanner(
          videoRef.current,
          (res) => {
            handleMatch(res.data);
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            onDecodeError: () => {
              // Ignore standard decode errors while sweeping for codes
            }
          }
        );
        qrScannerRef.current = qrScanner;
        await qrScanner.start();
        setScanning(true);
        
        // Check for flashlight availability on the active camera stream
        const hasFlash = await qrScanner.hasFlash();
        setTorchSupported(hasFlash);
      }
    } catch (e) {
      setError('Camera access denied or failed. Please allow camera permission.');
      setScanning(false);
    }
  };

  const handleMatch = (val: string) => {
    setResult(val);
    setHistory(h => [val, ...h.filter(x => x !== val)].slice(0, 10));
    stopScan();
  };

  const stopScan = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setScanning(false);
    setTorch(false);
  };

  const toggleTorch = async () => {
    if (!qrScannerRef.current) return;
    try {
      await qrScannerRef.current.toggleFlash();
      const isFlashOn = qrScannerRef.current.isFlashOn();
      setTorch(isFlashOn);
    } catch (err) {
      setError("Failed to control camera flash.");
    }
  };

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      handleMatch(manualInput.trim());
      setManualInput('');
    }
  };

  const isUrl = (s: string) => {
    try {
      new URL(s);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <ToolWrapper toolName="QR Scanner">
      <div style={styles.container}>
        <div style={{ ...styles.cameraBox, borderColor: tokens.border }}>
          <video ref={videoRef} style={{ ...styles.video, display: scanning ? 'block' : 'none' }} playsInline muted />
          {!scanning && (
            <div style={styles.placeholder}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect x="8" y="8" width="18" height="18" rx="2" stroke={tokens.accent} strokeWidth="2" />
                <rect x="38" y="8" width="18" height="18" rx="2" stroke={tokens.accent} strokeWidth="2" />
                <rect x="8" y="38" width="18" height="18" rx="2" stroke={tokens.accent} strokeWidth="2" />
                <path d="M40 40h6v6h-6zM50 40h6v6h-6zM40 50h6v6h-6zM50 50h6v6h-6z" fill={tokens.accent} />
              </svg>
              <p style={{ ...styles.placeholderText, color: tokens.textSecondary }}>Point camera at QR code</p>
            </div>
          )}
          {scanning && <div style={{ ...styles.scanLine, background: `linear-gradient(90deg, transparent, ${tokens.accent}, transparent)`, boxShadow: `0 0 8px ${tokens.accent}` }} />}
        </div>

        {error && <div style={styles.error} aria-live="polite">{error}</div>}

        <div style={styles.btnRow}>
          {!scanning ? (
            <motion.button onClick={startScan} style={{ ...styles.btn, background: `linear-gradient(135deg, ${tokens.accent}, #8B5CF6)` }} whileTap={{ scale: 0.97 }}>
              📷 Start Camera
            </motion.button>
          ) : (
            <>
              {torchSupported && (
                <motion.button onClick={toggleTorch} style={{ ...styles.secondaryBtn, background: tokens.inputBg, borderColor: tokens.border, color: tokens.textPrimary }} whileTap={{ scale: 0.97 }}>
                  {torch ? '🔦 Torch Off' : '🔦 Torch On'}
                </motion.button>
              )}
              <motion.button onClick={stopScan} style={styles.stopBtn} whileTap={{ scale: 0.97 }}>
                ⏹ Stop
              </motion.button>
            </>
          )}
        </div>

        {!scanning && (
          <div style={styles.manualRow}>
            <input
              type="text"
              placeholder="Or enter code manually..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              style={{ ...styles.manualInput, background: tokens.inputBg, color: tokens.textPrimary, borderColor: tokens.border }}
            />
            <button onClick={handleManualSubmit} style={{ ...styles.manualBtn, background: tokens.surface, color: tokens.accent, borderColor: tokens.border }}>Add</button>
          </div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ ...styles.resultCard, background: tokens.surface, borderColor: tokens.border }}>
            <div style={{ ...styles.resultLabel, color: tokens.textSecondary }}>Scanned Result</div>
            <div style={{ ...styles.resultValue, color: tokens.textPrimary }}>{result}</div>
            <div style={styles.resultActions}>
              <button onClick={() => navigator.clipboard.writeText(result)} style={styles.copyBtn}>Copy</button>
              {isUrl(result) && <a href={result} target="_blank" rel="noopener noreferrer" style={styles.openBtn}>Open URL</a>}
            </div>
          </motion.div>
        )}

        {history.length > 0 && (
          <div style={styles.history}>
            <div style={{ ...styles.histTitle, color: tokens.textSecondary }}>Recent Scans</div>
            {history.map((h, i) => (
              <div key={i} style={{ ...styles.histItem, background: tokens.surface, borderColor: tokens.border }}>
                <span style={{ ...styles.histText, color: tokens.textPrimary }}>{h.length > 40 ? h.slice(0, 40) + '…' : h}</span>
                <button onClick={() => navigator.clipboard.writeText(h)} style={{ ...styles.histCopy, color: tokens.accent }}>Copy</button>
              </div>
            ))}
          </div>
        )}
        <style>{`@keyframes scanMove { 0% { top: 10%; } 100% { top: 85%; } }`}</style>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '10px' },
  cameraBox: {
    width: '100%', maxWidth: '400px', height: '300px', borderRadius: '16px', overflow: 'hidden',
    background: '#0a0a0f', border: '1px solid', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
  },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  placeholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  placeholderText: { fontSize: '14px' },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: '2px',
    animation: 'scanMove 2s linear infinite',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px', padding: '12px 16px', color: '#EF4444', fontSize: '14px',
  },
  btnRow: { display: 'flex', gap: '12px' },
  btn: {
    border: 'none', borderRadius: '12px',
    color: '#fff', fontSize: '14px', fontWeight: '700',
    padding: '13px 28px', cursor: 'pointer', minHeight: '48px',
  },
  secondaryBtn: {
    border: '1px solid',
    borderRadius: '12px', fontSize: '14px', padding: '13px 20px', cursor: 'pointer'
  },
  stopBtn: {
    background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px', color: '#EF4444', fontSize: '14px', fontWeight: '700',
    padding: '13px 24px', cursor: 'pointer',
  },
  manualRow: { display: 'flex', gap: '8px', width: '100%', maxWidth: '400px' },
  manualInput: {
    flex: 1, border: '1px solid',
    borderRadius: '10px', padding: '12px 16px', fontSize: '14px', outline: 'none'
  },
  manualBtn: {
    border: '1px solid',
    borderRadius: '10px', padding: '0 16px', cursor: 'pointer', fontWeight: 'bold'
  },
  resultCard: {
    width: '100%', maxWidth: '400px', border: '1px solid',
    borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px',
  },
  resultLabel: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  resultValue: { fontSize: '16px', wordBreak: 'break-all', fontWeight: '500' },
  resultActions: { display: 'flex', gap: '8px' },
  copyBtn: {
    background: 'rgba(108, 99, 255, 0.12)', border: '1px solid rgba(108, 99, 255, 0.25)', borderRadius: '8px',
    color: '#8B5CF6', cursor: 'pointer', fontSize: '13px', fontWeight: '700', padding: '7px 14px'
  },
  openBtn: {
    background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '8px',
    color: '#22C55E', textDecoration: 'none', fontSize: '13px', fontWeight: '700', padding: '7px 14px'
  },
  history: { width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '6px' },
  histTitle: { fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' },
  histItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    border: '1px solid', borderRadius: '8px', padding: '8px 12px',
  },
  histText: { fontSize: '13px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  histCopy: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
};
