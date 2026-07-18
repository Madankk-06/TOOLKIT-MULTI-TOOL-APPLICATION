/**
 * FILE: src/components/AIToolSidekick.tsx
 *
 * A floating AI assistant panel rendered on every tool page.
 * Wired into ToolPage.tsx — requires NO changes to individual tool files.
 *
 * Features:
 *   • Collapsible floating button (bottom-right corner)
 *   • Context-aware: knows which tool is open, pre-loads tool metadata
 *   • Chat interface: ask anything about the current tool
 *   • Suggested quick-prompt chips for each tool
 *   • Streaming-style typewriter response display
 *   • Session history (per tool, in-memory)
 *   • All three states: loading, error, empty
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo
} from "react";
import { GoogleGenAI } from "@google/genai";
import { getToolById, type ToolConfig } from "../lib/toolsRegistry";

// ── Gemini client ─────────────────────────────────────────────────────────────
const GENAI_API_KEY: string =
  (import.meta.env.VITE_GEMINI_API_KEY as string) ?? "";
const ai = new GoogleGenAI({ apiKey: GENAI_API_KEY });

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
};

type SidekickState = "closed" | "open" | "minimised";

// ── Slug → toolId mapper ──────────────────────────────────────────────────────
// The URL slug is the last segment of the route path.
// toolsRegistry uses the same IDs. We try direct match first,
// then normalise dashes and try again.

function slugToToolId(slug: string): string {
  // Direct match (e.g. "calculator")
  if (getToolById(slug)) return slug;
  // Normalise: "world-time" → "time-zone" style differences
  const normalised = slug.replace(/-/g, "_");
  if (getToolById(normalised)) return normalised;
  // Common remaps
  const remaps: Record<string, string> = {
    "world-time":     "time-zone",
    "to-do":          "todo",
    "emi":            "emi-calculator",
    "line-chart":     "line-chart",
    "pie-chart":      "pie-chart",
    "mutual-fund":    "mutual-fund-calculator",
    "level-measure":  "level-measure",
    "thermometer":    "thermometer",
    "pedometer":      "pedometer",
    "text-to-binary": "text-to-binary",
    "text-scanner":   "ocr-text-scanner"
  };
  return remaps[slug] ?? slug;
}

// ── Quick prompts per category ────────────────────────────────────────────────

function getQuickPrompts(tool: ToolConfig | null): string[] {
  if (!tool) return [
    "What can this tool do?",
    "How do I use this?",
    "Show me a tip"
  ];

  const cat = tool.category.toLowerCase();
  const name = tool.name;

  if (cat.includes("time") || cat.includes("date")) return [
    `How accurate is ${name}?`,
    "Can I set a custom alarm?",
    "What time zones are supported?"
  ];
  if (cat.includes("calculat")) return [
    `Explain the formula used in ${name}`,
    "Give me an example calculation",
    "What are common mistakes to avoid?"
  ];
  if (cat.includes("health") || cat.includes("fitness")) return [
    "How is this measured?",
    "What does a healthy reading look like?",
    "How often should I check?"
  ];
  if (cat.includes("text") || cat.includes("convert")) return [
    "What formats are supported?",
    "Can I process large inputs?",
    "Give me an example"
  ];
  if (cat.includes("media") || cat.includes("camera")) return [
    "What file types does this support?",
    "Is my data stored anywhere?",
    "How do I export results?"
  ];
  return [
    `How do I use ${name}?`,
    "Give me a pro tip",
    "What are common use cases?"
  ];
}

// ── System prompt builder ─────────────────────────────────────────────────────

function buildSystemPrompt(tool: ToolConfig | null): string {
  if (!tool) {
    return (
      "You are a helpful AI assistant inside Toolkit, a multi-purpose mobile-style web app. " +
      "Answer questions about the app's tools concisely (2-4 sentences max). " +
      "Be friendly and practical."
    );
  }
  return (
    `You are an expert AI assistant for the "${tool.name}" tool inside Toolkit app. ` +
    `Tool description: "${tool.description}". ` +
    `Category: ${tool.category}. ` +
    `Keywords: ${tool.keywords.join(", ")}. ` +
    "Answer user questions about this tool in 2-4 sentences. " +
    "Be practical, concise, and friendly. " +
    "If you don't know something specific about the app's implementation, say so honestly."
  );
}

// ── Typewriter hook ───────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 12): string {
  const [displayed, setDisplayed] = useState("");
  const [targetText, setTargetText] = useState("");

  useEffect(() => {
    if (text !== targetText) {
      setTargetText(text);
      setDisplayed("");
    }
  }, [text, targetText]);

  useEffect(() => {
    if (displayed.length >= targetText.length) return;
    const timer = setTimeout(() => {
      setDisplayed(targetText.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(timer);
  }, [displayed, targetText, speed]);

  return displayed;
}

// ── Message bubble ────────────────────────────────────────────────────────────

const AssistantBubble: React.FC<{ text: string; isLatest: boolean }> = ({ text, isLatest }) => {
  const displayed = useTypewriter(isLatest ? text : text, isLatest ? 10 : 0);
  return (
    <div style={bubbleStyles.assistant}>
      <span style={bubbleStyles.avatar}>✦</span>
      <div style={bubbleStyles.assistantText}>
        {isLatest ? displayed : text}
        {isLatest && displayed.length < text.length && (
          <span style={{ opacity: 0.5, animation: "blink 0.8s step-end infinite" }}>▋</span>
        )}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

interface AIToolSidekickProps {
  /** URL slug (from useParams) — used to resolve tool metadata */
  slug: string;
}

