import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";

export default function RAMInfo() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [isChrome, setIsChrome] = useState(false);
  const intervalRef = useRef(null);

  const fmt = (bytes) => {
    if (!bytes && bytes !== 0) return "N/A";
    const mb = bytes / 1048576;
    return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
  };

  const read = () => {
    const mem = performance.memory;
    const deviceRAM = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency;

    if (mem) {
      const used   = mem.usedJSHeapSize;
      const total  = mem.totalJSHeapSize;
      const limit  = mem.jsHeapSizeLimit;
      const usedPct  = Math.round((used / limit) * 100);
      const totalPct = Math.round((total / limit) * 100);
      setData({ used, total, limit, usedPct, totalPct, deviceRAM, cores });
      setHistory(h => [...h.slice(-29), { used, time: new Date().toLocaleTimeString() }]);
      setIsChrome(true);
    } else {
      setIsChrome(false);
      setData({ deviceRAM, cores });
    }
  };

  useEffect(() => {
    read();
    intervalRef.current = setInterval(read, 1500);
    return () => clearInterval(intervalRef.current);
  }, []);

  const getColor = (pct) => {
    if (pct < 50) return "#00d4ff";
    if (pct < 75) return "#c9a96e";
    return "#ff4444";
  };

  return (
    <div style={{ fontFamily: "'Rajdhani',sans-serif", minHeight: "100vh", background: "#0a0a0f", color: "white" }}>
      <div style={{ padding: "20px 24px 0" }}>
        <BackButton />
      </div>

      <div style={{ textAlign: "center", padding: "12px 24px 0" }}>
        <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(18px,4vw,26px)",
          fontWeight: 700, margin: 0, letterSpacing: 3 }}>RAM INFO</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 6, fontSize: 14 }}>
          Memory usage &amp; JavaScript heap monitor
        </p>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 24px 40px" }}>
        {/* Device RAM */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,169,110,0.3)",
            borderRadius: 16, padding: "20px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔧</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 28,
              fontWeight: 700, color: "#c9a96e" }}>
              {data?.deviceRAM ? `${data.deviceRAM} GB` : "?"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>
              Device RAM
            </div>
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 4 }}>
              (rounded to nearest GB)
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,212,255,0.3)",
            borderRadius: 16, padding: "20px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⚙️</div>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 28,
              fontWeight: 700, color: "#00d4ff" }}>
              {data?.cores || "?"}
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 4 }}>
              CPU Cores
            </div>
            <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 4 }}>
              Logical processors
            </div>
          </div>
        </div>

        {isChrome && data ? (
          <>
            {/* JS Heap bars */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: "20px", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11,
                color: "#c9a96e", letterSpacing: 2, marginBottom: 16 }}>
                JAVASCRIPT HEAP MEMORY · LIVE
              </div>

              {/* Live update indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <motion.div animate={{ opacity: [0.4,1,0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4ff" }} />
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                  Updating every 1.5s
                </span>
              </div>

              {[
                { label: "Used Heap",   value: fmt(data.used),  pct: data.usedPct,  color: getColor(data.usedPct) },
                { label: "Total Heap",  value: fmt(data.total), pct: data.totalPct, color: "#c9a96e" },
                { label: "Heap Limit",  value: fmt(data.limit), pct: 100,           color: "rgba(255,255,255,0.2)" },
              ].map((s, i) => (
                <div key={s.label} style={{ marginBottom: i < 2 ? 20 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>{s.label}</span>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{s.pct}%</span>
                      <span style={{ fontFamily: "'Orbitron',sans-serif", color: s.color, fontSize: 14 }}>
                        {s.value}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 10, background: "rgba(255,255,255,0.07)", borderRadius: 5, overflow: "hidden" }}>
                    <motion.div animate={{ width: `${s.pct}%` }} transition={{ duration: 0.6, ease: "easeOut" }}
                      style={{ height: "100%", background: s.color, borderRadius: 5,
                        boxShadow: s.pct > 70 ? `0 0 8px ${s.color}` : "none" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* History sparkline */}
            {history.length > 2 && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14, padding: "16px" }}>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10,
                  color: "#c9a96e", letterSpacing: 2, marginBottom: 10 }}>HEAP USAGE HISTORY</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60 }}>
                  {history.map((h, i) => {
                    const pct = (h.used / data.limit) * 100;
                    return (
                      <div key={i} title={`${fmt(h.used)} at ${h.time}`}
                        style={{ flex: 1, borderRadius: "2px 2px 0 0",
                          height: `${Math.max(4, pct)}%`, minHeight: 4,
                          background: getColor(pct),
                          opacity: 0.4 + (i / history.length) * 0.6,
                          transition: "height 0.3s" }} />
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between",
                  color: "rgba(255,255,255,0.2)", fontSize: 10, marginTop: 4 }}>
                  <span>Oldest</span><span>Now</span>
                </div>
              </div>
            )}

            {/* Tips */}
            {data.usedPct > 70 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: "rgba(255,136,0,0.1)", border: "1px solid rgba(255,136,0,0.3)",
                  borderRadius: 12, padding: "12px 16px", marginTop: 12 }}>
                <div style={{ color: "#ff8800", fontSize: 14, lineHeight: 1.6 }}>
                  💡 JS heap usage is high ({data.usedPct}%). Close unused browser tabs to free memory.
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div style={{ background: "rgba(255,136,0,0.08)", border: "1px solid rgba(255,136,0,0.25)",
            borderRadius: 14, padding: "20px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>ℹ️</div>
            <div style={{ color: "#ff8800", fontSize: 14, lineHeight: 1.7 }}>
              Detailed JS heap memory monitoring requires Google Chrome or Chromium-based browsers.
              <br/><br/>
              The device RAM and CPU cores shown above are available in all browsers.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
