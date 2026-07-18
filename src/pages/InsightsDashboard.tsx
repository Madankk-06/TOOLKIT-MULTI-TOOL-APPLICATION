/**
 * FILE: src/pages/InsightsDashboard.tsx
 *
 * AI Insights Dashboard — shows the user how the AI router is learning
 * from their usage. Accessible at /insights.
 *
 * Panels:
 *   1. Routing accuracy trend (correction rate over time)
 *   2. Top mis-routes (wrong → correct tool pairs)
 *   3. Learned preferences (units, language, currency)
 *   4. Recent memory entries (last 5 RAG interactions)
 *   5. Manual cache/memory controls
 */

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import { useTheme } from "../context/ThemeContext";
import type { ThemeTokens } from "../context/ThemeContext";
import {
  getFeedbackStats,
  clearAllRouterCache,
  type FeedbackStats
} from "../lib/feedbackEngine";
import {
  getUserPreferences,
  clearOldMemory,
  getTotalInteractionCount,
  getRecentInteractions,
  type UserPreference,
  type MemoryEntry
} from "../lib/ragEngine";
import { getToolById } from "../lib/toolsRegistry";

// ── Types ─────────────────────────────────────────────────────────────────────

type DashboardState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; stats: FeedbackStats; prefs: UserPreference[]; memoriesCleared: number; totalInteractions: number; recentMemory: MemoryEntry[] };

// ── SVG Icons for Professional Aesthetics ──────────────────────────────────────
const BrainIconSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-4.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-4.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z"/>
  </svg>
);

const MemoryIconSVG = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }}>
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
);

const HelpIconSVG = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8, color: "#e91e8c" }}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function ConfidenceBar({ value, color, isLight }: { value: number; color: string; isLight: boolean }) {
  return (
    <div style={{
      height: 6, borderRadius: 4,
      background: isLight ? "#cbd5e1" : "rgba(255,255,255,0.06)",
      overflow: "hidden", marginTop: 4
    }}>
      <div style={{
        width: `${Math.round(value * 100)}%`,
        height: "100%",
        background: color,
        borderRadius: 4,
        transition: "width 0.6s ease"
      }} />
    </div>
  );
}

