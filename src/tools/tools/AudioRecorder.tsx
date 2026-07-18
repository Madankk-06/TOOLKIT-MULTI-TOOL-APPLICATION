import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';

type Recording = {
  id: number;
  url: string;
  duration: number;
  name: string;
  size: string;
};

export default function AudioRecorder(props?: any) {
  const location = useLocation();
  const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'done'>('idle');
  const [duration, setDuration] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [visualizer, setVisualizer] = useState<number[]>(new Array(30).fill(2));
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Auto-start recording when opened from chatbot
  useEffect(() => {
    let data = null;
        if (props && (props.params || props.aiPayload)) {
          data = props.params || props.aiPayload;
        } else if (location.state && (location.state.aiPayload || location.state.params)) {
          data = location.state.aiPayload || location.state.params;
        } else if (props && Object.keys(props).some(k => k !== 'standalone')) {
          data = props;
        }
    const shouldAutoStart = data?.autoStart || props?.autoStart || location.state?.autoStart;
    if (shouldAutoStart) {
      // Small delay to let the component settle
      const timer = setTimeout(() => startRecording(), 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      mediaRecorder.current = new MediaRecorder(stream);
      chunks.current = [];
      mediaRecorder.current.ondataavailable = e => chunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordings(r => [{
          id: Date.now(), url, duration, name: `Recording ${r.length + 1}`,
          size: (blob.size / 1024).toFixed(1),
        }, ...r]);
        stream.getTracks().forEach(t => t.stop());
        setStatus('done');
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (animRef.current) cancelAnimationFrame(animRef.current);
        setVisualizer(new Array(30).fill(2));
      };

      mediaRecorder.current.start();
      setStatus('recording');
      setDuration(0);
      intervalRef.current = setInterval(() => setDuration(d => d + 1), 1000);

      const animate = () => {
        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
          const bars = Array.from(dataArrayRef.current).slice(0, 30).map(v => Math.max(2, (v / 255) * 48));
          setVisualizer(bars);
          animRef.current = requestAnimationFrame(animate);
        }
      };
      animate();
    } catch (e) {
      setError('Microphone access denied or error occurred.');
      console.error(e);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
  };

  const pauseRecording = () => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setStatus('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder.current?.state === 'paused') {
      mediaRecorder.current.resume();
      intervalRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      setStatus('recording');
    }
  };

  const deleteRecording = (id: number) => {
    setRecordings(r => r.filter(rec => rec.id !== id));
  };

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatDur = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

  return (
    <ToolWrapper toolName="Audio Recorder">
      <div style={styles.container}>
        {error && <div style={styles.error} aria-live="assertive">{error}</div>}
        
        <div style={styles.visualizer}>
          {visualizer.map((h, i) => (
            <div key={i} style={{
              ...styles.bar,
              height: `${h}px`,
              background: status === 'recording'
                ? `hsl(${i * 6}, 80%, 65%)`
                : 'rgba(255,255,255,0.1)',
              transition: status === 'recording' ? 'height 0.05s' : 'height 0.3s',
            }} />
          ))}
        </div>

        <div style={{
          ...styles.timer as React.CSSProperties,
          color: status === 'recording' ? '#EF4444' : '#6C63FF',
        }}>
          {formatDur(duration)}
          {status === 'recording' && <span style={styles.recDot}>●</span>}
        </div>

        <div style={styles.controls}>
          {status === 'idle' || status === 'done' ? (
            <motion.button onClick={startRecording} style={styles.recBtn} whileTap={{ scale: 0.95 }}>
              ● Start Recording
            </motion.button>
          ) : (
            <>
              {status === 'recording' ? (
                <motion.button onClick={pauseRecording} style={styles.pauseBtn} whileTap={{ scale: 0.95 }}>⏸ Pause</motion.button>
              ) : (
                <motion.button onClick={resumeRecording} style={styles.resumeBtn} whileTap={{ scale: 0.95 }}>▶ Resume</motion.button>
              )}
              <motion.button onClick={stopRecording} style={styles.stopBtn} whileTap={{ scale: 0.95 }}>⏹ Stop</motion.button>
            </>
          )}
        </div>

        <AnimatePresence>
          {recordings.length > 0 && (
            <div style={styles.recordingsList}>
              <h3 style={styles.listTitle}>Recordings</h3>
              {recordings.map(rec => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  style={styles.recCard}
                >
                  <div style={styles.recInfo}>
                    <span style={styles.recName}>{rec.name}</span>
                    <span style={styles.recMeta}>{formatDur(rec.duration)} · {rec.size} KB</span>
                  </div>
                  <audio src={rec.url} controls style={styles.audio} />
                  <div style={styles.recActions}>
                    <a href={rec.url} download={`${rec.name}.webm`} style={styles.downloadBtn}>↓ Save</a>
                    <button onClick={() => deleteRecording(rec.id)} style={styles.deleteBtn}>✕</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '20px' },
  error: { color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 20px', borderRadius: '8px', fontSize: '14px' },
  visualizer: {
    display: 'flex', alignItems: 'flex-end', gap: '3px', height: '60px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px', padding: '8px 16px',
  },
  bar: { width: '6px', borderRadius: '3px 3px 0 0', minHeight: '2px' },
  timer: {
    fontFamily: "var(--font-stack)", fontSize: '40px', fontWeight: '900',
    letterSpacing: '3px', display: 'flex', alignItems: 'center', gap: '10px',
  },
  recDot: { fontSize: '14px', color: '#EF4444' },
  controls: { display: 'flex', gap: '12px' },
  recBtn: {
    background: 'linear-gradient(135deg, #6C63FF, #8B5CF6)', border: 'none', borderRadius: '14px',
    color: '#fff', fontSize: '14px', fontWeight: '700',
    padding: '14px 28px', cursor: 'pointer', minHeight: '50px',
  },
  pauseBtn: {
    background: 'rgba(108, 99, 255, 0.15)', border: '1px solid rgba(108, 99, 255, 0.3)',
    borderRadius: '12px', color: '#6C63FF',
    fontSize: '14px', fontWeight: '700', padding: '13px 24px', cursor: 'pointer', minHeight: '48px',
  },
  resumeBtn: {
    background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '12px', color: '#22C55E',
    fontSize: '14px', fontWeight: '700', padding: '13px 24px', cursor: 'pointer', minHeight: '48px',
  },
  stopBtn: {
    background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px', color: '#EF4444',
    fontSize: '14px', fontWeight: '700', padding: '13px 24px', cursor: 'pointer', minHeight: '48px',
  },
  recordingsList: { width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '10px' },
  listTitle: { fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '4px', textTransform: 'uppercase' },
  recCard: {
    background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)',
    borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px',
  },
  recInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  recName: { fontSize: '13px', color: '#00d4ff', fontWeight: '600' },
  recMeta: { fontSize: '13px', color: 'rgba(255,255,255,0.35)' },
  audio: { width: '100%', height: '36px' },
  recActions: { display: 'flex', gap: '8px' },
  downloadBtn: {
    background: 'rgba(108, 99, 255, 0.1)', border: '1px solid rgba(108, 99, 255, 0.25)', borderRadius: '8px',
    color: '#6C63FF', textDecoration: 'none',
    fontSize: '13px', fontWeight: '700', padding: '7px 14px', display: 'flex', alignItems: 'center',
  },
  deleteBtn: {
    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px',
    color: '#EF4444', cursor: 'pointer',
    fontSize: '14px', fontWeight: '700', padding: '7px 12px',
  },
};
