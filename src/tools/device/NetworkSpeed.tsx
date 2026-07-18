import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { ThemeContext } from '../../context/ThemeContext';

interface HistoryEntry {
  speed: number;
  latency: number | null;
  time: string;
}

export default function NetworkSpeed() {
  const { tokens } = useContext(ThemeContext);
  const [status, setStatus] = useState<'idle' | 'testing' | 'done' | 'error'>("idle");
  const [speed, setSpeed] = useState<number>(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [connInfo, setConnInfo] = useState<Record<string, string | boolean>>({});
  const [progress, setProgress] = useState<number>(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  
  const abortRef = useRef<AbortController | null>(null);
  const animRef = useRef<number | null>(null);
  const displaySpeed = useRef<number>(0);

  useEffect(() => {
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      setConnInfo({
        type: conn.effectiveType?.toUpperCase() || "Unknown",
        downlink: conn.downlink ? `${conn.downlink} Mbps` : "Unknown",
        rtt: conn.rtt ? `${conn.rtt} ms` : "Unknown",
        saveData: !!conn.saveData,
      });
    }
    const onOnline  = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const animateSpeed = (target: number) => {
    const step = () => {
      displaySpeed.current += (target - displaySpeed.current) * 0.12;
      setSpeed(parseFloat(displaySpeed.current.toFixed(2)));
      if (Math.abs(target - displaySpeed.current) > 0.01) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setSpeed(target);
        displaySpeed.current = target;
      }
    };
    animRef.current = requestAnimationFrame(step);
  };

  const measureLatency = async () => {
    try {
      const t0 = performance.now();
      await fetch("https://www.google.com/favicon.ico?nocache=" + Date.now(), {
        mode: "no-cors",
        cache: "no-store"
      });
      return Math.round(performance.now() - t0);
    } catch {
      return null;
    }
  };

  const runTest = async () => {
    if (status === "testing") return;
    setStatus("testing");
    setSpeed(0);
    setProgress(0);
    displaySpeed.current = 0;
    abortRef.current = new AbortController();

    // Measure latency first
    setProgress(10);
    const lat = await measureLatency();
    setLatency(lat);
    setProgress(30);

    try {
      // Fetch 1MB of bytes and time it
      const sizes = [500000, 1000000]; // 1.5MB total
      let totalBytes = 0;
      const t0 = performance.now();

      for (let i = 0; i < sizes.length; i++) {
        if (abortRef.current?.signal.aborted) throw new DOMException("Aborted", "AbortError");
        
        const url = `https://httpbin.org/bytes/${sizes[i]}?t=${Date.now()}`;
        try {
          const res = await fetch(url, {
            signal: abortRef.current.signal,
            cache: "no-store",
          });
          const buf = await res.arrayBuffer();
          totalBytes += buf.byteLength;
        } catch (fetchErr) {
          // Fallback to picsum image fetch if httpbin fails
          const imgUrl = `https://picsum.photos/400/300?random=${Date.now()}`;
          const res = await fetch(imgUrl, { signal: abortRef.current?.signal, cache: "no-store" });
          const buf = await res.arrayBuffer();
          totalBytes += buf.byteLength;
        }
        setProgress(40 + (i + 1) * 30);
      }

      const elapsed = (performance.now() - t0) / 1000; // seconds
      const bits = totalBytes * 8;
      const mbps = parseFloat(((bits / elapsed) / 1000000).toFixed(2));
      setProgress(100);
      animateSpeed(mbps);
      setStatus("done");
      const entry: HistoryEntry = { speed: mbps, latency: lat, time: new Date().toLocaleTimeString() };
      setHistory(h => [entry, ...h.slice(0, 4)]);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        const conn = (navigator as any).connection;
        if (conn?.downlink) {
          animateSpeed(conn.downlink);
          setStatus("done");
        } else {
          setStatus("error");
        }
      }
    }
  };

  const stopTest = () => {
    abortRef.current?.abort();
    setStatus("idle");
    setProgress(0);
  };

  const getSpeedRating = (mbps: number) => {
    if (mbps >= 100) return { label: "Blazing Fast", color: "#00d4ff" };
    if (mbps >= 25)  return { label: "High Speed",   color: tokens.accent };
    if (mbps >= 10)  return { label: "Good Speed",   color: "#c9a96e" };
    if (mbps >= 5)   return { label: "Moderate",     color: "#ff8800" };
    return                  { label: "Slow Speed",   color: "#ff4444" };
  };

  const maxMbps = 200;
  const rating = speed > 0 ? getSpeedRating(speed) : null;

  return (
    <ToolWrapper toolName="Network Speed Test">
      <div style={styles.container}>
        {/* Speedometer Gauge */}
        <div style={styles.gaugeContainer}>
          <svg width="220" height="150" viewBox="0 0 200 130">
            <defs>
              <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ff4444" />
                <stop offset="50%" stopColor="#ff8800" />
                <stop offset="100%" stopColor={tokens.accent} />
              </linearGradient>
            </defs>
            {/* Background Arc */}
            <path 
              d="M 20 110 A 80 80 0 0 1 180 110" 
              fill="none" 
              stroke={tokens.border} 
              strokeWidth="14" 
              strokeLinecap="round" 
            />
            {/* Filled Arc based on current speed */}
            <path 
              d="M 20 110 A 80 80 0 0 1 180 110" 
              fill="none" 
              stroke="url(#gaugeGrad)" 
              strokeWidth="14" 
              strokeLinecap="round" 
              strokeDasharray={`${Math.PI * 80}`}
              strokeDashoffset={`${Math.PI * 80 * (1 - Math.min(speed, maxMbps) / maxMbps)}`}
              style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
            />
            {/* Needle */}
            <g transform={`translate(100, 110) rotate(${Math.min(180, (speed / maxMbps) * 180) - 90})`} style={{ transition: 'transform 0.3s ease-out' }}>
              <line x1="0" y1="0" x2="0" y2="-75" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              <circle cx="0" cy="0" r="8" fill="#fff" />
              <circle cx="0" cy="0" r="4" fill={tokens.accent} />
            </g>
          </svg>
          <div style={styles.speedDisplay}>
            <span style={{ fontSize: 44, fontWeight: 900, color: tokens.textPrimary }}>{speed}</span>
            <span style={{ fontSize: 16, color: tokens.textSecondary, marginLeft: 4, fontWeight: '700' }}>Mbps</span>
          </div>
          {rating && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              style={{ ...styles.ratingBadge, backgroundColor: `${rating.color}15`, borderColor: `${rating.color}40`, color: rating.color }}
            >
              {rating.label}
            </motion.div>
          )}
        </div>

        {/* Diagnostic Grid */}
        <div style={styles.grid}>
          <div style={{ ...styles.card, borderColor: tokens.border, backgroundColor: tokens.surface }}>
            <span style={{ fontSize: 20 }}>📶</span>
            <span style={{ fontSize: 13, color: tokens.textSecondary, fontWeight: '700' }}>STATUS</span>
            <span style={{ fontSize: 15, fontWeight: '900', color: online ? '#22c55e' : '#ef4444' }}>
              {online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <div style={{ ...styles.card, borderColor: tokens.border, backgroundColor: tokens.surface }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <span style={{ fontSize: 13, color: tokens.textSecondary, fontWeight: '700' }}>LATENCY</span>
            <span style={{ fontSize: 15, fontWeight: '900', color: tokens.textPrimary }}>
              {latency !== null ? `${latency} ms` : '--'}
            </span>
          </div>
          {connInfo.type && (
            <div style={{ ...styles.card, borderColor: tokens.border, backgroundColor: tokens.surface }}>
              <span style={{ fontSize: 20 }}>📡</span>
              <span style={{ fontSize: 13, color: tokens.textSecondary, fontWeight: '700' }}>TYPE</span>
              <span style={{ fontSize: 15, fontWeight: '900', color: tokens.textPrimary }}>
                {String(connInfo.type)}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {status === 'testing' && (
          <div style={styles.progressContainer}>
            <div style={{ ...styles.progressBar, background: tokens.border }}>
              <motion.div 
                animate={{ width: `${progress}%` }} 
                transition={{ duration: 0.4 }}
                style={{ ...styles.progressFill, background: tokens.accent }} 
              />
            </div>
            <span style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 6 }}>
              Testing network speed... {progress}%
            </span>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          {status === 'testing' ? (
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
              onClick={stopTest} 
              style={{ ...styles.btn, background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444' }}
            >
              Cancel Test
            </motion.button>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
              onClick={runTest} 
              disabled={!online}
              style={{ 
                ...styles.btn, 
                background: online ? `linear-gradient(135deg, ${tokens.accent}, #8B5CF6)` : 'rgba(255,255,255,0.06)', 
                color: online ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: online ? 'pointer' : 'not-allowed'
              }}
            >
              Run Speed Test
            </motion.button>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={styles.historyContainer}>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#c9a96e", letterSpacing: 2, marginBottom: 12 }}>
              RECENT RESULTS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((h, i) => (
                <div key={i} style={{ ...styles.historyRow, borderColor: tokens.border, backgroundColor: tokens.surface }}>
                  <span style={{ fontSize: 12, color: tokens.textSecondary }}>{h.time}</span>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <span style={{ fontSize: 13, color: tokens.textPrimary, fontWeight: '700' }}>
                      ⚡ {h.latency !== null ? `${h.latency} ms` : '--'}
                    </span>
                    <span style={{ fontSize: 13, color: tokens.accent, fontWeight: '900' }}>
                      🚀 {h.speed} Mbps
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, maxWidth: 520, margin: '0 auto', padding: '10px' },
  gaugeContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', width: '100%' },
  speedDisplay: { marginTop: -15, display: 'flex', alignItems: 'baseline' },
  ratingBadge: {
    marginTop: 12,
    padding: '4px 14px',
    borderRadius: '12px',
    border: '1px solid',
    fontSize: '12px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, width: '100%' },
  card: {
    border: '1px solid',
    borderRadius: 14,
    padding: '16px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  progressContainer: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  progressBar: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  actions: { width: '100%', display: 'flex', justifyContent: 'center' },
  btn: {
    width: '100%',
    padding: '14px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '1.5px',
    textAlign: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
  },
  historyContainer: { width: '100%', marginTop: 8 },
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid'
  }
};
