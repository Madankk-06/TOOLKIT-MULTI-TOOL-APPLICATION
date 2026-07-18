import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";

export default function BatteryTest() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("idle"); // idle | warning | running | done
  const [battery, setBattery] = useState(null);
  const [startLevel, setStartLevel] = useState(null);
  const [readings, setReadings] = useState([]);   // {level, time, elapsed}
  const [elapsed, setElapsed] = useState(0);
  const [duration] = useState(60); // 60 second test
  const [cpuLoad, setCpuLoad] = useState(0);
  const [supported, setSupported] = useState(true);

  const rafRef   = useRef(null);
  const timerRef = useRef(null);
  const startRef = useRef(null);
  const batRef   = useRef(null);
  const stressRef = useRef(null);

  // Get battery object
  useEffect(() => {
    if (!navigator.getBattery) { setSupported(false); return; }
    navigator.getBattery().then(bat => {
      batRef.current = bat;
      const update = () => setBattery({ level: Math.round(bat.level * 100), charging: bat.charging });
      update();
      bat.addEventListener("levelchange", update);
      bat.addEventListener("chargingchange", update);
      return () => {
        bat.removeEventListener("levelchange", update);
        bat.removeEventListener("chargingchange", update);
      };
    }).catch(() => setSupported(false));
  }, []);

  // CPU stress loop
  const startStress = () => {
    let running = true;
    stressRef.current = running;
    const loop = () => {
      if (!stressRef.current) return;
      const start = performance.now();
      let x = 0;
      while (performance.now() - start < 10) { // 10ms bursts
        x += Math.sqrt(Math.random() * Math.random());
      }
      setCpuLoad(Math.min(100, Math.round(x % 100)));
      setTimeout(loop, 5);
    };
    loop();
  };

  const stopStress = () => { stressRef.current = false; };

  const startTest = () => {
    if (!battery) return;
    const sl = battery.level;
    setStartLevel(sl);
    setReadings([{ level: sl, elapsed: 0, time: new Date().toLocaleTimeString() }]);
    setElapsed(0);
    startRef.current = Date.now();
    setPhase("running");

    startStress();

    timerRef.current = setInterval(() => {
      const el = Math.round((Date.now() - startRef.current) / 1000);
      setElapsed(el);
      const bat = batRef.current;
      if (bat) {
        const lvl = Math.round(bat.level * 100);
        setReadings(r => [...r, { level: lvl, elapsed: el, time: new Date().toLocaleTimeString() }]);
      }
      if (el >= duration) endTest();
    }, 5000); // sample every 5 seconds

    // Final stop at 60s
    rafRef.current = setTimeout(endTest, duration * 1000);
  };

  const endTest = useCallback(() => {
    clearInterval(timerRef.current);
    clearTimeout(rafRef.current);
    stopStress();
    setPhase("done");
  }, []);

  const stopTest = () => {
    clearInterval(timerRef.current);
    clearTimeout(rafRef.current);
    stopStress();
    setPhase("done");
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearTimeout(rafRef.current);
    stopStress();
  }, []);

  // Calculate drain stats
  const lastReading = readings[readings.length - 1];
  const drainTotal  = startLevel != null && lastReading ? startLevel - lastReading.level : 0;
  const elapsedMins = elapsed / 60;
  const drainPerHour = elapsedMins > 0.01 ? Math.round(drainTotal / elapsedMins * 60) : 0;
  const estimatedHours = drainPerHour > 0 ? (100 / drainPerHour).toFixed(1) : "—";

  const getDrainRating = (dph) => {
    if (dph <= 5)  return { label: "Excellent",   color: "#00d4ff" };
    if (dph <= 10) return { label: "Good",         color: "#c9a96e" };
    if (dph <= 20) return { label: "Average",      color: "#ff8800" };
    return               { label: "High Drain",   color: "#ff4444" };
  };

  const progress = Math.min(100, Math.round((elapsed / duration) * 100));

  return (
    <div style={{ fontFamily: "'Rajdhani',sans-serif", minHeight: "100vh", background: "#0a0a0f", color: "white" }}>
      <div style={{ padding: "20px 24px 0" }}>
        <BackButton />
      </div>

      <div style={{ textAlign: "center", padding: "12px 24px 0" }}>
        <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(18px,4vw,26px)",
          fontWeight: 700, margin: 0, letterSpacing: 3 }}>BATTERY TEST</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 6, fontSize: 14 }}>
          Measure real battery drain rate under CPU load
        </p>
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 24px 40px" }}>

        {!supported && (
          <div style={{ background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)",
            borderRadius: 14, padding: "20px", textAlign: "center", color: "#ff6666" }}>
            Battery API not supported in this browser. Try on a mobile device.
          </div>
        )}

        {supported && (
          <AnimatePresence mode="wait">

            {/* IDLE */}
            {phase === "idle" && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Warning */}
                <div style={{ background: "rgba(255,136,0,0.08)", border: "1px solid rgba(255,136,0,0.3)",
                  borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 24 }}>⚠️</span>
                    <div style={{ color: "#ff8800", fontSize: 14, lineHeight: 1.7 }}>
                      <strong>This test stresses your CPU for 60 seconds</strong> to simulate heavy load.
                      It will consume battery. Make sure you are not plugged in for accurate results.
                      Your device may feel warm during the test.
                    </div>
                  </div>
                </div>

                {/* Current battery */}
                {battery && (
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14, padding: "20px", marginBottom: 20, textAlign: "center" }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 48,
                      fontWeight: 700, color: battery.level > 30 ? "#00d4ff" : "#ff4444" }}>
                      {battery.level}%
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 4 }}>
                      Current Battery · {battery.charging ? "⚡ Charging" : "On Battery"}
                    </div>
                    {battery.charging && (
                      <div style={{ color: "#ff8800", fontSize: 13, marginTop: 8 }}>
                        Please unplug charger before running the test for accurate results.
                      </div>
                    )}
                    {battery.level < 20 && (
                      <div style={{ color: "#ff4444", fontSize: 13, marginTop: 8 }}>
                        Battery is low. Charge to at least 30% before running this test.
                      </div>
                    )}
                  </div>
                )}

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={startTest}
                  disabled={!battery || battery.charging || battery.level < 20}
                  style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none",
                    cursor: battery && !battery.charging && battery.level >= 20 ? "pointer" : "not-allowed",
                    background: battery && !battery.charging && battery.level >= 20
                      ? "linear-gradient(135deg,#e91e8c,#ff6b35)"
                      : "rgba(255,255,255,0.08)",
                    color: battery && !battery.charging && battery.level >= 20 ? "white" : "rgba(255,255,255,0.3)",
                    fontFamily: "'Orbitron',sans-serif", fontSize: 14, letterSpacing: 3,
                    boxShadow: "0 0 24px rgba(233,30,140,0.25)" }}>
                  START 60s BATTERY TEST
                </motion.button>
              </motion.div>
            )}

            {/* RUNNING */}
            {phase === "running" && (
              <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>

                {/* CPU Load ring */}
                <div style={{ position: "relative", width: 180, height: 180 }}>
                  <svg width="180" height="180" viewBox="0 0 180 180">
                    <circle cx="90" cy="90" r="75" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
                    <motion.circle cx="90" cy="90" r="75" fill="none"
                      stroke="url(#cpuGrad)" strokeWidth="12" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 75}`}
                      animate={{ strokeDashoffset: 2 * Math.PI * 75 * (1 - cpuLoad / 100) }}
                      transition={{ duration: 0.3 }}
                      transform="rotate(-90 90 90)" />
                    <defs>
                      <linearGradient id="cpuGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#e91e8c" />
                        <stop offset="100%" stopColor="#ff6b35" />
                      </linearGradient>
                    </defs>
                    <text x="90" y="82" textAnchor="middle"
                      fontFamily="Orbitron,sans-serif" fontSize="28" fontWeight="700" fill="white">
                      {battery?.level ?? startLevel}%
                    </text>
                    <text x="90" y="102" textAnchor="middle"
                      fontFamily="Rajdhani,sans-serif" fontSize="12" fill="rgba(255,255,255,0.4)">
                      battery
                    </text>
                  </svg>
                </div>

                {/* Timer */}
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 36,
                  color: "#c9a96e", letterSpacing: 4 }}>
                  {String(Math.floor((duration - elapsed) / 60)).padStart(2,"0")}:
                  {String(Math.max(0, duration - elapsed) % 60).padStart(2,"0")}
                </div>

                {/* Progress */}
                <div style={{ width: "100%" }}>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                    <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }}
                      style={{ height: "100%", background: "linear-gradient(90deg,#e91e8c,#ff6b35)", borderRadius: 4 }} />
                  </div>
                  <div style={{ textAlign: "center", marginTop: 6, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                    CPU LOAD ACTIVE · {elapsed}s elapsed
                  </div>
                </div>

                {/* Live drain */}
                {drainTotal > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }}>
                    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "14px",
                      textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ fontFamily: "'Orbitron',sans-serif", color: "#ff4444", fontSize: 20 }}>
                        -{drainTotal}%
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 3 }}>Drained So Far</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "14px",
                      textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ fontFamily: "'Orbitron',sans-serif", color: "#c9a96e", fontSize: 20 }}>
                        {drainPerHour}%/h
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 3 }}>Est. Drain Rate</div>
                    </div>
                  </div>
                )}

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={stopTest}
                  style={{ padding: "13px 36px", borderRadius: 12, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg,#ff4444,#cc0000)", color: "white",
                    fontFamily: "'Orbitron',sans-serif", fontSize: 13, letterSpacing: 2 }}>
                  STOP TEST
                </motion.button>
              </motion.div>
            )}

            {/* DONE */}
            {phase === "done" && (
              <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 20, padding: "24px", textAlign: "center" }}>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 8 }}>Test Complete</div>
                  <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 40, fontWeight: 700,
                    color: drainPerHour > 0 ? getDrainRating(drainPerHour).color : "#c9a96e" }}>
                    {drainPerHour > 0 ? `${drainPerHour}%/h` : "No drain detected"}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 4 }}>Estimated drain rate</div>
                  {drainPerHour > 0 && (
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 16,
                      color: getDrainRating(drainPerHour).color, marginTop: 8, letterSpacing: 2 }}>
                      {getDrainRating(drainPerHour).label}
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                  {[
                    { label: "Start Level",  value: `${startLevel}%`,        color: "#00d4ff" },
                    { label: "End Level",    value: `${lastReading?.level ?? startLevel}%`, color: drainTotal > 5 ? "#ff4444" : "#c9a96e" },
                    { label: "Total Drain",  value: `${drainTotal}%`,        color: "#ff4444" },
                    { label: "Duration",     value: `${elapsed}s`,           color: "#c9a96e" },
                    { label: "Drain/Hour",   value: `${drainPerHour}%`,      color: "#ff8800" },
                    { label: "Est. Battery Life", value: `${estimatedHours}h`, color: "#00d4ff" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
                      padding: "12px 8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 15,
                        color: s.color, marginBottom: 4 }}>{s.value}</div>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, lineHeight: 1.4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Reading chart */}
                {readings.length > 1 && (
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14, padding: "16px" }}>
                    <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10,
                      color: "#c9a96e", letterSpacing: 2, marginBottom: 10 }}>BATTERY DURING TEST</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
                      {readings.map((r, i) => {
                        const height = `${Math.max(4, r.level)}%`;
                        return (
                          <div key={i} title={`${r.level}% at ${r.time}`}
                            style={{ flex: 1, height, borderRadius: "2px 2px 0 0",
                              background: r.level > 50 ? "#00d4ff" : r.level > 25 ? "#c9a96e" : "#ff4444",
                              transition: "height 0.3s" }} />
                        );
                      })}
                    </div>
                  </div>
                )}

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setPhase("idle"); setReadings([]); setElapsed(0); setStartLevel(null); }}
                  style={{ padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
                    background: "linear-gradient(135deg,#e91e8c,#ff6b35)", color: "white",
                    fontFamily: "'Orbitron',sans-serif", fontSize: 13, letterSpacing: 2 }}>
                  RUN AGAIN
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
