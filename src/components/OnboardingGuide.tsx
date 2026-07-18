import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import type { ThemeTokens } from '../context/ThemeContext';

// ── Storage key ──────────────────────────────────────────────────────
const GUIDE_SEEN_KEY = 'toolkit-guide-seen';

// ── Custom event to trigger guide from outside (e.g. Settings) ───────
export const TRIGGER_GUIDE_EVENT = 'toolkit-trigger-guide';

// ── Guide step definitions ────────────────────────────────────────────
interface GuideStep {
  id: string;
  title: string;
  description: string;
  targetId?: string;
  arrowSide?: 'left' | 'right' | 'top' | 'bottom'; // which side of the CARD has the arrow
  position?: 'center';
}

const STEPS: GuideStep[] = [
  {
    id: 'welcome',
    title: '👋 Welcome to TOOLKIT!',
    description:
      "This quick tour will show you how to navigate the app, use AI tools, and get the most out of your workspace. You can skip or revisit this guide anytime from Settings.",
    position: 'center',
  },
  {
    id: 'sidebar-logo',
    title: '🧰 TOOLKIT Navbar',
    description:
      'The sidebar is your command center. It stays open on desktop and slides in on mobile. All core navigation lives here.',
    targetId: 'guide-navbar-brand',
    arrowSide: 'left',
  },
  {
    id: 'new-chat',
    title: '✨ New Chat',
    description:
      'Click "New Chat" to start a fresh AI conversation at any time. Your previous chats are saved in the Recents section below.',
    targetId: 'guide-new-chat-btn',
    arrowSide: 'left',
  },
  {
    id: 'mady-hub',
    title: '🤖 Mady Hub',
    description:
      'Your AI-powered assistant. Ask anything — get explanations, generate code, analyse data, brainstorm ideas and more.',
    targetId: 'guide-mady-hub-btn',
    arrowSide: 'left',
  },
  {
    id: 'tools',
    title: '🛠️ Tools',
    description:
      'Browse a full library of utility tools — calculators, converters, health trackers, games, device info, and more.',
    targetId: 'guide-tools-btn',
    arrowSide: 'left',
  },
  {
    id: 'insights',
    title: '📊 AI Insights',
    description:
      'View your AI usage analytics: tokens used, top topics, activity streaks and personalised insights.',
    targetId: 'guide-insights-btn',
    arrowSide: 'left',
  },
  {
    id: 'ai-guide',
    title: '📚 AI Guide',
    description:
      'Learn prompting techniques, best practices, and get the most out of every AI feature in TOOLKIT.',
    targetId: 'guide-ai-guide-btn',
    arrowSide: 'left',
  },
  {
    id: 'theme',
    title: '🎨 Theme Toggle',
    description:
      'Switch between Dark, Neon Dark, Plum Rose, Olive Lime, and Light themes to match your vibe.',
    targetId: 'guide-theme-btn',
    arrowSide: 'left',
  },
  {
    id: 'settings',
    title: '⚙️ Settings',
    description:
      'Manage your profile, account preferences, themes, and revisit this guide. Click the gear icon or your avatar.',
    targetId: 'guide-settings-btn',
    arrowSide: 'left',
  },
  {
    id: 'done',
    title: "🎉 You're all set!",
    description:
      "That's everything! Dive into TOOLKIT and explore. You can always re-open this guide from the Settings page.",
    position: 'center',
  },
];

