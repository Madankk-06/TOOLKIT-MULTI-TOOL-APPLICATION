import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { useTheme } from '../../context/ThemeContext';
import SkeuomorphicToggle from '../../components/SkeuomorphicToggle';

export default function Flashlight(props?: any) {
  const { tokens } = useTheme();
  const location = useLocation();
  const [on, setOn] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [color, setColor] = useState('#ffffff');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [strobe, setStrobe] = useState(0); // 0 (off), 1-15 (frequency)
  
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const wakeLockRef = useRef<any>(null);
  const strobeIntervalRef = useRef<any>(null);

  // Screen Wake Lock API (keep screen on)
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (on || torchOn)) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } else {
          wakeLockRef.current?.release();
          wakeLockRef.current = null;
        }
      } catch (err) {}
    };
    requestWakeLock();
    return () => { wakeLockRef.current?.release(); };
  }, [on, torchOn]);

  useEffect(() => {
    // Initial check for hardware torch support
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        const track = stream.getVideoTracks()[0];
        const capabilities = (track as any).getCapabilities?.();
        if (capabilities?.torch) {
          setTorchSupported(true);
        }
        stream.getTracks().forEach(t => t.stop());
      }).catch(() => {});

    return () => {
      stopTorch();
      if (strobeIntervalRef.current) clearInterval(strobeIntervalRef.current);
    };
  }, []);

  // Auto-activate when opened from chatbot
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
      // Turn on screen flashlight immediately
      setOn(true);
      // Attempt hardware torch on mobile
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
        .then(async stream => {
          const track = stream.getVideoTracks()[0];
          const caps = (track as any).getCapabilities?.();
          if (caps?.torch) {
            streamRef.current = stream;
            trackRef.current = track;
            try {
              await track.applyConstraints({ advanced: [{ torch: true }] } as any);
              setTorchOn(true);
              setTorchSupported(true);
            } catch {
              track.stop();
            }
          } else {
            stream.getTracks().forEach(t => t.stop());
          }
        }).catch(() => {});
    }
  }, [location.state]);

  const stopTorch = () => {
    if (trackRef.current) {
      try {
        trackRef.current.applyConstraints({ advanced: [{ torch: false }] } as any);
      } catch (e) {}
      trackRef.current.stop();
      trackRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    try {
      if (torchOn) {
        stopTorch();
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        
        try {
          await track.applyConstraints({ advanced: [{ torch: true }] } as any);
          setTorchOn(true);
        } catch (err) {
          track.stop();
          streamRef.current = null;
          trackRef.current = null;
          alert('Hardware torch is not supported on this camera/browser.');
        }
      }
    } catch (e) {
      alert('Camera access failed. Ensure permission is granted.');
    }
  };

  // Strobe effect for Screen Flash
  useEffect(() => {
    if (on && strobe > 0) {
      const interval = 1000 / strobe;
      strobeIntervalRef.current = setInterval(() => {
        setOn(prev => !prev);
      }, interval);
    } else {
      if (strobeIntervalRef.current) clearInterval(strobeIntervalRef.current);
    }
    return () => clearInterval(strobeIntervalRef.current);
  }, [on, strobe]);

  const colors = ['#ffffff', '#fffbe6', '#FFD700', '#FF4500', '#FF0000', '#00FF00', '#0000FF', '#8B5CF6'];

  return (
    <ToolWrapper toolName="Flashlight">
      {/* Clickable Full Screen Overlay (Tap Anywhere to Exit) */}
      <AnimatePresence>
        {on && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOn(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: color,
              opacity: brightness / 100,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ 
              background: 'rgba(0,0,0,0.5)', 
              color: '#fff', 
              padding: '10px 20px', 
              borderRadius: '20px', 
              fontSize: '12px',
              fontFamily: 'sans-serif',
              pointerEvents: 'none',
              opacity: 0.8
            }}>
              TAP ANYWHERE TO CLOSE
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={styles.container}>
        <div style={styles.visualContainer}>
          <motion.div
            style={{
              ...styles.glow,
              background: on ? color : 'transparent',
              boxShadow: on ? `0 0 100px ${color}80` : 'none'
            }}
            animate={{ scale: on ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          <div style={{ zIndex: 1 }}>
            <SkeuomorphicToggle
              checked={on}
              onChange={setOn}
              uncheckedLabel="O"
              checkedLabel="I"
              size={140}
            />
          </div>
        </div>

        <div style={styles.controls}>
          <div style={{ ...styles.controlGroup, background: tokens.surface, borderColor: tokens.border }}>
            <div style={styles.controlHeader}>
              <label style={{ ...styles.label, color: tokens.textSecondary }}>Screen Flashlight Options</label>
            </div>
            
            <div style={styles.sliderRow}>
              <span style={{ ...styles.valLabel, color: tokens.textPrimary }}>Brightness: {brightness}%</span>
              <input 
                type="range" min="10" max="100" 
                value={brightness} onChange={e => setBrightness(Number(e.target.value))} 
                style={styles.slider} 
              />
            </div>

            <div style={styles.sliderRow}>
              <span style={{ ...styles.valLabel, color: tokens.textPrimary }}>Strobe Speed: {strobe === 0 ? 'OFF' : `${strobe}Hz`}</span>
              <input 
                type="range" min="0" max="15" step="1"
                value={strobe} onChange={e => setStrobe(Number(e.target.value))} 
                style={styles.slider} 
              />
            </div>

            <div style={styles.palette}>
              {colors.map(c => (
                <button 
                  key={c} 
                  onClick={() => setColor(c)}
                  style={{
                    ...styles.colorDot,
                    background: c,
                    border: color === c ? `3px solid ${tokens.accent}` : '1px solid rgba(255,255,255,0.2)'
                  }}
                />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={styles.colorInp} />
            </div>
          </div>

          {torchSupported && (
            <motion.button
              onClick={toggleTorch}
              style={{
                ...styles.torchBtn,
                background: torchOn ? '#EF4444' : tokens.accent,
                color: '#fff'
              }}
              whileTap={{ scale: 0.97 }}
            >
              🔦 {torchOn ? 'HARDWARE TORCH ON' : 'USE HARDWARE FLASH'}
            </motion.button>
          )}
        </div>

        <p style={{ ...styles.hint, color: tokens.textSecondary }}>
          Screen flash mode uses the device screen as a soft light. Strobe mode flashes the screen rapidly.
        </p>
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', padding: '10px' },
  visualContainer: { position: 'relative', width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', inset: 0, borderRadius: '50%', filter: 'blur(40px)', zIndex: 0 },
  mainBtn: {
    width: '140px', height: '140px', borderRadius: '50%', border: '4px solid',
    fontSize: '18px', fontWeight: '900', cursor: 'pointer', zIndex: 1, 
    transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  controls: { width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '20px' },
  controlGroup: { padding: '20px', borderRadius: '20px', border: '1px solid' },
  controlHeader: { marginBottom: '16px' },
  label: { fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' },
  sliderRow: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  valLabel: { fontSize: '13px' },
  slider: { width: '100%', cursor: 'pointer' },
  palette: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' },
  colorDot: { width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', padding: 0 },
  colorInp: { width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'none', padding: 0, cursor: 'pointer' },
  torchBtn: {
    width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
  },
  hint: { fontSize: '12px', textAlign: 'center', maxWidth: '280px', opacity: 0.6 }
};
