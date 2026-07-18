import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";

export default function CPUInfo() {
  const navigate = useNavigate();
  const [info, setInfo] = useState({});
  const [benchScore, setBenchScore] = useState(null);
  const [benchRunning, setBenchRunning] = useState(false);
  const [benchProgress, setBenchProgress] = useState(0);
  const workerRef = useRef(null);

  useEffect(() => {
    const cores = navigator.hardwareConcurrency || "Unknown";
    const ram   = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "Unknown";
    const platform = navigator.platform || "Unknown";
    const ua = navigator.userAgent;

    // Determine tier
    const coreNum = parseInt(cores) || 2;
    const ramNum  = parseFloat(navigator.deviceMemory) || 2;
    let tier = "Entry Level";
    let tierColor = "#ff8800";
    if (coreNum >= 8 && ramNum >= 8) { tier = "High Performance"; tierColor = "#00d4ff"; }
    else if (coreNum >= 4 && ramNum >= 4) { tier = "Mid Range"; tierColor = "#c9a96e"; }

    // JS Heap (Chrome only)
    const mem = performance.memory;
    const heapUsed  = mem ? `${(mem.usedJSHeapSize  / 1048576).toFixed(1)} MB` : "N/A";
    const heapTotal = mem ? `${(mem.totalJSHeapSize / 1048576).toFixed(1)} MB` : "N/A";
    const heapLimit = mem ? `${(mem.jsHeapSizeLimit / 1048576).toFixed(0)} MB` : "N/A";

    setInfo({ cores, ram, platform, tier, tierColor, heapUsed, heapTotal, heapLimit });
  }, []);

  const runBenchmark = () => {
    setBenchRunning(true);
    setBenchProgress(0);
    setBenchScore(null);

    const start = performance.now();
    let ops = 0;
    const ITERATIONS = 5_000_000;
    const CHUNK = 500_000;

    const doChunk = () => {
      for (let i = 0; i < CHUNK; i++) {
        ops++;
        Math.sqrt(ops * 1.00001);
      }
      const pct = Math.min(100, Math.round((ops / ITERATIONS) * 100));
      setBenchProgress(pct);
      if (ops < ITERATIONS) {
        setTimeout(doChunk, 0);
      } else {
        const elapsed = performance.now() - start;
        const score = Math.round((ITERATIONS / elapsed) * 100);
        setBenchScore(score);
        setBenchRunning(false);
      }
    };
    doChunk();
  };

  const getBenchRating = (score) => {
    if (score > 800000) return { label: "Exceptional",  color: "#00d4ff" };
    if (score > 500000) return { label: "High",         color: "#c9a96e" };
    if (score > 250000) return { label: "Good",         color: "#c9a96e" };
    if (score > 100000) return { label: "Average",      color: "#ff8800" };
    return                    { label: "Low",           color: "#ff4444" };
  };

  const GearSVG = () => (
    <svg width="80" height="80" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="gearGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c0c0d0"/>
          <stop offset="50%" stopColor="#8a8a9a"/>
          <stop offset="100%" stopColor="#5a5a6a"/>
        </linearGradient>
        <linearGradient id="gearGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0c080"/>
          <stop offset="100%" stopColor="#a07840"/>
        </linearGradient>
      </defs>
      {/* Gear teeth */}
      {[0,45,90,135,180,225,270,315].map((deg,i) => (
        <rect key={i} x="29" y="4" width="6" height="10" rx="2"
          fill="url(#gearGrad)"
          transform={`rotate(${deg} 32 32)`} />
      ))}
      {/* Main body */}
      <circle cx="32" cy="32" r="18" fill="url(#gearGrad)" />
      <circle cx="32" cy="32" r="10" fill="#1a1a22" />
      <circle cx="32" cy="32" r="6"  fill="url(#gearGold)" />
      <circle cx="32" cy="32" r="2"  fill="#0a0a0f" />
    </svg>
  );

  return (
    <div style={{ fontFamily: "'Rajdhani',sans-serif", minHeight: "100vh", background: "#0a0a0f", color: "white" }}>
      <div style={{ padding: "20px 24px 0" }}>
        <BackButton />
      </div>

      <div style={{ textAlign: "center", padding: "12px 24px 0" }}>
        <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(18px,4vw,26px)",
          fontWeight: 700, margin: 0, letterSpacing: 3 }}>CPU INFO</h1>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>

        {/* Animated gear */}
        <motion.div animate={{ rotate: benchRunning ? 360 : 0 }}
          transition={{ duration: benchRunning ? 1.5 : 0, repeat: Infinity, ease: "linear" }}>
          <GearSVG />
        </motion.div>

        {/* Tier badge */}
        <div style={{ background: `${info.tierColor}18`, border: `1px solid ${info.tierColor}66`,
          borderRadius: 12, padding: "12px 28px", textAlign: "center" }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 18,
            color: info.tierColor, letterSpacing: 2 }}>{info.tier}</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 3 }}>
            Performance Tier
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }}>
          {[
            { label: "CPU Cores (Logical)", value: info.cores, color: "#00d4ff" },
            { label: "Device RAM",          value: info.ram,   color: "#c9a96e" },
            { label: "Platform",            value: info.platform, color: "white" },
            { label: "JS Heap Used",        value: info.heapUsed, color: "#e91e8c" },
            { label: "JS Heap Total",       value: info.heapTotal, color: "#c9a96e" },
            { label: "JS Heap Limit",       value: info.heapLimit, color: "rgba(255,255,255,0.6)" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16,
                fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value || "—"}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Benchmark */}
        <div style={{ width: "100%", background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px" }}>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12,
            color: "#c9a96e", letterSpacing: 2, marginBottom: 14 }}>JS PERFORMANCE BENCHMARK</div>

          {benchRunning && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Running benchmark...</span>
                <span style={{ color: "#00d4ff", fontFamily: "'Orbitron',sans-serif" }}>{benchProgress}%</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                <motion.div animate={{ width: `${benchProgress}%` }} transition={{ duration: 0.2 }}
                  style={{ height: "100%", background: "linear-gradient(90deg,#e91e8c,#00d4ff)", borderRadius: 3 }} />
              </div>
            </div>
          )}

          {benchScore !== null && !benchRunning && (
            <div style={{ marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 40,
                fontWeight: 700, color: getBenchRating(benchScore).color }}>
                {benchScore.toLocaleString()}
              </div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>ops/second</div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 14,
                color: getBenchRating(benchScore).color, marginTop: 6, letterSpacing: 2 }}>
                {getBenchRating(benchScore).label}
              </div>
            </div>
          )}

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={runBenchmark} disabled={benchRunning}
            style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none",
              cursor: benchRunning ? "not-allowed" : "pointer",
              background: benchRunning ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg,#e91e8c,#ff6b35)",
              color: benchRunning ? "rgba(255,255,255,0.3)" : "white",
              fontFamily: "'Orbitron',sans-serif", fontSize: 12, letterSpacing: 2 }}>
            {benchRunning ? "RUNNING..." : benchScore ? "RUN AGAIN" : "RUN BENCHMARK"}
          </motion.button>

          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center",
            marginTop: 10, lineHeight: 1.6, marginBottom: 0 }}>
            Runs 5 million floating-point operations and measures throughput. Higher = faster CPU.
          </p>
        </div>
      </div>
    </div>
  );
}
