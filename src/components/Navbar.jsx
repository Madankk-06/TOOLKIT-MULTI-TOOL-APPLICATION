import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Outline SVG Icons for Professional Aesthetics
const ChatIconSVG = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const ToolsSVG = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const InsightsSVG = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const SettingsSVG = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const NewChatSVG = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const PinSVG = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2v8M5 12h14M19 12v1a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5v-1" /></svg>;
const StarOutlineSVG = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;

const SunSVG = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>;
const MoonSVG = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>;
const SparklesSVG = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></svg>;
const RoseSVG = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /></svg>;
const LeafSVG = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 3 2 8.28-3.2 13.8A7 7 0 0 1 11 20z" /><path d="M19 2L9.8 11.2" /></svg>;

const HamburgerSVG = ({ open }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    {open ? (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>) : (<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>)}
  </svg>
);

export default function Navbar() {
  const { currentUser } = useAuth();
  const { theme, toggleTheme, tokens } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [chatHistory, setChatHistory] = useState([
    'Code Error Troubleshooting',
    'Google One Video Creation',
    'Variable Name Validation',
    'Future Predictions Analysis',
    'Toolkit App About Section'
  ]);

  useEffect(() => {
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem('toolkit-chat-history');
        if (stored) {
          setChatHistory(JSON.parse(stored));
        } else {
          const initial = [
            'Code Error Troubleshooting',
            'Google One Video Creation',
            'Variable Name Validation',
            'Future Predictions Analysis',
            'Toolkit App About Section'
          ];
          localStorage.setItem('toolkit-chat-history', JSON.stringify(initial));
          setChatHistory(initial);
        }
      } catch (e) {
        console.error("Failed to load search query history:", e);
      }
    };
    loadHistory();
    window.addEventListener('toolkit-chat-history-updated', loadHistory);
    return () => window.removeEventListener('toolkit-chat-history-updated', loadHistory);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const email = currentUser?.email || '';
  const shortEmail = email.length > 20 ? email.slice(0, 18) + '…' : email;
  const avatar = displayName.charAt(0).toUpperCase();

  const handleRecentPrompt = (promptText) => {
    navigate(`/?q=${encodeURIComponent(promptText)}`);
  };

  const sidebarContent = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: tokens.surface,
      color: tokens.textPrimary,
      padding: '20px 14px',
      boxSizing: 'border-box',
    }}>
      <style>{`
        .nav-item-animated {
          --w: 270px;
          --h: 44px;
          --w-neg: -270px;
          --h-neg: -44px;
          
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: box-shadow ease-in-out 0.6s, color ease-in-out 0.5s, border-color 0.3s;
          box-sizing: border-box;
          text-align: left;
          color: var(--text-resting);
          
          /* Inset Quadrant shadows by default */
          box-shadow: 
            inset var(--w-neg) var(--h-neg) 0 var(--q1), 
            inset var(--w) var(--h-neg) 0 var(--q2), 
            inset var(--w-neg) var(--h) 0 var(--q3), 
            inset var(--w) var(--h) 0 var(--q4), 
            0 0 10px transparent;
        }

        /* Hover or Active state: Clear shadows and reveal glow */
        .nav-item-animated:hover,
        .nav-item-animated.active {
          box-shadow:            inset 0 0 0 transparent, 
            inset 0 0 0 transparent, 
            inset 0 0 0 transparent, 
            inset 0 0 0 transparent, 
            0 0 14px var(--glow-color);
          border-color: var(--border-color);
          color: var(--text-active) !important;
          background: var(--bg-hover-tab) !important;
        }

        [data-theme="dark"] .nav-item-animated {
          --q1: #1a1a26;
          --q2: #242436;
          --q3: #111119;
          --q4: rgba(255, 126, 95, 0.05);
          --glow-color: rgba(255, 126, 95, 0.35);
          --border-color: rgba(255, 126, 95, 0.25);
          --text-resting: #a6adc8;
          --text-active: #ff7e5f;
          --bg-hover-tab: rgba(255, 255, 255, 0.05);
        }

        [data-theme="neon-dark"] .nav-item-animated {
          --q1: #1b1b1b;
          --q2: #252525;
          --q3: #141414;
          --q4: rgba(33, 241, 168, 0.05);
          --glow-color: rgba(33, 241, 168, 0.35);
          --border-color: rgba(33, 241, 168, 0.25);
          --text-resting: #b3b3b3;
          --text-active: #21F1A8;
          --bg-hover-tab: rgba(33, 241, 168, 0.08);
        }

        [data-theme="plum-rose"] .nav-item-animated {
          --q1: #5e284a;
          --q2: #703c5d;
          --q3: #4b1a3b;
          --q4: rgba(233, 193, 183, 0.05);
          --glow-color: rgba(233, 193, 183, 0.35);
          --border-color: rgba(233, 193, 183, 0.25);
          --text-resting: #f4d8d3;
          --text-active: #E9C1B7;
          --bg-hover-tab: rgba(233, 193, 183, 0.08);
        }

        [data-theme="olive-lime"] .nav-item-animated {
          --q1: #2a3b29;
          --q2: #354a34;
          --q3: #1f2c1e;
          --q4: rgba(228, 253, 151, 0.05);
          --glow-color: rgba(228, 253, 151, 0.35);
          --border-color: rgba(228, 253, 151, 0.25);
          --text-resting: #d2e5cf;
          --text-active: #E4FD97;
          --bg-hover-tab: rgba(228, 253, 151, 0.08);
        }

        [data-theme="light"] .nav-item-animated {
          --q1: #f1f5f9;
          --q2: #f8fafc;
          --q3: #e2e8f0;
          --q4: rgba(5, 5, 169, 0.05);
          --glow-color: rgba(5, 5, 169, 0.2);
          --border-color: rgba(5, 5, 169, 0.15);
          --text-resting: #475569;
          --text-active: #0505A9;
          --bg-hover-tab: rgba(5, 5, 169, 0.05);
        }
      `}</style>
      {/* ── TOP BRAND HEADER ── */}
      <div id="guide-navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <img
          src="/logo.png"
          alt="ToolKit Logo"
          style={{ width: '32px', height: '32px', objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '20px',
            fontWeight: '900',
            letterSpacing: '1.5px',
            background: 'linear-gradient(135deg, #e91e8c, #ff6b35)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>TOOLKIT</span>
        </div>
      </div>

      {/* ── NEW CHAT BUTTON ── */}
      <button
        id="guide-new-chat-btn"
        onClick={() => navigate('/')}
        className="nav-item-animated"
        style={{
          marginBottom: '24px',
          fontWeight: '700',
          padding: '12px 14px'
        }}
      >
        <NewChatSVG />
        New Chat
      </button>

      {/* ── CORE NAVIGATION VECTOR ITEMS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
        <button
          id="guide-mady-hub-btn"
          onClick={() => navigate('/?view=mady')}
          className={`nav-item-animated ${(location.pathname === '/' && location.search !== '?view=tools') ? 'active' : ''}`}
        >
          <ChatIconSVG />
          Mady Hub
        </button>

        <button
          id="guide-tools-btn"
          onClick={() => navigate('/?view=tools')}
          className={`nav-item-animated ${(location.pathname === '/' && location.search === '?view=tools') ? 'active' : ''}`}
        >
          <ToolsSVG />
          Tools
        </button>

        <button
          id="guide-insights-btn"
          onClick={() => navigate('/insights')}
          className={`nav-item-animated ${location.pathname === '/insights' ? 'active' : ''}`}
        >
          <InsightsSVG />
          AI Insights
        </button>

        <button
          id="guide-ai-guide-btn"
          onClick={() => navigate('/ai-guide')}
          className={`nav-item-animated ${location.pathname === '/ai-guide' ? 'active' : ''}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          AI Guide
        </button>
      </div>

      {/* ── RECENTS CHAT LIST ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={sectionHeaderStyle}>Recents</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {chatHistory.map((item) => (
            <button
              key={item}
              onClick={() => handleRecentPrompt(item)}
              style={recentItemStyle}
              onMouseEnter={(e) => e.currentTarget.style.color = tokens.textPrimary}
              onMouseLeave={(e) => e.currentTarget.style.color = tokens.textSecondary}
            >
              <StarOutlineSVG />
              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── THEME SWITCHER CONTROLS ── */}
      <div style={{ borderTop: `1px solid ${tokens.border}`, paddingTop: '14px', marginBottom: '14px' }}>
        <button
          id="guide-theme-btn"
          onClick={toggleTheme}
          className="nav-item-animated"
          style={{ justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {theme === 'light' ? <SunSVG /> : theme === 'neon-dark' ? <SparklesSVG /> : theme === 'plum-rose' ? <RoseSVG /> : theme === 'olive-lime' ? <LeafSVG /> : <MoonSVG />}
            <span>Theme Toggle</span>
          </div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', opacity: 0.6 }}>{theme}</span>
        </button>
      </div>

      {/* ── USER PROFILE SETTINGS FOOTER AREA ── */}
      <div style={{
        borderTop: `1px solid ${tokens.border}`,
        paddingTop: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        <div 
          onClick={() => navigate('/settings')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, minWidth: 0 }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #e91e8c, #ff6b35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '13px',
            fontWeight: '900',
            color: '#fff',
            flexShrink: 0
          }}>
            {avatar}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '14.5px', fontWeight: '700', color: tokens.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </span>
            <span style={{ fontSize: '12px', color: tokens.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {shortEmail}
            </span>
          </div>
        </div>

        <button
          id="guide-settings-btn"
          onClick={() => navigate('/settings')}
          style={{
            background: 'none',
            border: 'none',
            color: tokens.textSecondary,
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = tokens.textPrimary}
          onMouseLeave={(e) => e.currentTarget.style.color = tokens.textSecondary}
          title="Settings"
        >
          <SettingsSVG />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP VIEW SIDEBAR ── */}
      {!isMobile ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '290px',
          borderRight: `1px solid ${tokens.border}`,
          zIndex: 900,
        }}>
          {sidebarContent}
        </div>
      ) : (
        /* ── MOBILE HEADER & COLLAPSIBLE DRAWER ── */
        <>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            backgroundColor: tokens.surface,
            borderBottom: `1px solid ${tokens.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 990,
          }}>
            <button
              onClick={() => setMobileOpen(o => !o)}
              style={{
                background: 'none',
                border: 'none',
                color: tokens.textPrimary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <HamburgerSVG open={mobileOpen} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src="/logo.png"
                alt="Logo"
                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              />
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: '900', fontSize: '16px', background: 'linear-gradient(135deg, #e91e8c, #ff6b35)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ToolKit
              </span>
            </div>

            <button
              onClick={() => navigate('/settings')}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #e91e8c, #ff6b35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '11px',
                fontWeight: '900',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {avatar}
            </button>
          </div>

          {/* Collapsible Mobile Drawer Container */}
          <AnimatePresence>
            {mobileOpen && (
              <>
                {/* Backdrop Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: '#000',
                    zIndex: 995,
                  }}
                />
                {/* Sidebar Panel Drawer */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: '280px',
                    maxWidth: '85vw',
                    backgroundColor: tokens.surface,
                    zIndex: 996,
                    boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
                  }}
                >
                  {sidebarContent}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}

// ── CUSTOM REUSABLE CSS PROPERTIES FOR NAVIGATION LINKS ──
const navLinkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: 'none',
  background: 'none',
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background-color 0.2s, color 0.2s',
};

const sectionHeaderStyle = {
  fontSize: '12px',
  fontWeight: '700',
  textTransform: 'uppercase',
  color: 'var(--section-label-color)',
  letterSpacing: '1px',
  paddingLeft: '12px',
  marginBottom: '8px',
  marginTop: '12px',
};

const pinnedItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '6px 12px',
  borderRadius: '6px',
  border: 'none',
  background: 'none',
  color: 'var(--recent-item-color)',
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: '14.5px',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'color 0.2s',
};

const recentItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '6px 12px',
  borderRadius: '6px',
  border: 'none',
  background: 'none',
  color: 'var(--recent-item-color)',
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: '14.5px',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'color 0.2s',
};