export const AIToolSidekick: React.FC<AIToolSidekickProps> = ({ slug }) => {
  const toolId = useMemo(() => slugToToolId(slug), [slug]);
  const tool   = useMemo(() => getToolById(toolId), [toolId]);

  const [panelState, setPanelState] = useState<SidekickState>("closed");
  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [input, setInput]           = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const quickPrompts = useMemo(() => getQuickPrompts(tool ?? null), [tool]);
  const systemPrompt = useMemo(() => buildSystemPrompt(tool ?? null), [tool]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (panelState === "open") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [panelState]);

  // ── Send a message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setInput("");
      setError(null);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmed,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, userMsg]);
      setIsLoading(true);

      // Build conversation history for Gemini
      const history = messages.map(m => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.text }]
      }));

      try {
        const response = await ai.models.generateContent({
          model:    "gemini-2.5-flash",
          contents: [
            { role: "user", parts: [{ text: systemPrompt }] },
            ...history,
            { role: "user", parts: [{ text: trimmed }] }
          ],
          config: {
            maxOutputTokens: 300,
            temperature:     0.7
          }
        });

        const reply = (response.text ?? "").trim() ||
          "I'm not sure about that. Try rephrasing your question!";

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: reply,
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, assistantMsg]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "AI unavailable. Please try again.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, systemPrompt]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => setMessages([]);

  // ── Empty state greeting ───────────────────────────────────────────────────
  const isEmpty = messages.length === 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes sk-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes sk-fab-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(108,99,255,0.4); }
          50%      { box-shadow: 0 0 0 8px rgba(108,99,255,0); }
        }
      `}</style>

      {/* ── FAB button ──────────────────────────────────────────────────── */}
      <button
        type="button"
        id="ai-sidekick-fab"
        aria-label="Open AI assistant"
        onClick={() => setPanelState(s => s === "closed" || s === "minimised" ? "open" : "minimised")}
        style={{
          position:   "fixed",
          bottom:     24,
          right:      20,
          width:      52,
          height:     52,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%)",
          border:     "none",
          cursor:     "pointer",
          display:    "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize:   22,
          color:      "#fff",
          zIndex:     1000,
          boxShadow:  "0 4px 20px rgba(108,99,255,0.45)",
          animation:  panelState === "closed" ? "sk-fab-pulse 2.5s ease infinite" : "none",
          transition: "transform 0.2s"
        }}
      >
        {panelState === "open" ? "✕" : "✦"}
      </button>

      {/* ── Sidekick panel ──────────────────────────────────────────────── */}
      {panelState === "open" && (
        <div
          id="ai-sidekick-panel"
          role="dialog"
          aria-label="AI Sidekick"
          style={{
            position:    "fixed",
            bottom:      88,
            right:       16,
            width:       "min(360px, calc(100vw - 32px))",
            height:      "min(520px, calc(100vh - 120px))",
            background:  "rgba(14, 14, 22, 0.96)",
            backdropFilter: "blur(20px)",
            border:      "1px solid rgba(108,99,255,0.25)",
            borderRadius: 20,
            display:     "flex",
            flexDirection: "column",
            overflow:    "hidden",
            zIndex:      999,
            boxShadow:   "0 16px 48px rgba(0,0,0,0.6)",
            animation:   "sk-slide-up 0.25s ease-out"
          }}
        >
          {/* Header */}
          <div style={{
            padding:       "14px 16px",
            background:    "linear-gradient(135deg, rgba(108,99,255,0.15), rgba(139,92,246,0.1))",
            borderBottom:  "1px solid rgba(255,255,255,0.07)",
            display:       "flex",
            alignItems:    "center",
            gap:           10,
            flexShrink:    0
          }}>
            <div style={{
              width: 32, height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#6C63FF,#8B5CF6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#fff", flexShrink: 0
            }}>✦</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e2f0" }}>
                AI Sidekick
              </div>
              <div style={{ fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {tool ? tool.name : "Toolkit Assistant"}
              </div>
            </div>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                style={{
                  background: "none", border: "none",
                  color: "#888", cursor: "pointer",
                  fontSize: 11, padding: "4px 8px",
                  borderRadius: 6,
                  transition: "color 0.2s"
                }}
                title="Clear chat"
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex:       1,
              overflowY:  "auto",
              padding:    "12px 14px",
              display:    "flex",
              flexDirection: "column",
              gap:        10,
              scrollbarWidth: "none"
            }}
          >
            {/* Empty state */}
            {isEmpty && (
              <div style={{ textAlign: "center", padding: "24px 16px" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>
                  {tool ? "🛠️" : "✦"}
                </div>
                <p style={{ fontSize: 13, color: "#888", marginBottom: 16, lineHeight: 1.5 }}>
                  {tool
                    ? `Ask me anything about ${tool.name}. I know how it works!`
                    : "Hi! Ask me anything about Toolkit's tools."}
                </p>

                {/* Quick prompt chips */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {quickPrompts.map((prompt, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => sendMessage(prompt)}
                      style={{
                        background:   "rgba(108,99,255,0.1)",
                        border:       "1px solid rgba(108,99,255,0.2)",
                        borderRadius: 20,
                        padding:      "7px 14px",
                        color:        "#a5b4fc",
                        cursor:       "pointer",
                        fontSize:     12,
                        textAlign:    "left",
                        transition:   "background 0.2s"
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation messages */}
            {messages.map((msg, idx) => {
              if (msg.role === "user") {
                return (
                  <div key={msg.id} style={bubbleStyles.user}>
                    <div style={bubbleStyles.userText}>{msg.text}</div>
                  </div>
                );
              }
              const isLatest = idx === messages.length - 1;
              return (
                <AssistantBubble key={msg.id} text={msg.text} isLatest={isLatest} />
              );
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, color: "#6C63FF" }}>✦</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6,
                      borderRadius: "50%",
                      background: "#6C63FF",
                      animation: `blink 1.2s ease infinite ${i * 0.2}s`
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div style={{
                background:  "rgba(239,68,68,0.08)",
                border:      "1px solid rgba(239,68,68,0.2)",
                borderRadius: 10,
                padding:     "8px 12px",
                fontSize:    12,
                color:       "#f87171"
              }}>
                ⚠️ {error}
                <button
                  type="button"
                  onClick={() => setError(null)}
                  style={{ marginLeft: 8, background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 11 }}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Input row */}
          <div style={{
            padding:      "10px 12px",
            borderTop:    "1px solid rgba(255,255,255,0.07)",
            display:      "flex",
            gap:          8,
            flexShrink:   0,
            background:   "rgba(0,0,0,0.2)"
          }}>
            <input
              ref={inputRef}
              id="ai-sidekick-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${tool?.name ?? "this tool"}…`}
              disabled={isLoading}
              aria-label="Ask AI sidekick"
              style={{
                flex:        1,
                background:  "rgba(255,255,255,0.06)",
                border:      "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20,
                padding:     "8px 14px",
                color:       "#e2e2f0",
                fontSize:    13,
                outline:     "none",
                minWidth:    0,
                fontFamily:  "inherit"
              }}
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              style={{
                width:       38,
                height:      38,
                borderRadius: "50%",
                background:  input.trim() && !isLoading
                  ? "linear-gradient(135deg,#6C63FF,#8B5CF6)"
                  : "rgba(255,255,255,0.06)",
                border:      "none",
                cursor:      input.trim() && !isLoading ? "pointer" : "not-allowed",
                color:       "#fff",
                fontSize:    15,
                display:     "flex",
                alignItems:  "center",
                justifyContent: "center",
                flexShrink:  0,
                transition:  "background 0.2s",
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ── Bubble styles ─────────────────────────────────────────────────────────────

const bubbleStyles = {
  user: {
    display:        "flex",
    justifyContent: "flex-end"
  } as React.CSSProperties,

  userText: {
    background:   "linear-gradient(135deg, #6C63FF, #8B5CF6)",
    color:        "#fff",
    borderRadius: "16px 16px 4px 16px",
    padding:      "8px 13px",
    fontSize:     13,
    maxWidth:     "82%",
    lineHeight:   1.5,
    wordBreak:    "break-word" as const
  } as React.CSSProperties,

  assistant: {
    display:    "flex",
    gap:        8,
    alignItems: "flex-start"
  } as React.CSSProperties,

  avatar: {
    width:        24,
    height:       24,
    borderRadius: "50%",
    background:   "rgba(108,99,255,0.15)",
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
    fontSize:     12,
    color:        "#a5b4fc",
    flexShrink:   0,
    marginTop:    2
  } as React.CSSProperties,

  assistantText: {
    background:   "rgba(255,255,255,0.05)",
    border:       "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px 16px 16px 4px",
    padding:      "8px 13px",
    fontSize:     13,
    color:        "#e2e2f0",
    maxWidth:     "82%",
    lineHeight:   1.6,
    wordBreak:    "break-word" as const
  } as React.CSSProperties
};

export default AIToolSidekick;
