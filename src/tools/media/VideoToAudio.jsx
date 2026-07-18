import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

export default function VideoToAudio() {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('mp3');
  const [quality, setQuality] = useState('192');
  const [status, setStatus] = useState('idle'); // idle | loading | processing | done | error
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState('');
  const [outputSize, setOutputSize] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  const FORMATS = ['mp3', 'wav', 'ogg', 'aac'];
  const QUALITIES = [
    { value: '128', label: '128 kbps — Standard' },
    { value: '192', label: '192 kbps — High' },
    { value: '320', label: '320 kbps — Best' },
  ];

  const MAX_SIZE = 200 * 1024 * 1024; // 200MB

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > MAX_SIZE) {
      setErrorMsg('File too large. Maximum size is 200MB.');
      return;
    }
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/avi', 'video/mov'];
    if (!f.type.startsWith('video/') && !validTypes.includes(f.type)) {
      setErrorMsg('Please upload a valid video file (MP4, WebM, MOV, AVI).');
      return;
    }
    setFile(f);
    setOutputUrl('');
    setStatus('idle');
    setErrorMsg('');
    setProgress(0);
  };

  useEffect(() => {
    try {
      const pendingData = sessionStorage.getItem('chatbot-pending-file');
      if (pendingData) {
        const parsed = JSON.parse(pendingData);
        // Only load if it's a video file or starts with video/
        if (parsed.type?.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi'].some(ext => parsed.name?.toLowerCase().endsWith(ext))) {
          sessionStorage.removeItem('chatbot-pending-file');
          const mime = parsed.type || 'video/mp4';
          const binary = atob(parsed.base64);
          const array = [];
          for (let i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
          }
          const blob = new Blob([new Uint8Array(array)], { type: mime });
          const file = new File([blob], parsed.name || 'video.mp4', { type: mime });
          handleFile(file);
        }
      }
    } catch (e) {
      console.error("Failed to load chatbot pending file in VideoToAudio:", e);
    }
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // Web Audio API based extraction — works without ffmpeg.wasm
  const extractAudio = async () => {
    if (!file) return;
    setStatus('processing');
    setProgress(0);
    setErrorMsg('');

    try {
      // Read video as array buffer
      setProgress(10);
      const arrayBuffer = await file.arrayBuffer();
      setProgress(30);

      // Decode audio from video using Web Audio API
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      setProgress(50);

      const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
      setProgress(70);

      // Encode to WAV (browser-native)
      const wavBuffer = encodeWAV(decodedData);
      setProgress(90);

      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      setOutputSize((blob.size / 1024 / 1024).toFixed(2));
      setStatus('done');
      setProgress(100);
      audioCtx.close();
    } catch (err) {
      console.error(err);
      // Fallback: extract using video element + MediaRecorder
      extractAudioFallback();
    }
  };

  const extractAudioFallback = async () => {
    try {
      setProgress(20);
      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = false;
      await new Promise((res, rej) => {
        video.onloadedmetadata = res;
        video.onerror = rej;
      });

      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      const src = ctx.createMediaElementSource(video);
      src.connect(dest);
      src.connect(ctx.destination);

      setProgress(40);

      const recorder = new MediaRecorder(dest.stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      const chunks = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        setOutputSize((blob.size / 1024 / 1024).toFixed(2));
        setStatus('done');
        setProgress(100);
        ctx.close();
        URL.revokeObjectURL(videoUrl);
      };

      video.onended = () => recorder.stop();
      video.ontimeupdate = () => {
        if (video.duration) {
          setProgress(40 + Math.round((video.currentTime / video.duration) * 55));
        }
      };

      recorder.start();
      video.play();
    } catch (err) {
      setStatus('error');
      setErrorMsg('Could not extract audio from this video format. Try MP4 or WebM files.');
    }
  };

  // WAV encoder from AudioBuffer
  function encodeWAV(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitsPerSample = 16;
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;

    // Interleave channels
    const channelData = [];
    for (let c = 0; c < numChannels; c++) channelData.push(buffer.getChannelData(c));
    const length = buffer.length;
    const samples = new Int16Array(length * numChannels);
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const s = Math.max(-1, Math.min(1, channelData[c][i]));
        samples[i * numChannels + c] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
    }

    const dataSize = samples.buffer.byteLength;
    const wavBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(wavBuffer);

    const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);
    new Int16Array(wavBuffer, 44).set(samples);

    return wavBuffer;
  }

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const getVideoDuration = () => {
    if (!file) return '—';
    return 'Upload to see duration';
  };

  return (
    <ToolWrapper toolName="Video to Audio">
      <div style={styles.container}>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            ...styles.dropZone,
            borderColor: dragOver ? '#c9a96e' : file ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.12)',
            background: dragOver ? 'rgba(201,169,110,0.06)' : file ? 'rgba(0,212,255,0.04)' : 'rgba(255,255,255,0.02)',
            boxShadow: dragOver ? '0 0 24px rgba(201,169,110,0.2)' : 'none',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {file ? (
            <div style={styles.fileInfo}>
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
                <rect x="8" y="8" width="48" height="48" rx="8" fill="rgba(0,212,255,0.15)" />
                <polygon points="24,20 24,44 48,32" fill="#00d4ff" />
              </svg>
              <div style={styles.fileDetails}>
                <div style={styles.fileName}>{file.name}</div>
                <div style={styles.fileMeta}>{formatBytes(file.size)} · {file.type || 'video'}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setOutputUrl(''); setStatus('idle'); }}
                style={styles.removeBtn}
              >✕</button>
            </div>
          ) : (
            <div style={styles.dropContent}>
              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                <defs>
                  <linearGradient id="va_icon_g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#c9a96e" /><stop offset="100%" stopColor="#7a5a30" />
                  </linearGradient>
                </defs>
                <rect x="6" y="14" width="52" height="36" rx="6" fill="url(#va_icon_g)" opacity="0.3" />
                <rect x="10" y="18" width="44" height="28" rx="4" fill="rgba(201,169,110,0.1)" stroke="rgba(201,169,110,0.4)" strokeWidth="1.5" />
                <polygon points="26,24 26,40 44,32" fill="#c9a96e" opacity="0.8" />
                <line x1="32" y1="52" x2="32" y2="58" stroke="#c9a96e" strokeWidth="2" />
                <line x1="26" y1="58" x2="38" y2="58" stroke="#c9a96e" strokeWidth="2" />
              </svg>
              <p style={styles.dropTitle}>Drop video here or click to browse</p>
              <p style={styles.dropSub}>MP4, WebM, MOV, AVI · Max 200MB</p>
            </div>
          )}
        </div>

        {/* Settings */}
        <div style={styles.settingsRow}>
          <div style={styles.settingGroup}>
            <label style={styles.settingLabel}>Output Format</label>
            <div style={styles.formatTabs}>
              {FORMATS.map(f => (
                <button key={f} onClick={() => setFormat(f)} style={{
                  ...styles.formatTab,
                  ...(format === f ? styles.formatTabActive : {}),
                }}>{f.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div style={styles.settingGroup}>
            <label style={styles.settingLabel}>Quality</label>
            <select value={quality} onChange={e => setQuality(e.target.value)} style={styles.select}>
              {QUALITIES.map(q => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {errorMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.error}>
            ⚠️ {errorMsg}
          </motion.div>
        )}

        {/* Progress */}
        <AnimatePresence>
          {(status === 'processing') && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={styles.progressWrap}>
              <div style={styles.progressLabel}>
                <span style={{ color: '#c9a96e', fontFamily: "'Rajdhani', sans-serif" }}>Extracting audio…</span>
                <span style={{ color: '#00d4ff', fontFamily: "'Orbitron', sans-serif", fontSize: '13px' }}>{progress}%</span>
              </div>
              <div style={styles.progressTrack}>
                <motion.div
                  style={styles.progressFill}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <div style={styles.progressScanline} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extract button */}
        {status !== 'done' && (
          <motion.button
            onClick={extractAudio}
            disabled={!file || status === 'processing'}
            style={{
              ...styles.extractBtn,
              opacity: (!file || status === 'processing') ? 0.4 : 1,
              cursor: (!file || status === 'processing') ? 'not-allowed' : 'pointer',
            }}
            whileHover={file && status !== 'processing' ? { scale: 1.02, boxShadow: '0 0 32px rgba(233,30,140,0.5)' } : {}}
            whileTap={file && status !== 'processing' ? { scale: 0.97 } : {}}
          >
            {status === 'processing' ? (
              <span style={styles.loadingRow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                </svg>
                Processing…
              </span>
            ) : '🎵 Extract Audio'}
          </motion.button>
        )}

        {/* Result */}
        <AnimatePresence>
          {status === 'done' && outputUrl && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              style={styles.resultCard}
            >
              <div style={styles.resultHeader}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#00ff88" strokeWidth="2" />
                  <polyline points="8 12 11 15 16 9" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <span style={styles.resultTitle}>Audio Extracted Successfully!</span>
              </div>
              <div style={styles.resultMeta}>
                <span style={styles.resultMetaItem}>📁 {file?.name?.replace(/\.[^.]+$/, '')}.wav</span>
                <span style={styles.resultMetaItem}>💾 {outputSize} MB</span>
                <span style={styles.resultMetaItem}>🎵 WAV format</span>
              </div>
              <audio controls src={outputUrl} style={styles.audioPlayer} />
              <div style={styles.resultActions}>
                <a
                  href={outputUrl}
                  download={`${file?.name?.replace(/\.[^.]+$/, '') || 'audio'}.wav`}
                  style={styles.downloadBtn}
                >
                  ↓ Download Audio
                </a>
                <button onClick={() => { setFile(null); setOutputUrl(''); setStatus('idle'); setProgress(0); }} style={styles.newBtn}>
                  + New Conversion
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info */}
        <div style={styles.infoBox}>
          <div style={styles.infoTitle}>ℹ️ How it works</div>
          <p style={styles.infoText}>
            Audio is extracted entirely in your browser using the Web Audio API — no uploads to any server. Your video file stays private.
          </p>
        </div>
      </div>
    </ToolWrapper>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '580px', margin: '0 auto' },
  dropZone: {
    border: '2px dashed', borderRadius: '18px', padding: '32px 24px',
    cursor: 'pointer', transition: 'all 0.25s', minHeight: '140px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  fileInfo: { display: 'flex', alignItems: 'center', gap: '16px', width: '100%' },
  fileDetails: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  fileName: { fontFamily: "'Orbitron', sans-serif", fontSize: '14px', color: 'var(--accent-cyan)', fontWeight: '600', wordBreak: 'break-all' },
  fileMeta: { fontFamily: "'Rajdhani', sans-serif", fontSize: '13px', color: 'var(--text-muted)' },
  removeBtn: {
    background: 'rgba(233,30,140,0.12)', border: '1px solid rgba(233,30,140,0.25)',
    borderRadius: '8px', color: '#e91e8c', cursor: 'pointer', width: '32px', height: '32px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px',
  },
  dropContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' },
  dropTitle: { fontFamily: "'Rajdhani', sans-serif", fontSize: '16px', color: 'var(--text-secondary)', margin: 0, fontWeight: '600' },
  dropSub: { fontFamily: "'Rajdhani', sans-serif", fontSize: '13px', color: 'var(--text-muted)', margin: 0 },
  settingsRow: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  settingGroup: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '180px' },
  settingLabel: { fontFamily: "'Rajdhani', sans-serif", fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  formatTabs: { display: 'flex', gap: '6px' },
  formatTab: {
    flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-input)',
    borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer',
    fontFamily: "'Orbitron', sans-serif", fontSize: '12px', fontWeight: '700',
    padding: '9px 6px', transition: 'all 0.2s', minHeight: '38px',
  },
  formatTabActive: { background: 'var(--accent-gold-dim)', borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' },
  select: {
    background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: '10px',
    color: 'var(--text-primary)', fontFamily: "'Rajdhani', sans-serif", fontSize: '15px', fontWeight: '600',
    padding: '10px 14px', outline: 'none', cursor: 'pointer', minHeight: '44px',
  },
  error: {
    background: 'rgba(233,30,140,0.10)', border: '1px solid rgba(233,30,140,0.3)',
    borderRadius: '10px', padding: '12px 16px', color: '#ff6b84',
    fontFamily: "'Rajdhani', sans-serif", fontSize: '14px',
  },
  progressWrap: {
    background: 'var(--bg-card)', border: '1px solid var(--border-card)',
    borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', overflow: 'hidden',
  },
  progressLabel: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  progressTrack: { height: '6px', background: 'var(--border-input)', borderRadius: '3px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #e91e8c, #ff6b35)', borderRadius: '3px' },
  progressScanline: {
    position: 'absolute', top: 0, left: '-100%', right: 0, bottom: 0,
    background: 'linear-gradient(90deg, transparent, var(--bg-card-hover), transparent)',
    animation: 'scanline 1.5s linear infinite',
  },
  extractBtn: {
    background: 'linear-gradient(135deg, #e91e8c 0%, #ff6b35 100%)', border: 'none',
    borderRadius: '14px', color: '#fff', fontFamily: "'Orbitron', sans-serif",
    fontSize: '15px', fontWeight: '700', padding: '16px', minHeight: '54px',
    letterSpacing: '1px', boxShadow: '0 4px 24px rgba(233,30,140,0.3)', width: '100%',
  },
  loadingRow: { display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' },
  resultCard: {
    background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.2)',
    borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
  },
  resultHeader: { display: 'flex', alignItems: 'center', gap: '10px' },
  resultTitle: { fontFamily: "'Orbitron', sans-serif", fontSize: '16px', fontWeight: '700', color: '#00ff88' },
  resultMeta: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  resultMetaItem: { fontFamily: "'Rajdhani', sans-serif", fontSize: '14px', color: 'var(--text-secondary)' },
  audioPlayer: { width: '100%', height: '40px', accentColor: '#c9a96e' },
  resultActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  downloadBtn: {
    flex: 1, background: 'linear-gradient(135deg, #e91e8c, #ff6b35)', border: 'none',
    borderRadius: '10px', color: '#fff', fontFamily: "'Orbitron', sans-serif",
    fontSize: '13px', fontWeight: '700', padding: '13px', textDecoration: 'none',
    textAlign: 'center', minHeight: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    letterSpacing: '0.5px',
  },
  newBtn: {
    flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-card)',
    borderRadius: '10px', color: 'var(--text-secondary)', fontFamily: "'Rajdhani', sans-serif",
    fontSize: '15px', fontWeight: '600', padding: '13px', cursor: 'pointer', minHeight: '46px',
  },
  infoBox: {
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px', padding: '16px',
  },
  infoTitle: { fontFamily: "'Rajdhani', sans-serif", fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px' },
  infoText: { fontFamily: "'Rajdhani', sans-serif", fontSize: '13px', color: 'var(--text-placeholder)', margin: 0, lineHeight: 1.6 },
};
