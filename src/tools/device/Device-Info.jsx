import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";

function parseUA(ua) {
  let browser = "Unknown", bVer = "", os = "Unknown", osVer = "", device = "Desktop";
  // Browser
  if (/Edg\//.test(ua))        { browser = "Microsoft Edge";   bVer = ua.match(/Edg\/([\d.]+)/)?.[1] || ""; }
  else if (/OPR\//.test(ua))   { browser = "Opera";            bVer = ua.match(/OPR\/([\d.]+)/)?.[1] || ""; }
  else if (/Chrome\//.test(ua)){ browser = "Google Chrome";    bVer = ua.match(/Chrome\/([\d.]+)/)?.[1] || ""; }
  else if (/Firefox\//.test(ua)){ browser = "Mozilla Firefox"; bVer = ua.match(/Firefox\/([\d.]+)/)?.[1] || ""; }
  else if (/Safari\//.test(ua)) { browser = "Apple Safari";    bVer = ua.match(/Version\/([\d.]+)/)?.[1] || ""; }
  // OS
  if (/Windows NT 10/.test(ua))      { os = "Windows"; osVer = "10 / 11"; }
  else if (/Windows NT 6\.1/.test(ua)){ os = "Windows"; osVer = "7"; }
  else if (/Mac OS X/.test(ua))       { os = "macOS"; osVer = ua.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g,".") || ""; }
  else if (/Android/.test(ua))        { os = "Android"; osVer = ua.match(/Android ([\d.]+)/)?.[1] || ""; device = "Mobile"; }
  else if (/iPhone|iPad/.test(ua))    { os = "iOS"; osVer = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g,".") || ""; device = /iPad/.test(ua) ? "Tablet" : "Mobile"; }
  else if (/Linux/.test(ua))          { os = "Linux"; }
  // Tablet override
  if (/Tablet|iPad/.test(ua)) device = "Tablet";
  return { browser, bVer, os, osVer, device };
}

export default function Info() {
  const navigate = useNavigate();
  const [info, setInfo] = useState({});
  const [online, setOnline] = useState(navigator.onLine);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const { browser, bVer, os, osVer, device } = parseUA(ua);
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    setInfo({
      browser, bVer, os, osVer, device,
      screenW: screen.width, screenH: screen.height,
      windowW: window.innerWidth, windowH: window.innerHeight,
      pixelRatio: window.devicePixelRatio?.toFixed(1) || "1",
      colorDepth: screen.colorDepth,
      language: navigator.language,
      languages: navigator.languages?.join(", ") || navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: navigator.cookieEnabled,
      touchPoints: navigator.maxTouchPoints,
      platform: navigator.platform,
      ram: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "Unknown",
      cores: navigator.hardwareConcurrency || "Unknown",
      connectionType: conn?.effectiveType?.toUpperCase() || "Unknown",
      connectionSpeed: conn?.downlink ? `${conn.downlink} Mbps` : "Unknown",
      userAgent: ua,
    });

    const handleOnline  = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => { window.removeEventListener("online", handleOnline); window.removeEventListener("offline", handleOffline); };
  }, []);

  const sections = [
    {
      title: "Browser",
      color: "#00d4ff",
      icon: "🌐",
      items: [
        { label: "Name",    value: info.browser },
        { label: "Version", value: info.bVer },
        { label: "Platform", value: info.platform },
        { label: "Cookies", value: info.cookiesEnabled ? "Enabled" : "Disabled" },
        { label: "Language", value: info.language },
        { label: "All Languages", value: info.languages },
      ],
    },
    {
      title: "Operating System",
      color: "#c9a96e",
      icon: "💻",
      items: [
        { label: "OS",      value: info.os },
        { label: "Version", value: info.osVer || "—" },
        { label: "Device",  value: info.device },
        { label: "Touch Points", value: info.touchPoints?.toString() || "0" },
      ],
    },
    {
      title: "Display",
      color: "#e91e8c",
      icon: "🖥️",
      items: [
        { label: "Screen Resolution", value: `${info.screenW} × ${info.screenH}` },
        { label: "Window Size",       value: `${info.windowW} × ${info.windowH}` },
        { label: "Pixel Ratio",       value: `${info.pixelRatio}x` },
        { label: "Color Depth",       value: `${info.colorDepth}-bit` },
      ],
    },
    {
      title: "Hardware",
      color: "#00d4ff",
      icon: "⚙️",
      items: [
        { label: "CPU Cores", value: info.cores?.toString() },
        { label: "RAM",       value: info.ram },
      ],
    },
    {
      title: "Network & Location",
      color: "#c9a96e",
      icon: "📡",
      items: [
        { label: "Status",     value: online ? "Online" : "Offline", highlight: online ? "#00d4ff" : "#ff4444" },
        { label: "Connection", value: info.connectionType },
        { label: "Speed",      value: info.connectionSpeed },
        { label: "Timezone",   value: info.timezone },
      ],
    },
  ];

  const copyAll = () => {
    const text = sections.flatMap(s =>
      [`=== ${s.title} ===`, ...s.items.map(i => `${i.label}: ${i.value || "—"}`)]
    ).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ fontFamily: "'Rajdhani',sans-serif", minHeight: "100vh", background: "#0a0a0f", color: "white" }}>
      {/* Back */}
      <div style={{ padding: "20px 24px 0" }}>
        <BackButton />
      </div>

      <div style={{ textAlign: "center", padding: "12px 24px 0" }}>
        <h1 style={{ fontFamily: "'Orbitron',sans-serif", fontSize: "clamp(18px,4vw,26px)",
          fontWeight: 700, margin: 0, letterSpacing: 3 }}>DEVICE INFO</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", marginTop: 6, fontSize: 14 }}>
          Full hardware, software &amp; network specifications
        </p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 24px 40px" }}>
        {/* Copy all */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={copyAll}
            style={{ padding: "8px 18px", borderRadius: 10, cursor: "pointer",
              border: copied ? "1px solid rgba(0,212,255,0.5)" : "1px solid rgba(255,255,255,0.15)",
              background: copied ? "rgba(0,212,255,0.1)" : "rgba(255,255,255,0.04)",
              color: copied ? "#00d4ff" : "rgba(255,255,255,0.6)",
              fontFamily: "'Orbitron',sans-serif", fontSize: 10, letterSpacing: 1 }}>
            {copied ? "COPIED ✓" : "COPY ALL"}
          </motion.button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sections.map((sec, si) => (
            <motion.div key={sec.title}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.07 }}
              style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16,
                border: `1px solid rgba(255,255,255,0.08)`,
                borderLeft: `3px solid ${sec.color}`, overflow: "hidden" }}>
              {/* Section header */}
              <div style={{ padding: "14px 18px 10px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{sec.icon}</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12,
                  color: sec.color, letterSpacing: 2 }}>{sec.title.toUpperCase()}</span>
              </div>
              {/* Items */}
              <div style={{ padding: "6px 0" }}>
                {sec.items.map((item, ii) => (
                  <div key={item.label}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 18px",
                      background: ii % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>{item.label}</span>
                    <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 13,
                      color: item.highlight || "white", textAlign: "right",
                      maxWidth: "60%", wordBreak: "break-all" }}>
                      {item.value || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* User Agent */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)",
              letterSpacing: 2, marginBottom: 8 }}>USER AGENT STRING</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, lineHeight: 1.7,
              wordBreak: "break-all" }}>{info.userAgent}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