// ── Highlight rectangle helper ────────────────────────────────────────
interface Rect { top: number; left: number; width: number; height: number; }
function getRect(id?: string): Rect | null {
  if (!id) return null;
  const el = document.getElementById(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// ── Arrow tip sizes ───────────────────────────────────────────────────
const ARROW_SIZE = 12; // px – CSS border-based triangle size
const ARROW_OFFSET_FROM_EDGE = 20; // how many px the tip is outside the card edge
const CARD_WIDTH = 320;
const CARD_PADDING = 24;

// ── Main Component ────────────────────────────────────────────────────
export default function OnboardingGuide() {
  const { tokens } = useTheme();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);
  const animFrameRef = useRef<number>();

  // ── Auto-show for new users ──────────────────────────────────────
  useEffect(() => {
    const seen = localStorage.getItem(GUIDE_SEEN_KEY);
    if (!seen) {
      const t = setTimeout(() => setActive(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  // ── Listen for manual trigger from Settings ──────────────────────
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setActive(true);
    };
    window.addEventListener(TRIGGER_GUIDE_EVENT, handler);
    return () => window.removeEventListener(TRIGGER_GUIDE_EVENT, handler);
  }, []);

  // ── Track highlighted element position live ──────────────────────
  const current = STEPS[step];
  const trackRect = useCallback(() => {
    setRect(getRect(current?.targetId));
    animFrameRef.current = requestAnimationFrame(trackRect);
  }, [current?.targetId]);

  useEffect(() => {
    if (active && current?.targetId) {
      animFrameRef.current = requestAnimationFrame(trackRect);
    } else {
      setRect(null);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [active, trackRect, current?.targetId]);

  // ── Re-trigger mount animation on step change ───────────────────
  useEffect(() => {
    setMounted(false);
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, [step, active]);

  if (!active) return null;

  // ── Actions ─────────────────────────────────────────────────────
  const finish = () => {
    localStorage.setItem(GUIDE_SEEN_KEY, 'true');
    setActive(false);
  };
  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  };
  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };
  const skip = () => finish();

  const PROGRESS = ((step + 1) / STEPS.length) * 100;
  const PAD = 10; // spotlight padding around element

  const isCentered = current.position === 'center' || !rect;

  // ── Compute card + arrow position ────────────────────────────────
  // Strategy: place card so the arrow tip lands exactly on the element's centre.
  // For arrowSide === 'left':
  //   - Card goes to the RIGHT of the element
  //   - Arrow tip is on the LEFT edge of the card
  //   - arrowTipY (within card) = targetCenterY − cardTop
  //   - We clamp arrowTipY so it stays inside the card (between ARROW_SIZE and cardHeight-ARROW_SIZE)
  //   - Then we solve for cardTop = targetCenterY − arrowTipY

  const CARD_MIN_HEIGHT = 240; // estimate; actual height may differ
  const MARGIN = 16;           // minimum gap from viewport edge
  const VP_H = window.innerHeight;
  const VP_W = window.innerWidth;

  let cardStyle: React.CSSProperties = {};
  let arrowStyle: React.CSSProperties = {};
  // arrowPointsTo: absolute screen coords of the tip
  let arrowTipOffsetY = 0; // pixels from card top where the arrow tip sits

  if (!isCentered && rect) {
    const side = current.arrowSide || 'left';
    const targetCenterY = rect.top + rect.height / 2;
    const targetCenterX = rect.left + rect.width / 2;

    if (side === 'left') {
      // Card is to the RIGHT of the target element
      const cardLeft = rect.left + rect.width + ARROW_OFFSET_FROM_EDGE + ARROW_SIZE;
      // Ideal card top: centre the arrow at targetCenterY
      // Arrow is a triangle; we place it at arrowTipOffsetY from the card top
      // Start: try to centre the card on the target
      let cardTop = targetCenterY - CARD_MIN_HEIGHT / 2;
      // Clamp so card doesn't overflow viewport vertically
      cardTop = Math.max(MARGIN, Math.min(cardTop, VP_H - CARD_MIN_HEIGHT - MARGIN));
      // How far from card's top is the target centre?
      arrowTipOffsetY = targetCenterY - cardTop;
      // Clamp arrow tip within card body
      arrowTipOffsetY = Math.max(ARROW_SIZE + 4, Math.min(arrowTipOffsetY, CARD_MIN_HEIGHT - ARROW_SIZE - 4));

      cardStyle = {
        position: 'fixed',
        top: cardTop,
        left: Math.min(cardLeft, VP_W - CARD_WIDTH - MARGIN),
        width: CARD_WIDTH,
      };

      // Left arrow: triangle pointing LEFT (←), sits on the left edge of card
      arrowStyle = {
        position: 'absolute',
        top: arrowTipOffsetY,
        left: -ARROW_SIZE * 2 - ARROW_OFFSET_FROM_EDGE + ARROW_SIZE,
        transform: 'translateY(-50%)',
        width: 0,
        height: 0,
        // right-pointing triangle (pointing toward the element on the left)
        // We want a LEFT-pointing triangle since the element is to the LEFT of the card
        borderTop: `${ARROW_SIZE}px solid transparent`,
        borderBottom: `${ARROW_SIZE}px solid transparent`,
        borderRight: `${ARROW_SIZE * 2}px solid ${tokens.accent}`,
        filter: 'drop-shadow(-2px 0 4px rgba(233,30,140,0.4))',
      };
    }

    if (side === 'right') {
      // Card to the LEFT of the target
      const cardRight = rect.left - ARROW_OFFSET_FROM_EDGE - ARROW_SIZE;
      let cardTop = targetCenterY - CARD_MIN_HEIGHT / 2;
      cardTop = Math.max(MARGIN, Math.min(cardTop, VP_H - CARD_MIN_HEIGHT - MARGIN));
      arrowTipOffsetY = targetCenterY - cardTop;
      arrowTipOffsetY = Math.max(ARROW_SIZE + 4, Math.min(arrowTipOffsetY, CARD_MIN_HEIGHT - ARROW_SIZE - 4));

      cardStyle = {
        position: 'fixed',
        top: cardTop,
        left: Math.max(MARGIN, cardRight - CARD_WIDTH),
        width: CARD_WIDTH,
      };
      arrowStyle = {
        position: 'absolute',
        top: arrowTipOffsetY,
        right: -ARROW_SIZE * 2 - ARROW_OFFSET_FROM_EDGE + ARROW_SIZE,
        transform: 'translateY(-50%)',
        width: 0,
        height: 0,
        borderTop: `${ARROW_SIZE}px solid transparent`,
        borderBottom: `${ARROW_SIZE}px solid transparent`,
        borderLeft: `${ARROW_SIZE * 2}px solid ${tokens.accent}`,
        filter: 'drop-shadow(2px 0 4px rgba(233,30,140,0.4))',
      };
    }

    if (side === 'top') {
      // Card below the target
      const cardTop = rect.top + rect.height + ARROW_OFFSET_FROM_EDGE + ARROW_SIZE;
      let cardLeft = targetCenterX - CARD_WIDTH / 2;
      cardLeft = Math.max(MARGIN, Math.min(cardLeft, VP_W - CARD_WIDTH - MARGIN));
      const arrowTipOffsetX = targetCenterX - cardLeft;

      cardStyle = { position: 'fixed', top: cardTop, left: cardLeft, width: CARD_WIDTH };
      arrowStyle = {
        position: 'absolute',
        top: -ARROW_SIZE * 2,
        left: arrowTipOffsetX,
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: `${ARROW_SIZE}px solid transparent`,
        borderRight: `${ARROW_SIZE}px solid transparent`,
        borderBottom: `${ARROW_SIZE * 2}px solid ${tokens.accent}`,
        filter: 'drop-shadow(0 -2px 4px rgba(233,30,140,0.4))',
      };
    }

    if (side === 'bottom') {
      // Card above the target
      const cardBottom = rect.top - ARROW_OFFSET_FROM_EDGE - ARROW_SIZE;
      let cardLeft = targetCenterX - CARD_WIDTH / 2;
      cardLeft = Math.max(MARGIN, Math.min(cardLeft, VP_W - CARD_WIDTH - MARGIN));
      const arrowTipOffsetX = targetCenterX - cardLeft;

      cardStyle = { position: 'fixed', top: cardBottom - CARD_MIN_HEIGHT, left: cardLeft, width: CARD_WIDTH };
      arrowStyle = {
        position: 'absolute',
        bottom: -ARROW_SIZE * 2,
        left: arrowTipOffsetX,
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: `${ARROW_SIZE}px solid transparent`,
        borderRight: `${ARROW_SIZE}px solid transparent`,
        borderTop: `${ARROW_SIZE * 2}px solid ${tokens.accent}`,
        filter: 'drop-shadow(0 2px 4px rgba(233,30,140,0.4))',
      };
    }
  }

  return (
    <>
      {/* ── Backdrop (spotlight) ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 8000, pointerEvents: 'none' }}>
        {rect && !isCentered ? (
          <svg
            width="100%" height="100%"
            style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
          >
            <defs>
              <mask id="guide-spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={rect.left - PAD} y={rect.top - PAD}
                  width={rect.width + PAD * 2} height={rect.height + PAD * 2}
                  rx="10" fill="black"
                />
              </mask>
            </defs>
            {/* Dark overlay with hole */}
            <rect
              width="100%" height="100%"
              fill="rgba(0,0,0,0.75)"
              mask="url(#guide-spotlight-mask)"
            />
            {/* Glowing border */}
            <rect
              x={rect.left - PAD} y={rect.top - PAD}
              width={rect.width + PAD * 2} height={rect.height + PAD * 2}
              rx="10"
              fill="none"
              stroke="#e91e8c"
              strokeWidth="2"
            >
              <animate attributeName="stroke-opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
            </rect>
            {/* Connector line from element centre to card */}
            {cardStyle.left !== undefined && (
              <line
                x1={rect.left + rect.width}
                y1={rect.top + rect.height / 2}
                x2={Number(cardStyle.left)}
                y2={(Number(cardStyle.top) || 0) + arrowTipOffsetY}
                stroke="#e91e8c"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                strokeOpacity="0.35"
              />
            )}
          </svg>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)' }} />
        )}
      </div>

      {/* ── Click-catcher: only covers DARK overlay areas, leaving the spotlight hole clickable ── */}
      {rect && !isCentered ? (
        <>
          {/* Top strip (above the spotlight) */}
          <div style={{
            position: 'fixed', zIndex: 8001,
            top: 0, left: 0, right: 0,
            height: Math.max(0, rect.top - PAD),
          }} onClick={(e) => e.stopPropagation()} />
          {/* Bottom strip (below the spotlight) */}
          <div style={{
            position: 'fixed', zIndex: 8001,
            top: rect.top + rect.height + PAD, left: 0, right: 0, bottom: 0,
          }} onClick={(e) => e.stopPropagation()} />
          {/* Left strip (left of spotlight, middle band) */}
          <div style={{
            position: 'fixed', zIndex: 8001,
            top: Math.max(0, rect.top - PAD),
            left: 0,
            width: Math.max(0, rect.left - PAD),
            height: rect.height + PAD * 2,
          }} onClick={(e) => e.stopPropagation()} />
          {/* Right strip (right of spotlight, middle band) — but NOT covering the tooltip card */}
          <div style={{
            position: 'fixed', zIndex: 8001,
            top: Math.max(0, rect.top - PAD),
            left: rect.left + rect.width + PAD,
            right: 0,
            height: rect.height + PAD * 2,
            // The tooltip card sits in this zone, but it is at z-index 8002 so it still receives clicks
          }} onClick={(e) => e.stopPropagation()} />
        </>
      ) : (
        /* Centered steps: full-screen catcher so only the card is interactive */
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 8001 }}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* ── Tooltip / Centered Modal ── */}
      {isCentered ? (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 8002,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            ...cardBase(tokens),
            maxWidth: 440, width: '90vw',
            pointerEvents: 'all',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.94)',
            transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <StepContent
              step={current} stepIdx={step} total={STEPS.length}
              progress={PROGRESS} onNext={next} onPrev={prev} onSkip={skip}
              tokens={tokens}
            />
          </div>
        </div>
      ) : (
        <div style={{
          ...cardStyle,
          ...cardBase(tokens),
          zIndex: 8002,
          pointerEvents: 'all',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0) scale(1)' : 'translateX(-12px) scale(0.94)',
          transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1), top 0.25s ease, left 0.25s ease',
        }}>
          {/* Precise arrow triangle */}
          <div style={arrowStyle} />

          <StepContent
            step={current} stepIdx={step} total={STEPS.length}
            progress={PROGRESS} onNext={next} onPrev={prev} onSkip={skip}
            tokens={tokens}
          />
        </div>
      )}

      <style>{`
        @keyframes guide-btn-pulse {
          0%, 100% { box-shadow: 0 4px 14px rgba(233,30,140,0.35); }
          50% { box-shadow: 0 4px 22px rgba(233,30,140,0.6); }
        }
      `}</style>
    </>
  );
}

