import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

export default function ImageCompressor() {
  const [original, setOriginal] = useState(null); // { url, size, width, height, name }
  const [compressed, setCompressed] = useState(null); // { url, size, blob }
  const [quality, setQuality] = useState(80);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [outputFormat, setOutputFormat] = useState('jpeg');
  const [dragOver, setDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setOriginal({ url, size: file.size, width: img.width, height: img.height, name: file.name, type: file.type });
      setCompressed(null);
    };
    img.src = url;
  }, []);

  // Check for auto-loaded file from chatbot
  useEffect(() => {
    try {
      const pendingData = sessionStorage.getItem('chatbot-pending-file');
      if (pendingData) {
        const parsed = JSON.parse(pendingData);
        if (parsed.isImage) {
          sessionStorage.removeItem('chatbot-pending-file');
          const mime = parsed.type || 'image/png';
          const binary = atob(parsed.base64);
          const array = [];
          for (let i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
          }
          const blob = new Blob([new Uint8Array(array)], { type: mime });
          const file = new File([blob], parsed.name || 'image.png', { type: mime });
          handleFile(file);
        }
      }
    } catch (e) {
      console.error("Failed to load chatbot pending file in ImageCompressor:", e);
    }
  }, [handleFile]);

  // Auto-compress when settings change
  useEffect(() => {
    if (original) compress();
  }, [original, quality, maxWidth, outputFormat]);

  const compress = useCallback(async () => {
    if (!original) return;
    setCompressing(true);
    await new Promise(r => setTimeout(r, 10)); // allow UI update

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;

      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);

      const mime = outputFormat === 'png' ? 'image/png' : outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
      const q = outputFormat === 'png' ? undefined : quality / 100;

      canvas.toBlob((blob) => {
        if (!blob) { setCompressing(false); return; }
        const url = URL.createObjectURL(blob);
        setCompressed({ url, size: blob.size, blob, width: w, height: h });
        setCompressing(false);
      }, mime, q);
    };
    img.src = original.url;
  }, [original, quality, maxWidth, outputFormat]);

  const download = () => {
    if (!compressed) return;
    const ext = outputFormat;
    const name = original.name.replace(/\.[^.]+$/, '') + `_compressed.${ext}`;
    const a = document.createElement('a');
    a.href = compressed.url;
    a.download = name;
    a.click();
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const savedPct = original && compressed
    ? Math.round((1 - compressed.size / original.size) * 100)
    : 0;

  const savedColor = savedPct >= 50 ? '#00ff88' : savedPct >= 20 ? '#c9a96e' : '#00d4ff';

  return (
    <ToolWrapper toolName="Image Compressor">
      <div style={styles.container}>

        {/* Drop Zone */}
        {!original ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...styles.dropZone,
              borderColor: dragOver ? '#c9a96e' : 'rgba(255,255,255,0.12)',
              background: dragOver ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.02)',
              boxShadow: dragOver ? '0 0 24px rgba(201,169,110,0.15)' : 'none',
            }}
          >
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />
            <span style={{ fontSize: '48px' }}>🖼️</span>
            <p style={styles.dropTitle}>Drop an image here or click to browse</p>
            <p style={styles.dropSub}>JPG, PNG, WEBP, GIF supported</p>
          </div>
        ) : (
          <>
            {/* Settings */}
            <div style={styles.settingsCard}>
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>Quality: <span style={{ color: '#c9a96e' }}>{quality}%</span></label>
                <input type="range" min="1" max="100" value={quality}
                  onChange={e => setQuality(Number(e.target.value))} style={styles.slider} />
              </div>
              <div style={styles.settingRow}>
                <label style={styles.settingLabel}>Max Width: <span style={{ color: '#c9a96e' }}>{maxWidth}px</span></label>
                <input type="range" min="320" max="4000" step="80" value={maxWidth}
                  onChange={e => setMaxWidth(Number(e.target.value))} style={styles.slider} />
              </div>
              <div style={styles.formatsRow}>
                <label style={styles.settingLabel}>Format:</label>
                {['jpeg', 'png', 'webp'].map(f => (
                  <button key={f} onClick={() => setOutputFormat(f)} style={{
                    ...styles.formatBtn,
                    ...(outputFormat === f ? styles.formatBtnActive : {}),
                  }}>{f.toUpperCase()}</button>
                ))}
                <button onClick={() => { setOriginal(null); setCompressed(null); }} style={styles.resetBtn}>
                  ✕ Reset
                </button>
              </div>
            </div>

            {/* Stats bar */}
            {compressed && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={styles.statsBar}>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>Original</span>
                  <span style={styles.statValue}>{formatBytes(original.size)}</span>
                  <span style={styles.statDim}>{original.width}×{original.height}</span>
                </div>
                <div style={styles.statArrow}>→</div>
                <div style={styles.statItem}>
                  <span style={styles.statLabel}>Compressed</span>
                  <span style={{ ...styles.statValue, color: '#00d4ff' }}>{formatBytes(compressed.size)}</span>
                  <span style={styles.statDim}>{compressed.width}×{compressed.height}</span>
                </div>
                <div style={styles.savedBadge}>
                  <span style={{ ...styles.savedPct, color: savedColor }}>
                    {savedPct > 0 ? `${savedPct}% saved` : 'No reduction'}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Progress bar for reduction */}
            {compressed && (
              <div style={styles.reductionTrack}>
                <motion.div
                  style={{ ...styles.reductionFill, background: `linear-gradient(90deg, ${savedColor}80, ${savedColor})` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, savedPct)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}

            {/* Side by side preview */}
            <div style={styles.previewRow}>
              <div style={styles.previewBox}>
                <div style={styles.previewLabel}>Original — {formatBytes(original.size)}</div>
                <img src={original.url} alt="Original" style={styles.previewImg} />
              </div>
              <div style={styles.previewBox}>
                <div style={{ ...styles.previewLabel, color: '#00d4ff' }}>
                  Compressed — {compressed ? formatBytes(compressed.size) : '…'}
                  {compressing && ' ⟳'}
                </div>
                {compressed ? (
                  <img src={compressed.url} alt="Compressed" style={styles.previewImg} />
                ) : (
                  <div style={styles.previewLoading}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9a96e" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Download */}
            {compressed && (
              <motion.button
                onClick={download}
                style={styles.downloadBtn}
                whileHover={{ scale: 1.02, boxShadow: '0 0 28px rgba(233,30,140,0.5)' }}
                whileTap={{ scale: 0.97 }}
              >
                ↓ Download Compressed Image
              </motion.button>
            )}
          </>
        )}
      </div>
    </ToolWrapper>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '680px', margin: '0 auto' },
  dropZone: {
    border: '2px dashed', borderRadius: '18px', padding: '48px 24px',
    cursor: 'pointer', transition: 'all 0.25s', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
  },
  dropTitle: { fontFamily: "'Rajdhani', sans-serif", fontSize: '17px', color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: '600' },
  dropSub: { fontFamily: "'Rajdhani', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 },
  settingsCard: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px',
  },
  settingRow: { display: 'flex', alignItems: 'center', gap: '14px' },
  settingLabel: { fontFamily: "'Rajdhani', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.55)', width: '160px', flexShrink: 0 },
  slider: { flex: 1 },
  formatsRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  formatBtn: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
    color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: "'Orbitron', sans-serif",
    fontSize: '11px', fontWeight: '700', padding: '7px 12px', transition: 'all 0.2s', minHeight: '34px',
  },
  formatBtnActive: { background: 'rgba(201,169,110,0.12)', borderColor: 'rgba(201,169,110,0.3)', color: '#c9a96e' },
  resetBtn: {
    marginLeft: 'auto', background: 'rgba(233,30,140,0.08)', border: '1px solid rgba(233,30,140,0.2)',
    borderRadius: '8px', color: '#e91e8c', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif",
    fontSize: '13px', fontWeight: '600', padding: '7px 12px', minHeight: '34px',
  },
  statsBar: {
    display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', padding: '16px 20px',
  },
  statItem: { display: 'flex', flexDirection: 'column', gap: '3px' },
  statLabel: { fontFamily: "'Rajdhani', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValue: { fontFamily: "'Orbitron', sans-serif", fontSize: '18px', fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  statDim: { fontFamily: "'Rajdhani', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)' },
  statArrow: { fontFamily: "'Orbitron', sans-serif", fontSize: '20px', color: 'rgba(255,255,255,0.2)', flex: 1, textAlign: 'center' },
  savedBadge: { marginLeft: 'auto' },
  savedPct: { fontFamily: "'Orbitron', sans-serif", fontSize: '20px', fontWeight: '900' },
  reductionTrack: { height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden' },
  reductionFill: { height: '100%', borderRadius: '3px' },
  previewRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  previewBox: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
  },
  previewLabel: {
    padding: '8px 12px', fontFamily: "'Rajdhani', sans-serif", fontSize: '12px',
    color: 'rgba(255,255,255,0.45)', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  previewImg: { width: '100%', height: '200px', objectFit: 'contain', background: 'rgba(0,0,0,0.3)' },
  previewLoading: {
    height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.3)',
  },
  downloadBtn: {
    background: 'linear-gradient(135deg, #e91e8c 0%, #ff6b35 100%)', border: 'none',
    borderRadius: '14px', color: '#fff', fontFamily: "'Orbitron', sans-serif",
    fontSize: '15px', fontWeight: '700', padding: '16px', cursor: 'pointer',
    minHeight: '54px', letterSpacing: '1px', boxShadow: '0 4px 24px rgba(233,30,140,0.3)',
  },
};