function StatCard({
  label, value, sub, accent, tokens, isLight
}: { label: string; value: string | number; sub?: string; accent?: string; tokens: ThemeTokens; isLight: boolean }) {
  return (
    <div style={{
      background: isLight ? tokens.surface : "rgba(255,255,255,0.04)",
      border: `1px solid ${tokens.border}`,
      borderRadius: 14,
      padding: "16px 20px",
      flex: "1 1 140px",
      minWidth: 120,
      boxShadow: isLight ? "0 4px 12px rgba(0,0,0,0.03)" : "none"
    }}>
      <div style={{ fontSize: 11, color: tokens.textSecondary, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent ?? tokens.textPrimary }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: tokens.textSecondary, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const InsightsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme, tokens } = useTheme();
  const isLight = theme === 'light';

  const [state, setState] = useState<DashboardState>({ status: "loading" });
  const [clearing, setClearing] = useState(false);

  const loadData = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const [stats, prefs, totalInteractions, recentMemory] = await Promise.all([
        getFeedbackStats(),
        getUserPreferences(),
        getTotalInteractionCount(),
        getRecentInteractions(5)
      ]);
      setState({ status: "ready", stats, prefs, memoriesCleared: 0, totalInteractions, recentMemory });
    } catch (err: unknown) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to load insights."
      });
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleClearCache = useCallback(() => {
    clearAllRouterCache();
    alert("Router cache cleared. Next searches will re-run AI routing.");
  }, []);

  const handleClearMemory = useCallback(async () => {
    setClearing(true);
    try {
      const removed = await clearOldMemory(30);
      if (state.status === "ready") {
        setState(prev =>
          prev.status === "ready"
            ? { ...prev, memoriesCleared: prev.memoriesCleared + removed }
            : prev
        );
      }
      alert(`Removed ${removed} interactions older than 30 days.`);
    } finally {
      setClearing(false);
    }
  }, [state]);

  // Dynamic Theme-aware styles
  const dynamicStyles = {
    page: {
      minHeight: "100vh",
      background: tokens.background,
      color: tokens.textPrimary,
      padding: "28px clamp(16px, 4vw, 48px) 80px",
      fontFamily: "var(--font-sans, Inter, sans-serif)",
      width: "100%",
      boxSizing: "border-box" as const,
    },
    loadingCenter: {
      display: "flex", flexDirection: "column" as const,
      alignItems: "center", justifyContent: "center",
      minHeight: "60vh"
    },
    spinner: {
      width: 40, height: 40,
      border: "3px solid rgba(108,99,255,0.2)",
      borderTop: `3px solid ${tokens.accent}`,
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite"
    },
    errorBox: {
      background: isLight ? "#fef2f2" : "rgba(239,68,68,0.08)",
      border: `1px solid ${isLight ? '#fca5a5' : 'rgba(239,68,68,0.25)'}`,
      borderRadius: 14,
      padding: 24,
      marginTop: 40,
      textAlign: "center" as const
    },
    header: {
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      marginBottom: 24,
      flexWrap: "wrap" as const
    },
    title: {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: 'clamp(38px, 7vw, 62px)',
      fontWeight: 900,
      background: 'linear-gradient(135deg, #e91e8c 0%, #ff6b35 40%, #c9a96e 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      letterSpacing: '2px',
      margin: 0
    },
    subtitle: {
      fontSize: 13, color: tokens.textSecondary, margin: "4px 0 0"
    },
    statRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
      gap: 14,
      marginBottom: 24
    },
    card: {
      background: isLight ? tokens.surface : "rgba(255,255,255,0.03)",
      border: `1px solid ${tokens.border}`,
      borderRadius: 16,
      padding: "20px",
      marginBottom: 16,
      boxShadow: isLight ? "0 4px 16px rgba(0,0,0,0.04)" : "none"
    },
    sectionTitle: {
      fontSize: 15, fontWeight: 700,
      color: tokens.textPrimary, margin: 0
    },
    sectionSub: {
      fontSize: 12, color: tokens.textSecondary,
      margin: "4px 0 0"
    },
    misrouteRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${tokens.border}`,
      borderRadius: 10,
      padding: "8px 12px"
    },
    misrouteIndex: {
      width: 20, height: 20,
      background: isLight ? "rgba(108,99,255,0.1)" : "rgba(108,99,255,0.15)",
      borderRadius: "50%",
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      fontSize: 11,
      fontWeight: 700,
      color: isLight ? "#4f46e5" : "#a5b4fc",
      flexShrink: 0
    },
    countBadge: {
      fontSize: 11,
      background: isLight ? "#fee2e2" : "rgba(239,68,68,0.1)",
      color: isLight ? "#dc2626" : "#f87171",
      borderRadius: 8,
      padding: "2px 8px",
      fontWeight: 600,
      flexShrink: 0
    },
    btnPrimary: {
      background: "linear-gradient(135deg, #6C63FF, #8B5CF6)",
      border: "none",
      borderRadius: 20,
      padding: "8px 18px",
      color: "#fff",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600
    },
    btnSecondary: {
      background: isLight ? tokens.surface : "rgba(255,255,255,0.06)",
      border: `1px solid ${tokens.border}`,
      borderRadius: 20,
      padding: "8px 18px",
      color: tokens.textPrimary,
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 500,
      boxShadow: isLight ? "0 2px 6px rgba(0,0,0,0.03)" : "none"
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (state.status === "loading") {
    return (
      <div style={dynamicStyles.page}>
        <div style={dynamicStyles.loadingCenter}>
          <div style={dynamicStyles.spinner} />
          <p style={{ color: tokens.textSecondary, marginTop: 16 }}>Loading insights…</p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (state.status === "error") {
    return (
      <div style={dynamicStyles.page}>
        <div style={dynamicStyles.errorBox}>
          <p style={{ color: "#dc2626", marginBottom: 12, fontWeight: 600 }}>⚠️ {state.message}</p>
          <button style={dynamicStyles.btnPrimary} onClick={loadData}>Retry</button>
        </div>
      </div>
    );
  }

  // ── Ready state ───────────────────────────────────────────────────────────
  const { stats, prefs, totalInteractions, recentMemory } = state;

  return (
    <div style={dynamicStyles.page}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={dynamicStyles.header}>
        <BackButton />
        <div>
          <h1 style={dynamicStyles.title}>Mady Insights</h1>
          <p style={dynamicStyles.subtitle}>How the router is learning from your usage</p>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div style={dynamicStyles.statRow}>
        <StatCard
          label="Total Searches"
          value={totalInteractions}
          sub="queries through Mady"
          accent="#6C63FF"
          tokens={tokens}
          isLight={isLight}
        />
        <StatCard
          label="Total Corrections"
          value={stats.totalCorrections}
          sub="times you guided the AI"
          accent={isLight ? "#4f46e5" : "#a5b4fc"}
          tokens={tokens}
          isLight={isLight}
        />
        <StatCard
          label="Corrections (7d)"
          value={stats.recentCorrectionRate7d}
          sub="in the last 7 days"
          accent={stats.recentCorrectionRate7d > 5 ? (isLight ? "#dc2626" : "#f87171") : (isLight ? "#16a34a" : "#4ade80")}
          tokens={tokens}
          isLight={isLight}
        />
        <StatCard
          label="Learned Prefs"
          value={prefs.length}
          sub="units, language, currency…"
          accent={isLight ? "#db2777" : "#f9a8d4"}
          tokens={tokens}
          isLight={isLight}
        />
        <StatCard
          label="Top Mis-Route"
          value={stats.mostCorrectedToolId
            ? (getToolById(stats.mostCorrectedToolId)?.name ?? stats.mostCorrectedToolId)
            : "—"}
          sub="most often wrong tool"
          accent={isLight ? "#d97706" : "#fbbf24"}
          tokens={tokens}
          isLight={isLight}
        />
      </div>

      {/* ── Top mis-routes ───────────────────────────────────────────────── */}
      {stats.topMisroutes.length > 0 && (
        <section style={dynamicStyles.card}>
          <h2 style={dynamicStyles.sectionTitle}>🎯 Top Routing Corrections</h2>
          <p style={dynamicStyles.sectionSub}>Queries where you picked a different tool than AI suggested</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {stats.topMisroutes.map((r, i) => {
              const wrong   = getToolById(r.wrongToolId);
              const correct = getToolById(r.correctToolId);
              return (
                <div key={i} style={dynamicStyles.misrouteRow}>
                  <span style={dynamicStyles.misrouteIndex}>{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: isLight ? "#dc2626" : "#f87171", fontSize: 13, fontWeight: 600 }}>
                      {(wrong?.name ?? r.wrongToolId) || "—"}
                    </span>
                    <span style={{ color: tokens.textSecondary, margin: "0 8px", fontSize: 12 }}>→</span>
                    <span style={{ color: isLight ? "#16a34a" : "#4ade80", fontSize: 13, fontWeight: 600 }}>
                      {correct?.name ?? r.correctToolId}
                    </span>
                  </div>
                  <span style={dynamicStyles.countBadge}>{r.count}×</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Learned preferences ───────────────────────────────────────────── */}
      {prefs.length > 0 && (
        <section style={dynamicStyles.card}>
          <h2 style={{ ...dynamicStyles.sectionTitle, display: "flex", alignItems: "center" }}>
            <BrainIconSVG /> Learned Preferences
          </h2>
          <p style={dynamicStyles.sectionSub}>Automatically inferred from your tool usage</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
            {prefs.map(p => (
              <div key={p.key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 13, color: tokens.textPrimary, textTransform: "capitalize", fontWeight: 600 }}>
                    {p.key.replace(/_/g, " ")}
                  </span>
                  <span style={{ fontSize: 13, color: isLight ? tokens.accent : "#a5b4fc", fontWeight: 700 }}>
                    {String(p.value)}
                  </span>
                </div>
                <ConfidenceBar
                  value={p.confidence}
                  color={p.confidence >= 0.7 ? (isLight ? "#16a34a" : "#4ade80") : "#f59e0b"}
                  isLight={isLight}
                />
                <span style={{ fontSize: 11, color: tokens.textSecondary, marginTop: 3, display: "block" }}>
                  Confidence: {Math.round(p.confidence * 100)}% · learned from {p.learnedFrom.length} session(s)
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Recent AI Memory ──────────────────────────────────────────────── */}
      <section style={dynamicStyles.card}>
        <h2 style={{ ...dynamicStyles.sectionTitle, display: "flex", alignItems: "center" }}>
          <MemoryIconSVG /> Recent AI Memory
        </h2>
        <p style={dynamicStyles.sectionSub}>Last {recentMemory.length} queries stored in AI memory</p>
        {recentMemory.length === 0 ? (
          <p style={{ fontSize: 13, color: tokens.textSecondary, marginTop: 12 }}>
            No memory yet — use the search bar to let Mady start learning.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {recentMemory.map((m) => (
              <div key={m.id} style={{
                background: isLight ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${tokens.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: tokens.textPrimary, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.userQuery}
                  </div>
                  <div style={{ fontSize: 11, color: tokens.textSecondary, marginTop: 2 }}>
                    → {getToolById(m.toolId)?.name ?? m.toolId}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: tokens.textSecondary, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {new Date(m.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── How to teach the AI — always shown at top ─────────────────── */}
      <section style={{
        ...dynamicStyles.card,
        background: isLight
          ? "linear-gradient(135deg, rgba(233,30,140,0.05), rgba(255,255,255,0.9))"
          : "linear-gradient(135deg, rgba(233,30,140,0.08), rgba(201,169,110,0.04))",
        border: `1px solid ${isLight ? 'rgba(233,30,140,0.3)' : 'rgba(233,30,140,0.2)'}`,
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <HelpIconSVG />
          <div>
            <h2 style={{ ...dynamicStyles.sectionTitle, color: "#e91e8c" }}>How the AI Learns</h2>
            <p style={{ ...dynamicStyles.sectionSub }}>Train the AI with your feedback to get better routing over time</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { step: "1", title: "Search using the chat bar", desc: "Type any query — the AI routes to the best tool and auto-navigates with values pre-filled.", color: isLight ? "#0284c7" : "#00d4ff" },
            { step: "2", title: "See 'Was this right?' after every result", desc: "A feedback card appears in the search bar after routing. ✓ Yes reinforces the correct mapping.", color: isLight ? "#16a34a" : "#4ade80" },
            { step: "3", title: "Tap ✗ No if the wrong tool opened", desc: "A tool picker appears — select the correct tool. The AI records this and won't repeat the mistake.", color: isLight ? "#dc2626" : "#f87171" },
            { step: "4", title: "Check Mady Insights to see your impact", desc: "After a few corrections, the Routing Corrections and Learned Preferences sections above will populate.", color: isLight ? "#d97706" : "#c9a96e" },
          ].map(item => (
            <div key={item.step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 24, height: 24,
                borderRadius: 8,
                background: `${item.color}20`,
                border: `1px solid ${item.color}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: item.color,
                flexShrink: 0,
              }}>
                {item.step}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: tokens.textPrimary, marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate("/ai-guide")}
          style={{
            marginTop: 16,
            background: "linear-gradient(135deg, #e91e8c, #c9a96e)",
            border: "none", borderRadius: 20, padding: "8px 20px",
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          📖 Read Full AI Guide →
        </button>
      </section>

      {/* ── Empty state: no corrections yet ──────────────────────────────── */}
      {stats.totalCorrections === 0 && (
        <section style={{ ...dynamicStyles.card, textAlign: "center", padding: "32px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
          <h2 style={{ ...dynamicStyles.sectionTitle, textAlign: "center" }}>No corrections yet</h2>
          <p style={{ color: tokens.textSecondary, fontSize: 14, marginTop: 8 }}>
            Use SmartSearch and tap "✗ No" when the AI picks the wrong tool.
            It will learn from your feedback over time.
          </p>
        </section>
      )}

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <section style={dynamicStyles.card}>
        <h2 style={dynamicStyles.sectionTitle}>⚙️ Memory Controls</h2>
        <p style={dynamicStyles.sectionSub}>Manage AI routing cache and interaction memory</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <button
            type="button"
            style={dynamicStyles.btnSecondary}
            onClick={handleClearCache}
          >
            🗑️ Clear router cache
          </button>
          <button
            type="button"
            style={dynamicStyles.btnSecondary}
            onClick={handleClearMemory}
            disabled={clearing}
          >
            {clearing ? "Clearing…" : "🧹 Clear old memory (30d+)"}
          </button>
          <button
            type="button"
            style={dynamicStyles.btnPrimary}
            onClick={loadData}
          >
            ↻ Refresh
          </button>
        </div>
      </section>
    </div>
  );
};

export default InsightsDashboard;
