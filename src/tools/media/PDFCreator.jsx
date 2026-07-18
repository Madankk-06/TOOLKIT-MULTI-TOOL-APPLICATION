import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

export default function PDFCreator() {
  const [tab, setTab] = useState('images'); // images | text
  const [images, setImages] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin] = useState(10);
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [fontFamily, setFontFamily] = useState('helvetica');
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef(null);

  const PAGE_SIZES = ['a4', 'a3', 'letter', 'legal'];
  const FONTS = ['helvetica', 'courier', 'times'];

  const handleImages = (files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
    const readers = valid.map(file => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({
        id: Date.now() + Math.random(),
        name: file.name,
        url: e.target.result,
        size: file.size,
      });
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then(imgs => setImages(prev => [...prev, ...imgs]));
  };

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
          handleImages([file]);
        }
      }
    } catch (e) {
      console.error("Failed to load chatbot pending file in PDFCreator:", e);
    }
  }, []);

  const removeImage = (id) => setImages(prev => prev.filter(img => img.id !== id));

  const moveImage = (idx, dir) => {
    const newImages = [...images];
    const swap = idx + dir;
    if (swap < 0 || swap >= newImages.length) return;
    [newImages[idx], newImages[swap]] = [newImages[swap], newImages[idx]];
    setImages(newImages);
  };

  const generatePDF = async () => {
    setGenerating(true);
    setDone(false);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation, unit: 'mm', format: pageSize });

      if (tab === 'images') {
        if (images.length === 0) { setGenerating(false); return; }
        for (let i = 0; i < images.length; i++) {
          if (i > 0) doc.addPage();
          const img = new Image();
          img.src = images[i].url;
          await new Promise(r => { img.onload = r; });
          const pw = doc.internal.pageSize.getWidth() - margin * 2;
          const ph = doc.internal.pageSize.getHeight() - margin * 2;
          const ratio = Math.min(pw / img.width, ph / img.height);
          const w = img.width * ratio;
          const h = img.height * ratio;
          const x = margin + (pw - w) / 2;
          const y = margin + (ph - h) / 2;
          const ext = images[i].url.includes('image/png') ? 'PNG' : 'JPEG';
          doc.addImage(images[i].url, ext, x, y, w, h);
        }
      } else {
        if (!textContent.trim()) { setGenerating(false); return; }
        if (title.trim()) {
          doc.setFont(fontFamily);
          doc.setFontSize(fontSize + 6);
          doc.text(title.trim(), margin, margin + 10);
          doc.setFontSize(fontSize);
          doc.setLineWidth(0.3);
          doc.line(margin, margin + 14, doc.internal.pageSize.getWidth() - margin, margin + 14);
        }
        doc.setFont(fontFamily);
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(textContent, doc.internal.pageSize.getWidth() - margin * 2);
        const startY = title.trim() ? margin + 22 : margin + 10;
        const lineH = fontSize * 0.5;
        const pageH = doc.internal.pageSize.getHeight() - margin;
        let y = startY;
        for (const line of lines) {
          if (y > pageH) { doc.addPage(); y = margin + 10; }
          doc.text(line, margin, y);
          y += lineH;
        }
      }

      const filename = (title.trim() || 'document').replace(/\s+/g, '_') + '.pdf';
      doc.save(filename);
      setDone(true);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF. Please try again.');
    }
    setGenerating(false);
  };

  const formatBytes = (bytes) => bytes < 1024 * 1024 ? (bytes / 1024).toFixed(0) + ' KB' : (bytes / 1024 / 1024).toFixed(1) + ' MB';

  return (
    <ToolWrapper toolName="PDF Creator">
      <div style={styles.container}>

        {/* Tabs */}
        <div style={styles.tabs}>
          {[['images', '🖼️ From Images'], ['text', '📝 From Text']].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setDone(false); }} style={{
              ...styles.tab, ...(tab === id ? styles.tabActive : {}),
            }}>{label}</button>
          ))}
        </div>

        {/* ── Images Tab ── */}
        {tab === 'images' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.tabContent}>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleImages(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                ...styles.dropZone,
                borderColor: dragOver ? '#c9a96e' : 'rgba(255,255,255,0.12)',
                background: dragOver ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <input ref={fileInputRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
                onChange={e => handleImages(e.target.files)} />
              <div style={styles.dropContent}>
                <span style={{ fontSize: '36px' }}>🖼️</span>
                <p style={styles.dropTitle}>Drop images here or click to browse</p>
                <p style={styles.dropSub}>JPG, PNG, WEBP — multiple files supported</p>
              </div>
            </div>

            {/* Image thumbnails */}
            {images.length > 0 && (
              <div style={styles.thumbGrid}>
                {images.map((img, idx) => (
                  <motion.div key={img.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.thumb}>
                    <img src={img.url} alt={img.name} style={styles.thumbImg} />
                    <div style={styles.thumbOverlay}>
                      <span style={styles.thumbName}>{img.name.length > 12 ? img.name.slice(0, 10) + '…' : img.name}</span>
                      <span style={styles.thumbSize}>{formatBytes(img.size)}</span>
                    </div>
                    <div style={styles.thumbActions}>
                      <button onClick={() => moveImage(idx, -1)} disabled={idx === 0} style={styles.thumbBtn}>↑</button>
                      <button onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1} style={styles.thumbBtn}>↓</button>
                      <button onClick={() => removeImage(img.id)} style={{ ...styles.thumbBtn, color: '#e91e8c' }}>✕</button>
                    </div>
                    <div style={styles.thumbNum}>{idx + 1}</div>
                  </motion.div>
                ))}
              </div>
            )}

            {images.length > 0 && (
              <div style={styles.imageStats}>
                <span style={styles.statPill}>{images.length} image{images.length !== 1 ? 's' : ''}</span>
                <button onClick={() => setImages([])} style={styles.clearBtn}>Clear all</button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Text Tab ── */}
        {tab === 'text' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.tabContent}>
            <div style={styles.field}>
              <label style={styles.label}>Document Title (optional)</label>
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="My Document"
                style={styles.input}
              />
            </div>
            <div style={styles.textOptionsRow}>
              <div style={styles.field}>
                <label style={styles.label}>Font</label>
                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={styles.select}>
                  {FONTS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Font Size: {fontSize}pt</label>
                <input type="range" min="8" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Content</label>
              <textarea
                value={textContent} onChange={e => setTextContent(e.target.value)}
                placeholder="Type or paste your text here…"
                style={styles.textarea}
              />
              <span style={styles.charCount}>{textContent.length.toLocaleString()} characters</span>
            </div>
          </motion.div>
        )}

        {/* Page Settings */}
        <div style={styles.pageSettings}>
          <div style={styles.settingGroup}>
            <label style={styles.label}>Page Size</label>
            <div style={styles.optionRow}>
              {PAGE_SIZES.map(s => (
                <button key={s} onClick={() => setPageSize(s)} style={{
                  ...styles.optionBtn, ...(pageSize === s ? styles.optionActive : {}),
                }}>{s.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div style={styles.settingGroup}>
            <label style={styles.label}>Orientation</label>
            <div style={styles.optionRow}>
              {[['portrait', '↕'], ['landscape', '↔']].map(([o, icon]) => (
                <button key={o} onClick={() => setOrientation(o)} style={{
                  ...styles.optionBtn, ...(orientation === o ? styles.optionActive : {}),
                }}>{icon} {o.charAt(0).toUpperCase() + o.slice(1)}</button>
              ))}
            </div>
          </div>
          {tab === 'images' && (
            <div style={styles.settingGroup}>
              <label style={styles.label}>Margin: {margin}mm</label>
              <input type="range" min="0" max="30" value={margin} onChange={e => setMargin(Number(e.target.value))} />
            </div>
          )}
        </div>

        {/* Generate button */}
        <motion.button
          onClick={generatePDF}
          disabled={generating || (tab === 'images' ? images.length === 0 : !textContent.trim())}
          style={{
            ...styles.generateBtn,
            opacity: generating || (tab === 'images' ? images.length === 0 : !textContent.trim()) ? 0.4 : 1,
          }}
          whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(233,30,140,0.5)' }}
          whileTap={{ scale: 0.97 }}
        >
          {generating ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
              Generating PDF…
            </span>
          ) : '📄 Generate & Download PDF'}
        </motion.button>

        <AnimatePresence>
          {done && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={styles.successMsg}>
              ✅ PDF downloaded successfully!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToolWrapper>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '600px', margin: '0 auto' },
  tabs: { display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '4px' },
  tab: {
    flex: 1, border: 'none', borderRadius: '10px', padding: '11px',
    fontFamily: "'Rajdhani', sans-serif", fontSize: '15px', fontWeight: '700',
    cursor: 'pointer', color: 'rgba(255,255,255,0.45)', background: 'transparent', transition: 'all 0.2s',
  },
  tabActive: { background: 'rgba(233,30,140,0.15)', color: '#e91e8c', border: '1px solid rgba(233,30,140,0.3)' },
  tabContent: { display: 'flex', flexDirection: 'column', gap: '14px' },
  dropZone: {
    border: '2px dashed', borderRadius: '14px', padding: '32px 20px',
    cursor: 'pointer', transition: 'all 0.25s', textAlign: 'center',
  },
  dropContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  dropTitle: { fontFamily: "'Rajdhani', sans-serif", fontSize: '16px', color: 'rgba(255,255,255,0.65)', margin: 0, fontWeight: '600' },
  dropSub: { fontFamily: "'Rajdhani', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 },
  thumbGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' },
  thumb: {
    position: 'relative', borderRadius: '10px', overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)', background: '#0a0a0f',
    aspectRatio: '1',
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  thumbOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
    padding: '16px 6px 6px', display: 'flex', flexDirection: 'column', gap: '1px',
  },
  thumbName: { fontFamily: "'Rajdhani', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.7)' },
  thumbSize: { fontFamily: "'Rajdhani', sans-serif", fontSize: '9px', color: 'rgba(255,255,255,0.4)' },
  thumbActions: {
    position: 'absolute', top: '4px', right: '4px',
    display: 'flex', flexDirection: 'column', gap: '2px',
  },
  thumbBtn: {
    background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '4px',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', width: '22px', height: '22px',
    fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
  },
  thumbNum: {
    position: 'absolute', top: '4px', left: '4px',
    background: 'rgba(233,30,140,0.85)', borderRadius: '4px',
    fontFamily: "'Orbitron', sans-serif", fontSize: '9px', fontWeight: '700', color: '#fff',
    padding: '2px 5px',
  },
  imageStats: { display: 'flex', alignItems: 'center', gap: '12px' },
  statPill: {
    background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)',
    borderRadius: '20px', padding: '4px 12px', fontFamily: "'Rajdhani', sans-serif",
    fontSize: '13px', color: '#00d4ff', fontWeight: '600',
  },
  clearBtn: {
    background: 'none', border: '1px solid rgba(233,30,140,0.25)', borderRadius: '8px',
    color: '#e91e8c', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif",
    fontSize: '13px', fontWeight: '600', padding: '5px 12px',
  },
  field: { display: 'flex', flexDirection: 'column', gap: '7px' },
  label: { fontFamily: "'Rajdhani', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    color: '#fff', fontFamily: "'Orbitron', sans-serif", fontSize: '15px', fontWeight: '600',
    padding: '12px 16px', outline: 'none', minHeight: '46px',
  },
  select: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    color: '#c9a96e', fontFamily: "'Rajdhani', sans-serif", fontSize: '15px', fontWeight: '600',
    padding: '10px 14px', outline: 'none', cursor: 'pointer', minHeight: '44px',
  },
  textOptionsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  textarea: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '10px',
    color: '#fff', fontFamily: "'Rajdhani', sans-serif", fontSize: '15px', fontWeight: '500',
    padding: '14px 16px', outline: 'none', resize: 'vertical', minHeight: '200px',
    lineHeight: 1.6,
  },
  charCount: { fontFamily: "'Rajdhani', sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'right' },
  pageSettings: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px',
  },
  settingGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  optionRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  optionBtn: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
    color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif",
    fontSize: '13px', fontWeight: '600', padding: '7px 14px', transition: 'all 0.2s', minHeight: '34px',
  },
  optionActive: { background: 'rgba(201,169,110,0.12)', borderColor: 'rgba(201,169,110,0.3)', color: '#c9a96e' },
  generateBtn: {
    background: 'linear-gradient(135deg, #e91e8c 0%, #ff6b35 100%)', border: 'none',
    borderRadius: '14px', color: '#fff', fontFamily: "'Orbitron', sans-serif",
    fontSize: '15px', fontWeight: '700', padding: '16px', cursor: 'pointer',
    minHeight: '54px', letterSpacing: '1px', boxShadow: '0 4px 24px rgba(233,30,140,0.3)',
  },
  successMsg: {
    background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)',
    borderRadius: '10px', padding: '14px', fontFamily: "'Rajdhani', sans-serif",
    fontSize: '15px', color: '#00ff88', fontWeight: '600', textAlign: 'center',
  },
};