// ── Card base styles ──────────────────────────────────────────────────
function cardBase(tokens: ThemeTokens): React.CSSProperties {
  return {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(233,30,140,0.15)',
    fontFamily: "'Space Grotesk', sans-serif",
    color: tokens.textPrimary,
    position: 'fixed',
    boxSizing: 'border-box',
  };
}

// ── Step content ──────────────────────────────────────────────────────
function StepContent({
  step, stepIdx, total, progress, onNext, onPrev, onSkip, tokens,
}: {
  step: GuideStep;
  stepIdx: number;
  total: number;
  progress: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  tokens: ThemeTokens;
}) {
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === total - 1;

  const ghostBtnStyle: React.CSSProperties = {
    background: 'none',
    border: `1px solid ${tokens.border}`,
    color: tokens.textSecondary,
    padding: '8px 14px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'Space Grotesk', sans-serif",
    transition: 'color 0.2s, border-color 0.2s',
  };

  const primaryBtnStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #e91e8c, #ff6b35)',
    border: 'none',
    color: '#fff',
    padding: '9px 20px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: "'Space Grotesk', sans-serif",
    animation: 'guide-btn-pulse 2s ease-in-out infinite',
    transition: 'opacity 0.2s, transform 0.15s',
  };

  return (
    <div>
      {/* Progress bar */}
      <div style={{
        height: 3, borderRadius: 99,
        background: `${tokens.border}`,
        marginBottom: 18, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: 'linear-gradient(90deg, #e91e8c, #ff6b35)',
          width: `${progress}%`,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Step indicator dots */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 14, alignItems: 'center' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            width: i === stepIdx ? 18 : 6,
            height: 6,
            borderRadius: 99,
            background: i === stepIdx
              ? 'linear-gradient(90deg, #e91e8c, #ff6b35)'
              : i < stepIdx ? tokens.accent : `${tokens.border}`,
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>

      {/* Title */}
      <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>
        {step.title}
      </div>

      {/* Description */}
      <div style={{ fontSize: 13.5, color: tokens.textSecondary, lineHeight: 1.65, marginBottom: 20 }}>
        {step.description}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left side: Skip */}
        <div>
          {!isLast && (
            <button
              onClick={onSkip}
              style={ghostBtnStyle}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = tokens.textPrimary;
                (e.currentTarget as HTMLButtonElement).style.borderColor = tokens.textPrimary;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = tokens.textSecondary;
                (e.currentTarget as HTMLButtonElement).style.borderColor = tokens.border;
              }}
            >
              Skip
            </button>
          )}
        </div>

        {/* Right side: Prev + Next */}
        <div style={{ display: 'flex', gap: 8 }}>
          {!isFirst && (
            <button
              onClick={onPrev}
              style={ghostBtnStyle}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = tokens.textPrimary;
                (e.currentTarget as HTMLButtonElement).style.borderColor = tokens.textPrimary;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = tokens.textSecondary;
                (e.currentTarget as HTMLButtonElement).style.borderColor = tokens.border;
              }}
            >
              ← Prev
            </button>
          )}
          <button
            onClick={onNext}
            style={primaryBtnStyle}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
            onMouseDown={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'}
            onMouseUp={e => (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'}
          >
            {isLast ? "🚀 Let's Go!" : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
