import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ThemeContext } from '../context/ThemeContext';
import BackButton from './BackButton';

interface ToolWrapperProps {
  children: React.ReactNode;
  toolName: string;
  borderless?: boolean;
}

export default function ToolWrapper({ children, toolName, borderless }: ToolWrapperProps) {
  const navigate = useNavigate();
  const themeContext = useContext(ThemeContext);
  
  // Safe default fallback handling if theme provider mounts late
  const tokens = themeContext?.tokens || {
    surface: '#1e1e2e',
    background: '#0c0c0c',
    border: '#313244',
    textPrimary: '#cdd6f4',
    textSecondary: '#a6adc8',
    accent: '#ff7e5f'
  };

  // Modern responsive layout styles using unified theme variables
  const containerStyle: React.CSSProperties = {
    maxWidth: borderless ? '1200px' : '800px',
    width: '100%',
    margin: '0 auto',
    padding: borderless ? '16px 8px' : '24px 16px',
    boxSizing: 'border-box',
    fontFamily: "'Rajdhani', sans-serif"
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: borderless ? 'none' : `1px solid ${tokens.border}`,
    paddingBottom: '16px',
    marginBottom: borderless ? '12px' : '24px',
    gap: '16px'
  };

  const backBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: `${tokens.accent}15`,
    border: `1px solid ${tokens.border}`,
    color: tokens.accent,
    padding: '8px 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '700',
    fontFamily: "'Orbitron', sans-serif",
    transition: 'all 0.2s ease'
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: 'clamp(18px, 3.5vw, 24px)',
    fontWeight: '900',
    color: tokens.textPrimary,
    margin: 0,
    letterSpacing: '1px',
    textAlign: 'right'
  };

  const contentCardStyle: React.CSSProperties = {
    backgroundColor: borderless ? 'transparent' : tokens.surface,
    border: borderless ? 'none' : `1px solid ${tokens.border}`,
    borderRadius: borderless ? '0px' : '20px',
    padding: borderless ? '0px' : '32px 24px',
    boxShadow: borderless ? 'none' : '0 20px 40px rgba(0,0,0,0.25)',
    transition: 'background-color 0.3s ease, border-color 0.3s ease'
  };

  return (
    <div style={containerStyle}>
      {/* Dynamic Header Toolbar Navigation Row */}
      <header style={headerStyle}>
        <BackButton />
        <h2 style={titleStyle}>{toolName}</h2>
      </header>

      {/* Main Tool Content Container Card Layer */}
      <motion.main
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={contentCardStyle}
      >
        {children}
      </motion.main>
    </div>
  );
}
