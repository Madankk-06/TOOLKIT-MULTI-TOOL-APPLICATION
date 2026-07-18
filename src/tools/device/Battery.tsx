import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import ToolWrapper from '../../components/ToolWrapper';
import { ThemeContext } from '../../context/ThemeContext';

interface BatteryEntry {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  time: string;
}

export default function Battery() {
  const { tokens } = useContext(ThemeContext);
  const [battery, setBattery] = useState<BatteryEntry | null>(null);
  const [supported, setSupported] = useState<boolean>(true);
  const [history, setHistory] = useState<BatteryEntry[]>([]);

  useEffect(() => {
    const nav = navigator as any;
    if (!nav.getBattery) {
      setSupported(false);
      return;
    }
    let bat: any;
    
    const update = (b: any) => {
      const entry: BatteryEntry = {
        level: Math.round(b.level * 100),
        charging: b.charging,
        chargingTime: b.chargingTime,
        dischargingTime: b.dischargingTime,
        time: new Date().toLocaleTimeString(),
      };
      setBattery(entry);
      setHistory(h => [entry, ...h.slice(0, 9)]);
    };

    const init = async () => {
      try {
        bat = await nav.getBattery();
        update(bat);
        bat.addEventListener("chargingchange", () => update(bat));
        bat.addEventListener("levelchange", () => update(bat));
        bat.addEventListener("chargingtimechange", () => update(bat));
        bat.addEventListener("dischargingtimechange", () => update(bat));
      } catch {
        setSupported(false);
      }
    };
    init();
    
    return () => {
      if (bat) {
        bat.removeEventListener("chargingchange", () => {});
        bat.removeEventListener("levelchange", () => {});
      }
    };
  }, []);

  const formatTime = (secs: number) => {
    if (!secs || secs === Infinity) return "Unknown";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getColor = (level: number) => {
    if (level > 60) return "#00d4ff";
    if (level > 25) return "#c9a96e";
    return "#ff4444";
  };

  const getHealth = (level: number) => {
    if (level > 80) return { label: "Excellent", color: "#00d4ff" };
    if (level > 50) return { label: "Good", color: "#c9a96e" };
    if (level > 25) return { label: "Low", color: "#ff8800" };
    return { label: "Critical", color: "#ff4444" };
  };

  const lvl = battery?.level ?? 0;
  const color = getColor(lvl);
  const health = getHealth(lvl);

  // SVG battery dimensions
  const BW = 180, BH = 90, TH = 20, TW = 12;
  const fillW = Math.round(((BW - 12) * lvl) / 100);

  return (
    <ToolWrapper toolName="Battery Status">
      <div style={styles.container}>
        {!supported ? (
          <div style={{ ...styles.errorCard, borderColor: 'rgba(255,68,68,0.3)', backgroundColor: 'rgba(255,68,68,0.08)', color: '#ff6666' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔋</div>
            Battery estimation API is not supported in this browser. Try on a mobile device or a Chromium-based browser (e.g. Chrome/Edge).
          </div>
        ) : !battery ? (
          <div style={{ color: tokens.textSecondary, padding: 40, textAlign: 'center' }}>
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{ 
                width: 40, height: 40, 
                border: `3px solid ${tokens.border}`,
                borderTop: `3px solid ${tokens.accent}`, 
                borderRadius: "50%", 
                margin: "0 auto 16px" 
              }} 
            />
            Reading battery status...
          </div>
        ) : (
          <>
            {/* Big battery SVG */}
            <div style={{ position: "relative" }}>
              {battery.charging && (
                <motion.div 
                  animate={{ opacity: [0.4, 1, 0.4] }} 
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ 
                    position: "absolute", inset: -16, borderRadius: 20,
                    background: `radial-gradient(ellipse, ${color}18 0%, transparent 70%)`,
                    pointerEvents: "none" 
                  }} 
                />
              )}
              <svg width={BW + TW + 10} height={BH + 10} viewBox={`0 0 ${BW + TW + 10} ${BH + 10}`}>
                <defs>
                  <linearGradient id="battFill" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                    <stop offset="100%" stopColor={color} />
                  </linearGradient>
                  <linearGradient id="battBody" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2a2a35" />
                    <stop offset="100%" stopColor="#1a1a22" />
                  </linearGradient>
                  <filter id="battGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {/* Body */}
                <rect x="5" y="5" width={BW} height={BH} rx="12"
                  fill="url(#battBody)" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
                {/* Terminal nub */}
                <rect x={BW + 5} y={5 + (BH - TH) / 2} width={TW} height={TH} rx="4"
                  fill="#3a3a48" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" />
                {/* Fill */}
                <motion.rect x="11" y="11" height={BH - 12} rx="6"
                  initial={{ width: 0 }}
                  animate={{ width: Math.max(0, fillW) }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  fill="url(#battFill)"
                  filter={lvl > 20 ? "url(#battGlow)" : "none"} 
                />
                {/* Level text */}
                <text x={BW / 2 + 5} y={BH / 2 + 5 + 5}
                  textAnchor="middle" fontFamily="Orbitron,sans-serif"
                  fontSize="28" fontWeight="700" fill="white">
                  {lvl}%
                </text>
                {/* Charging bolt */}
                {battery.charging && (
                  <motion.text x={BW / 2 + 5} y={BH / 2 - 12 + 5}
                    textAnchor="middle" fontSize="20"
                    animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 0.8, repeat: Infinity }}>
                    ⚡
                  </motion.text>
                )}
              </svg>
            </div>

            {/* Status label */}
            <div style={{ textAlign: "center" }}>
              <div style={{ 
                fontFamily: "'Orbitron',sans-serif", fontSize: 22,
                color: battery.charging ? "#00d4ff" : color, letterSpacing: 3,
                textShadow: `0 0 20px ${color}`,
                fontWeight: '900'
              }}>
                {battery.charging ? "CHARGING" : lvl === 100 ? "FULLY CHARGED" : "ON BATTERY"}
              </div>
              <div style={{ color: tokens.textSecondary, fontSize: 13, marginTop: 6, fontWeight: '600' }}>
                {battery.charging
                  ? `Fully charged in ${formatTime(battery.chargingTime)}`
                  : `${formatTime(battery.dischargingTime)} remaining`}
              </div>
            </div>

            {/* Stats grid */}
            <div style={styles.grid}>
              {[
                { label: "Charge Level", value: `${lvl}%`, color },
                { label: "Power Source", value: battery.charging ? "AC / USB" : "Battery", color: battery.charging ? "#00d4ff" : "#c9a96e" },
                { label: "Battery Health", value: health.label, color: health.color },
                { label: "Last Checked", value: battery.time, color: tokens.textPrimary },
              ].map(s => (
                <div key={s.label} style={{ ...styles.card, borderColor: tokens.border, backgroundColor: tokens.surface }}>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 900, color: s.color, marginBottom: 4 }}>
                    {s.value}
                  </div>
                  <div style={{ color: tokens.textSecondary, fontSize: 12 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Level bar */}
            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: tokens.textSecondary, fontSize: 12, fontWeight: '700' }}>Battery Level</span>
                <span style={{ color, fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: '900' }}>{lvl}%</span>
              </div>
              <div style={{ height: 8, background: tokens.border, borderRadius: 4, overflow: "hidden" }}>
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: `${lvl}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${color}88, ${color})` }} 
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: tokens.textSecondary, fontSize: 11 }}>
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>

            {/* History chart simulation */}
            {history.length > 1 && (
              <div style={{ width: "100%" }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, color: "#c9a96e", letterSpacing: 2, marginBottom: 12 }}>
                  LEVEL HISTORY LOG
                </div>
                <div style={styles.historyBarChart}>
                  {history.slice().reverse().map((h, i) => (
                    <div 
                      key={i} 
                      title={`${h.level}% at ${h.time}`}
                      style={{ 
                        flex: 1, 
                        borderRadius: "3px 3px 0 0",
                        height: `${h.level}%`, 
                        minHeight: 4,
                        background: getColor(h.level),
                        opacity: 0.4 + (i / history.length) * 0.6 
                      }} 
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ToolWrapper>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: "flex", flexDirection: "column", alignItems: "center", gap: 24, maxWidth: 520, margin: "0 auto", padding: "10px" },
  errorCard: { border: "1px solid", borderRadius: 14, padding: "20px 24px", textAlign: "center" },
  grid: { display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, width: "100%" },
  card: { border: "1px solid", borderRadius: 14, padding: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
  historyBarChart: { display: "flex", gap: 6, alignItems: "flex-end", height: 60, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "10px 10px 0", borderRadius: 12 }
};
