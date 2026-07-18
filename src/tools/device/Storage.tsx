import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { ThemeContext } from '../../context/ThemeContext';

export default function Storage() {
  const { tokens } = useContext(ThemeContext);
  const [storage, setStorage] = useState<{ used: number; quota: number; free: number } | null>(null);
  const [breakdown, setBreakdown] = useState<Array<{ label: string; bytes: number; color: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);
  const [simulationData, setSimulationData] = useState<number>(0);

  const loadStorage = async () => {
    setLoading(true);
    
    // Check support or fallback
    if (!navigator.storage || !navigator.storage.estimate) {
      setIsSimulated(true);
      const used = 1200 * 1024 * 1024 + simulationData;
      const quota = 50 * 1024 * 1024 * 1024;
      setStorage({ used, quota, free: Math.max(0, quota - used) });
      setBreakdown([
        { label: "IndexedDB (Simulated)", bytes: 480 * 1024 * 1024 + (simulationData * 0.4), color: "#00d4ff" },
        { label: "Cache Storage (Simulated)", bytes: 600 * 1024 * 1024 + (simulationData * 0.5), color: "#c9a96e" },
        { label: "LocalStorage (Simulated)", bytes: 120 * 1024 * 1024 + (simulationData * 0.1), color: "#ff8800" }
      ]);
      setLoading(false);
      return;
    }

    try {
      const est = (await navigator.storage.estimate()) as any;
      const used = (est.usage || 0) + simulationData;
      const quota = est.quota || 0;
      const usageDetails = est.usageDetails || {};
      
      setStorage({ used, quota, free: Math.max(0, quota - used) });
      setIsSimulated(false);

      const items = [
        { label: "IndexedDB", bytes: (usageDetails.indexedDB || 0) + (simulationData * 0.4), color: "#00d4ff" },
        { label: "Cache Storage", bytes: (usageDetails.caches || 0) + (simulationData * 0.5), color: "#c9a96e" },
        { label: "Service Workers", bytes: usageDetails.serviceWorkerRegistrations || 0, color: "#e91e8c" },
        { 
          label: "LocalStorage & Other", 
          bytes: Math.max(0, used - ((usageDetails.indexedDB || 0) + (usageDetails.caches || 0) + (usageDetails.serviceWorkerRegistrations || 0))),
          color: "#ff8800" 
        },
      ].filter(i => i.bytes > 0);

      setBreakdown(items.length ? items : [{ label: "App Storage", bytes: used, color: "#00d4ff" }]);
    } catch (e) {
      console.warn("Navigator storage estimate failed, using simulation fallback:", e);
      setIsSimulated(true);
      const used = 1200 * 1024 * 1024 + simulationData;
      const quota = 50 * 1024 * 1024 * 1024;
      setStorage({ used, quota, free: Math.max(0, quota - used) });
      setBreakdown([
        { label: "IndexedDB (Simulated)", bytes: 480 * 1024 * 1024 + (simulationData * 0.4), color: "#00d4ff" },
        { label: "Cache Storage (Simulated)", bytes: 600 * 1024 * 1024 + (simulationData * 0.5), color: "#c9a96e" },
        { label: "LocalStorage (Simulated)", bytes: 120 * 1024 * 1024 + (simulationData * 0.1), color: "#ff8800" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStorage();
  }, [simulationData]);

  const fmt = (bytes: number) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0, n = bytes;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i++;
    }
    return `${n.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  };

  const clearCache = async () => {
    try {
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      }
      localStorage.clear();
      setSimulationData(0);
      await loadStorage();
      alert("Storage cleared successfully!");
    } catch (err) {
      alert("Failed to clear some storage data: " + err);
    }
  };

  const addSimulatedData = () => {
    setSimulationData(prev => prev + 50 * 1024 * 1024);
  };

  const usedPct = storage ? Math.min(100, Math.round((storage.used / storage.quota) * 100)) : 0;
  const R = 80, CX = 100, CY = 100;
  const circum = 2 * Math.PI * R;
  const usedDash = (usedPct / 100) * circum;

  return (
    <ToolWrapper toolName="Storage Analyzer">
      <div style={styles.container}>
        {loading && (
          <div style={styles.loaderContainer}>
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ 
                width: 48, height: 48, 
                border: `4px solid ${tokens.border}`,
                borderTop: `4px solid ${tokens.accent}`, 
                borderRadius: "50%" 
              }} 
            />
            <span style={{ color: tokens.textSecondary, marginTop: 12 }}>Analyzing device storage...</span>
          </div>
        )}

        {isSimulated && !loading && (
          <div style={styles.simulatedBanner}>
            ⚠️ Private Mode / Unsupported Browser: Using simulated storage estimates.
          </div>
        )}

        {storage && !loading && (
          <AnimatePresence mode="wait">
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}
            >
              {/* Donut chart */}
              <div style={styles.chartWrapper}>
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <circle cx={CX} cy={CY} r={R} fill="none" stroke={tokens.border} strokeWidth="18" />
                  <motion.circle 
                    cx={CX} 
                    cy={CY} 
                    r={R} 
                    fill="none"
                    stroke={`url(#storageGrad)`} 
                    strokeWidth="18"
                    strokeLinecap="round" 
                    strokeDasharray={`${circum}`}
                    initial={{ strokeDashoffset: circum }}
                    animate={{ strokeDashoffset: circum - usedDash }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    transform={`rotate(-90 ${CX} ${CY})`} 
                  />
                  <defs>
                    <linearGradient id="storageGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#e91e8c" />
                      <stop offset="100%" stopColor={tokens.accent} />
                    </linearGradient>
                  </defs>
                  <text x={CX} y={CY - 4} textAnchor="middle" fontFamily="'Orbitron', sans-serif" fontSize="28" fontWeight="900" fill={tokens.textPrimary}>
                    {usedPct}%
                  </text>
                  <text x={CX} y={CY + 18} textAnchor="middle" fontFamily="'Rajdhani', sans-serif" fontSize="13" fontWeight="700" fill={tokens.textSecondary} letterSpacing="1px">
                    CAPACITY USED
                  </text>
                </svg>
              </div>

              {/* Summary Cards */}
              <div style={styles.summaryGrid}>
                {[
                  { label: "Used Space", value: fmt(storage.used), color: "#e91e8c" },
                  { label: "Free Space", value: fmt(storage.free), color: tokens.accent },
                  { label: "Total Quota", value: fmt(storage.quota), color: "#c9a96e" },
                ].map(s => (
                  <div key={s.label} style={{ ...styles.card, borderColor: tokens.border, backgroundColor: tokens.surface }}>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 'clamp(12px, 3.5vw, 15px)', fontWeight: '900', color: s.color }}>
                      {s.value}
                    </div>
                    <div style={{ color: tokens.textSecondary, fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              {breakdown.length > 0 && (
                <div style={{ width: "100%" }}>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#c9a96e", letterSpacing: 2, marginBottom: 16 }}>
                    STORAGE BREAKDOWN
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {breakdown.map(item => {
                      const pct = storage.used > 0 ? Math.min(100, Math.round((item.bytes / storage.used) * 100)) : 0;
                      return (
                        <div key={item.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
                              <span style={{ color: tokens.textPrimary, fontSize: 14, fontWeight: '600' }}>{item.label}</span>
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                              <span style={{ color: tokens.textSecondary, fontSize: 13 }}>{pct}%</span>
                              <span style={{ fontFamily: "'Orbitron', sans-serif", color: item.color, fontSize: 13, fontWeight: '700' }}>
                                {fmt(item.bytes)}
                              </span>
                            </div>
                          </div>
                          <div style={{ height: 6, background: tokens.border, borderRadius: 3, overflow: "hidden" }}>
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                              style={{ height: "100%", background: item.color, borderRadius: 3 }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions Section */}
              <div style={styles.actions}>
                <motion.button 
                  whileHover={{ scale: 1.03 }} 
                  whileTap={{ scale: 0.97 }}
                  onClick={loadStorage}
                  style={{ ...styles.btn, background: 'rgba(255,255,255,0.06)', border: `1px solid ${tokens.border}`, color: tokens.textPrimary }}
                >
                  Refresh Analyzer
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.03 }} 
                  whileTap={{ scale: 0.97 }}
                  onClick={addSimulatedData}
                  style={{ ...styles.btn, background: `linear-gradient(135deg, ${tokens.accent}, #8B5CF6)`, color: '#fff' }}
                >
                  Simulate +50MB Data
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.03 }} 
                  whileTap={{ scale: 0.97 }}
                  onClick={clearCache}
                  style={{ ...styles.btn, background: '#ef444420', border: '1px solid #ef4444', color: '#ef4444' }}
                >
                  Clear Cached Data
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: "flex", flexDirection: "column", alignItems: "center", gap: 20, maxWidth: 520, margin: "0 auto", padding: "10px" },
  loaderContainer: { display: "flex", flexDirection: "column", alignItems: "center", padding: 60 },
  simulatedBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    color: '#ef4444',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    width: '100%',
    textAlign: 'center',
    fontFamily: 'sans-serif'
  },
  chartWrapper: { display: "flex", justifyContent: "center", position: "relative" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, width: "100%" },
  card: {
    border: "1px solid",
    borderRadius: 14,
    padding: "14px 8px",
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  actions: { display: "flex", flexWrap: "wrap", gap: 10, width: "100%", justifyContent: "center", marginTop: 12 },
  btn: {
    padding: "12px 20px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: '1px',
    flex: 1,
    minWidth: '140px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
  }
};
