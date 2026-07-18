import React, { useEffect, useState, useMemo, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { categories } from '../data/categories';
import { SmartSearch } from '../components/SmartSearch';
import { GridScan } from './GridScan';
import DotField from './DotField';

// ── Samsung-style 3D metallic category icons ─────────────────────
const CategoryIcons = {
  timeanddate: React.memo(() => (
    <svg width="68" height="68" viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id="h_td_body" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="var(--metal-light)" /><stop offset="50%" stopColor="var(--metal-mid)" /><stop offset="100%" stopColor="var(--metal-dark)" />
        </radialGradient>
        <radialGradient id="h_td_face" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--bg-card)" /><stop offset="100%" stopColor="var(--bg-primary)" />
        </radialGradient>
        <linearGradient id="h_td_gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0c080" /><stop offset="100%" stopColor="#a07840" />
        </linearGradient>
        <filter id="h_td_sh"><feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.7" /></filter>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#h_td_body)" filter="url(#h_td_sh)" />
      <circle cx="32" cy="32" r="23" fill="url(#h_td_face)" />
      <circle cx="32" cy="32" r="23" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" fill="none" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => {
        const a = (i * 30 - 90) * Math.PI / 180;
        const r1 = i % 3 === 0 ? 16 : 18; const r2 = 21;
        return <line key={i} x1={32 + Math.cos(a) * r1} y1={32 + Math.sin(a) * r1} x2={32 + Math.cos(a) * r2} y2={32 + Math.sin(a) * r2} stroke={i % 3 === 0 ? '#c9a96e' : 'rgba(201,169,110,0.35)'} strokeWidth={i % 3 === 0 ? 2 : 1} strokeLinecap="round" />;
      })}
      <line x1="32" y1="32" x2="32" y2="16" stroke="#e0e0f0" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="32" x2="42" y2="36" stroke="#e0e0f0" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="32" y1="32" x2="24" y2="40" stroke="#e91e8c" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="32" cy="32" r="3" fill="url(#h_td_gold)" />
      <circle cx="32" cy="32" r="1.2" fill="#fff" opacity="0.8" />
    </svg>
  )),
  calculative: React.memo(() => (
    <svg width="68" height="68" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="h_cl_body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c9a96e" /><stop offset="40%" stopColor="#a07840" /><stop offset="100%" stopColor="#5a3820" />
        </linearGradient>
        <linearGradient id="h_cl_scr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2a3a" /><stop offset="100%" stopColor="#0a0f15" />
        </linearGradient>
        <filter id="h_cl_sh"><feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.7" /></filter>
      </defs>
      <rect x="6" y="8" width="52" height="48" rx="8" fill="url(#h_cl_body)" filter="url(#h_cl_sh)" />
      <rect x="6" y="8" width="52" height="48" rx="8" fill="url(#h_cl_body)" />
      <rect x="10" y="12" width="44" height="40" rx="5" fill="url(#h_cl_scr)" />
      <rect x="13" y="15" width="38" height="10" rx="2.5" fill="#00d4ff" opacity="0.15" />
      <rect x="13" y="15" width="38" height="10" rx="2.5" stroke="#00d4ff" strokeOpacity="0.4" strokeWidth="1" fill="none" />
      <text x="46" y="23" textAnchor="end" fill="#00d4ff" fontSize="8" fontFamily="'Orbitron',sans-serif" fontWeight="700" opacity="0.9">1,234</text>
      {[[17, 32], [26, 32], [35, 32], [44, 32], [17, 42], [26, 42], [35, 42], [44, 42]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3.5" fill={i === 7 ? '#e91e8c' : i > 3 ? '#c9a96e' : 'rgba(255,255,255,0.25)'} stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
      ))}
    </svg>
  )),
  tools: React.memo(() => (
    <svg width="68" height="68" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="h_tl_chrome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d0d0e0" /><stop offset="50%" stopColor="#8a8a9a" /><stop offset="100%" stopColor="#4a4a5a" />
        </linearGradient>
        <linearGradient id="h_tl_gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0c080" /><stop offset="100%" stopColor="#a07840" />
        </linearGradient>
        <filter id="h_tl_sh"><feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.7" /></filter>
      </defs>
      <g filter="url(#h_tl_sh)">
        <path d="M14 12 C14 8 18 5 22 6 L18 10 L20 14 L24 12 C25 16 23 20 19 21 L8 34 C6 36 6 39 8 41 C10 43 13 43 15 41 L28 28 C32 27 36 25 37 21 L34 23 L30 21 L34 17 C33 13 29 11 25 12" fill="url(#h_tl_chrome)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        <circle cx="10" cy="39" r="3" fill="url(#h_tl_gold)" />
      </g>
      <g transform="rotate(40 40 35)" filter="url(#h_tl_sh)">
        <rect x="36" y="15" width="8" height="32" rx="4" fill="url(#h_tl_chrome)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <rect x="37" y="40" width="6" height="8" rx="1" fill="url(#h_tl_gold)" />
        <rect x="38.5" y="14" width="3" height="5" rx="1" fill="#4a4a5a" />
      </g>
    </svg>
  )),
  health: React.memo(() => (
    <svg width="68" height="68" viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id="h_hl_heart" cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#ff6b8a" /><stop offset="50%" stopColor="#e91e5e" /><stop offset="100%" stopColor="#8b0030" />
        </radialGradient>
        <filter id="h_hl_sh"><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#c00040" floodOpacity="0.6" /></filter>
      </defs>
      <path d="M32 54 C32 54 8 38 8 22 C8 13 14 7 22 9 C26 10 30 14 32 18 C34 14 38 10 42 9 C50 7 56 13 56 22 C56 38 32 54 32 54Z" fill="url(#h_hl_heart)" filter="url(#h_hl_sh)" />
      <path d="M32 54 C32 54 8 38 8 22 C8 13 14 7 22 9 C26 10 30 14 32 18 C34 14 38 10 42 9 C50 7 56 13 56 22 C56 38 32 54 32 54Z" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <path d="M32 48 C32 48 12 34 12 22 C12 15 17 10 22 12" fill="rgba(255,255,255,0.08)" stroke="none" />
      <path d="M16 30 L22 30 L25 22 L28 38 L31 26 L34 30 L38 30 L41 24 L44 30 L48 30" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" />
    </svg>
  )),
  text: React.memo(() => (
    <svg width="68" height="68" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="h_tx_body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--bg-card)" /><stop offset="100%" stopColor="var(--bg-primary)" />
        </linearGradient>
        <linearGradient id="h_tx_edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8a8a9a" /><stop offset="100%" stopColor="#4a4a5a" />
        </linearGradient>
        <filter id="h_tx_sh"><feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.7" /></filter>
      </defs>
      <rect x="7" y="6" width="50" height="52" rx="7" fill="url(#h_tx_edge)" filter="url(#h_tx_sh)" />
      <rect x="9" y="8" width="46" height="48" rx="6" fill="url(#h_tx_body)" />
      <path d="M43 8 L55 20" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <path d="M43 8 L55 8 L55 20 Z" fill="rgba(255,255,255,0.06)" />
      <line x1="14" y1="22" x2="50" y2="22" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <line x1="14" y1="30" x2="46" y2="30" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="14" y1="37" x2="42" y2="37" stroke="rgba(255,255,255,0.28)" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="14" y1="44" x2="36" y2="44" stroke="rgba(255,255,255,0.20)" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="36" y="41" width="2" height="7" rx="1" fill="#c9a96e" opacity="0.9" />
    </svg>
  )),
  media: React.memo(() => (
    <svg width="68" height="68" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="h_md_body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c9a96e" /><stop offset="50%" stopColor="#8a6030" /><stop offset="100%" stopColor="#4a3018" />
        </linearGradient>
        <linearGradient id="h_md_screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a2a" /><stop offset="100%" stopColor="#0a0a15" />
        </linearGradient>
        <filter id="h_md_sh"><feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.7" /></filter>
      </defs>
      <rect x="5" y="14" width="54" height="36" rx="7" fill="url(#h_md_body)" filter="url(#h_md_sh)" />
      <rect x="8" y="17" width="48" height="30" rx="5" fill="url(#h_md_screen)" />
      {[10, 16, 22, 28, 34, 40, 46, 52].map((x, i) => (
        <rect key={i} x={x} y={i % 2 === 0 ? 14 : 44} width="4" height="4" rx="1" fill="rgba(0,0,0,0.4)" />
      ))}
      <circle cx="32" cy="32" r="10" fill="rgba(201,169,110,0.2)" stroke="#c9a96e" strokeWidth="1.5" />
      <polygon points="29,27 29,37 40,32" fill="#c9a96e" />
      {[3, 6, 4].map((h, i) => (
        <rect key={i} x={44 + i * 4} y={32 - h} width="2.5" height={h * 2} rx="1.2" fill="#00d4ff" opacity={0.6 + i * 0.15} />
      ))}
    </svg>
  )),
  device: React.memo(() => (
    <svg width="68" height="68" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="h_dv_body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9a9aaa" /><stop offset="50%" stopColor="#6a6a7a" /><stop offset="100%" stopColor="#3a3a4a" />
        </linearGradient>
        <linearGradient id="h_dv_scr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2a3a" /><stop offset="100%" stopColor="#080f18" />
        </linearGradient>
        <filter id="h_dv_sh"><feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.7" /></filter>
      </defs>
      <rect x="18" y="3" width="28" height="58" rx="6" fill="url(#h_dv_body)" filter="url(#h_dv_sh)" />
      <rect x="20" y="7" width="24" height="50" rx="4" fill="url(#h_dv_scr)" />
      <rect x="20" y="7" width="24" height="50" rx="4" fill="url(#h_dv_scr)" opacity="0.8" />
      <rect x="22" y="9" width="20" height="3" rx="1.5" fill="rgba(0,212,255,0.2)" />
      {[[24, 16], [30, 16], [36, 16], [24, 24], [30, 24], [36, 24], [24, 32], [30, 32]].map(([cx, cy], i) => (
        <rect key={i} x={cx - 2.5} y={cy - 2.5} width="5" height="5" rx="1.2" fill={['#c9a96e', '#00d4ff', '#e91e8c', '#00ff88', '#c9a96e', '#00d4ff', '#e91e8c', 'rgba(255,255,255,0.2)'][i]} opacity={0.8} />
      ))}
      <rect x="28" y="52" width="8" height="2" rx="1" fill="#c9a96e" opacity="0.7" />
      <rect x="28" y="4" width="8" height="4" rx="2" fill="#2a2a3a" />
    </svg>
  )),
  games: React.memo(() => (
    <svg width="68" height="68" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="h_gm_body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c9a96e" /><stop offset="50%" stopColor="#8a6030" /><stop offset="100%" stopColor="#4a3018" />
        </linearGradient>
        <linearGradient id="h_gm_face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a1a2a" /><stop offset="100%" stopColor="#0a0a15" />
        </linearGradient>
        <filter id="h_gm_sh"><feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#000" floodOpacity="0.7" /></filter>
      </defs>
      <path d="M10 24 C10 17 15 12 22 12 L42 12 C49 12 54 17 54 24 L54 40 C54 47 49 52 42 52 L22 52 C15 52 10 47 10 40Z" fill="url(#h_gm_body)" filter="url(#h_gm_sh)" />
      <path d="M13 24 C13 19 17 15 22 15 L42 15 C47 15 51 19 51 24 L51 40 C51 45 47 49 42 49 L22 49 C17 49 13 45 13 40Z" fill="url(#h_gm_face)" />
      <rect x="18" y="28" width="12" height="4" rx="2" fill="rgba(255,255,255,0.25)" />
      <rect x="22" y="24" width="4" height="12" rx="2" fill="rgba(255,255,255,0.25)" />
      <circle cx="44" cy="27" r="3.5" fill="#e91e8c" opacity="0.9" />
      <circle cx="44" cy="37" r="3.5" fill="#00d4ff" opacity="0.9" />
      <circle cx="39" cy="32" r="3.5" fill="#c9a96e" opacity="0.9" />
      <circle cx="49" cy="32" r="3.5" fill="#00ff88" opacity="0.9" />
      <rect x="14" y="10" width="10" height="6" rx="3" fill="url(#h_gm_body)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <rect x="40" y="10" width="10" height="6" rx="3" fill="url(#h_gm_body)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
    </svg>
  )),
};

const categoryMeta = {
  timeanddate: { color: '#00d4ff', glow: 'rgba(0,212,255,0.3)' },
  calculative: { color: '#c9a96e', glow: 'rgba(201,169,110,0.3)' },
  tools: { color: '#c9a96e', glow: 'rgba(201,169,110,0.3)' },
  health: { color: '#ff4d6d', glow: 'rgba(255,77,109,0.3)' },
  text: { color: '#00d4ff', glow: 'rgba(0,212,255,0.3)' },
  media: { color: '#c9a96e', glow: 'rgba(201,169,110,0.3)' },
  device: { color: '#00d4ff', glow: 'rgba(0,212,255,0.3)' },
  games: { color: '#c9a96e', glow: 'rgba(201,169,110,0.3)' },
};

function Particle({ i }) {
  const colors = ['#e91e8c', '#ff6b35', '#00d4ff', '#c9a96e', '#00ff88'];
  const color = colors[i % colors.length];
  const size = [2, 3, 4, 2, 3, 2, 4, 3][i % 8];
  const positions = [
    ['7%', '12%'], ['14%', '82%'], ['22%', '38%'], ['30%', '93%'], ['44%', '5%'],
    ['50%', '65%'], ['60%', '18%'], ['70%', '78%'], ['76%', '47%'], ['85%', '90%'],
    ['90%', '11%'], ['5%', '55%'], ['40%', '27%'], ['18%', '63%'], ['55%', '84%'],
    ['68%', '52%'], ['33%', '9%'], ['80%', '31%'],
  ];
  const [top, left] = positions[i % positions.length];
  const dur = 6 + (i % 6);
  const delay = (i * 0.4) % 5;
  return (
    <div style={{
      position: 'absolute', top, left, width: `${size}px`, height: `${size}px`,
      borderRadius: '50%', background: color, boxShadow: `0 0 ${size * 4}px ${color}`,
      animation: `float ${dur}s ease-in-out ${delay}s infinite alternate`, opacity: 0.55, pointerEvents: 'none',
    }} />
  );
}

// ── Animation Meta & Custom Category Card for GSAP-style Drop & Float ─────────
const cardAnimationMeta = [
  { rot: -9, depth: 14 },
  { rot: -5, depth: 10 },
  { rot: -2, depth: 8 },
  { rot: 3,  depth: 12 },
  { rot: 0,  depth: 6 },
  { rot: 4,  depth: 11 },
  { rot: 7,  depth: 9 },
  { rot: -4, depth: 13 },
];

const cardVariants = {
  hidden: (i) => ({
    opacity: 0,
    y: -800,
    rotate: (cardAnimationMeta[i % cardAnimationMeta.length]?.rot || 0) + 25,
    scale: 0.7
  }),
  visible: (i) => ({
    opacity: 1,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 85,
      damping: 13,
      mass: 0.95,
      delay: i * 0.08
    }
  }),
};

function CategoryCard({ cat, index, tokens, navigate, shouldReduce }) {
  const meta = categoryMeta[cat.id] || { color: '#c9a96e', glow: 'rgba(201,169,110,0.3)' };
  const [tilt, setTilt] = useState({ x: 0, y: 0, scale: 1 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: px * 16, y: -py * 16, scale: 1.12 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, scale: 1 });
    setIsHovered(false);
  };

  const Icon = CategoryIcons[cat.id];
  const restRot = cardAnimationMeta[index % cardAnimationMeta.length]?.rot || 0;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      style={{
        width: '100%',
        height: '100%',
        perspective: 800,
        transformStyle: 'preserve-3d',
      }}
    >
      <motion.div
        onClick={() => navigate(`/category/${cat.id}`)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          backgroundColor: tokens.surface,
          border: `1px solid ${isHovered ? meta.color : tokens.border}`,
          borderRadius: '18px',
          padding: '26px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          cursor: 'pointer',
          width: '100%',
          height: '100%',
          boxShadow: isHovered ? `0 28px 56px rgba(0,0,0,0.38), 0 0 24px ${meta.glow}` : 'none',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
        animate={
          isHovered
            ? {
                rotateX: tilt.y,
                rotateY: tilt.x,
                scale: tilt.scale,
                zIndex: 20,
                y: 0,
              }
            : {
                rotateX: 0,
                rotateY: 0,
                scale: 1,
                zIndex: 1,
                // Floating animation
                y: shouldReduce ? 0 : [0, 8 + (index % 3) * 3, 0],
                rotate: shouldReduce ? 0 : [0, index % 2 === 0 ? 1 : -1, 0],
              }
        }
        transition={
          isHovered
            ? { type: 'tween', ease: 'easeOut', duration: 0.25 }
            : {
                y: {
                  duration: 3.2 + (index % 4) * 0.4,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'reverse',
                  delay: index * 0.1,
                },
                rotate: {
                  duration: 3.2 + (index % 4) * 0.4,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatType: 'reverse',
                  delay: index * 0.1,
                },
              }
        }
      >
        <motion.div
          animate={isHovered && !shouldReduce ? { rotateY: [0, 12, -8, 0], rotateX: [0, -6, 4, 0], y: [0, -6, -4, 0] } : { rotateY: 0, rotateX: 0, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
          style={{ width: '88px', height: '88px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {Icon && <Icon />}
        </motion.div>

        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '15.5px', fontWeight: '800', color: meta.color, margin: 0, letterSpacing: '0.5px' }}>
          {cat.name}
        </h3>

        <div style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30`, borderRadius: '20px', padding: '4px 12px' }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: meta.color }}>
            {cat.tools.length} assets
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const { currentUser } = useAuth();
  const themeContext = useContext(ThemeContext);
  if (!themeContext) return null;
  const { theme, tokens } = themeContext;
  const isLight = theme === 'light' || theme === 'plum-rose' || theme === 'olive-lime';

  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduce = useReducedMotion();
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [initialSearchQuery, setInitialSearchQuery] = useState('');
  const [showManualGrid, setShowManualGrid] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    const query = params.get('q');
    
    if (view === 'tools') {
      setShowManualGrid(true);
    } else {
      setShowManualGrid(false);
    }

    if (query) {
      setInitialSearchQuery(query);
    } else {
      setInitialSearchQuery('');
    }
  }, [location.search]);

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const totalTools = categories.reduce((a, c) => a + c.tools.length, 0);

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
  };

  const allTools = useMemo(() => categories.flatMap(cat =>
    cat.tools.map(tool => ({ ...tool, categoryId: cat.id, categoryName: cat.name }))
  ), []);

  const filteredTools = [];

  const rootWrapperStyle = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: tokens.background,
    color: tokens.textPrimary,
    transition: 'background-color 0.3s, color 0.3s',
    position: 'relative',
    overflow: 'hidden'
  };

  const primaryContentArea = {
    flex: 1,
    padding: isMobile ? '24px 16px' : '40px',
    position: 'relative',
    zIndex: 1,
    maxWidth: '1280px',
    width: '100%',
    margin: '0 auto'
  };

  return (
    <div style={rootWrapperStyle}>
      {/* Dynamic theme-aware background: DotField for Light, GridScan for others */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: isMobile ? 0 : 260,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: theme === 'light' ? 0.85 : theme === 'plum-rose' ? 0.75 : theme === 'olive-lime' ? 0.75 : 0.88,
        }}
      >
        {theme === 'light' || theme === 'plum-rose' || theme === 'olive-lime' ? (
          <DotField
            dotRadius={2.5}
            dotSpacing={14}
            cursorRadius={450}
            cursorForce={0.12}
            bulgeStrength={70}
            gradientFrom={
              theme === 'light'      ? "rgba(26, 115, 232, 0.75)" :
              theme === 'plum-rose'  ? "rgba(255, 107, 157, 0.75)" :
              "rgba(184, 255, 0, 0.75)"
            }
            gradientTo={
              theme === 'light'      ? "rgba(124, 58, 237, 0.65)" :
              theme === 'plum-rose'  ? "rgba(233, 193, 183, 0.65)" :
              "rgba(228, 253, 151, 0.65)"
            }
            glowColor={
              theme === 'light'      ? "rgba(26, 115, 232, 0.20)" :
              theme === 'plum-rose'  ? "rgba(255, 107, 157, 0.20)" :
              "rgba(184, 255, 0, 0.20)"
            }
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <GridScan
            linesColor={
              theme === 'neon-dark'  ? '#1c281e' :
              '#2f293a'
            }
            scanColor={
              theme === 'neon-dark'  ? '#21F1A8' :
              '#FF9FFC'
            }
            scanOpacity={
              theme === 'neon-dark'  ? 0.60 :
              0.75
            }
            gridScale={0.035}
            lineThickness={1}
            lineJitter={0.1}
            scanGlow={0.5}
            scanSoftness={2.0}
            chromaticAberration={0.002}
            noiseIntensity={0.01}
            bloomIntensity={0.0}
            scanDuration={2.4}
            scanDelay={1.2}
            scanDirection="pingpong"
            enablePost={true}
            sensitivity={0.6}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>

      {/* 2. LAYER TWO: MASTER CONTEXT WORKSPACE LAYOUT */}
      <div style={primaryContentArea}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '22px', padding: '48px 0 24px 0' }}>
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(233,30,140,0.1)',
              border: '1px solid rgba(233,30,140,0.28)', borderRadius: '24px', padding: '8px 22px',
              fontSize: '14.5px', fontWeight: '600', color: '#e91e8c',
            }}
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#e91e8c', boxShadow: '0 0 8px #e91e8c', display: 'inline-block' }} />
            Welcome back, {displayName}
          </motion.div>

          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 'clamp(38px, 7vw, 62px)', fontWeight: '900', background: 'linear-gradient(135deg, #e91e8c 0%, #ff6b35 40%, #c9a96e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, letterSpacing: '2px' }}>
            TOOLKIT
          </h1>

          <p style={{ color: tokens.textSecondary, fontSize: 'clamp(16px, 2.4vw, 18.5px)', maxWidth: '660px', lineHeight: 1.6, margin: 0 }}>
            Enter your active criteria target. The underlying Mady controller maps parameters and triggers target tool structures natively.
          </p>

          {/* ── AI Smart Search (Phase 7) ── */}
          <div style={{ width: '100%', maxWidth: '780px', marginTop: '16px' }}>
            <SmartSearch initialQuery={initialSearchQuery} />
          </div>


        </div>

        {/* 3. LAYER THREE: CONDITIONAL RUNTIME DENSITY VIEWPORTS */}
        <div style={{ marginTop: '30px' }}>
          <AnimatePresence mode="wait">
            {filteredTools.length > 0 ? (
              /* Sub-Portal Variant Alpha: Interactive Live Filtering queries view */
              <motion.div key="search-results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '16px', fontWeight: '800', color: '#00d4ff', margin: 0, letterSpacing: '1px' }}>
                    FILTERED ASSET REGISTRIES ({filteredTools.length})
                  </h2>
                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(0,212,255,0.3), transparent)' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {filteredTools.map((tool) => (
                    <div
                      key={tool.id}
                      onClick={() => navigate(tool.path, { state: { params: {}, aiPayload: {} } })}
                      style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '16px', backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: '14px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = tokens.accent}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = tokens.border}
                    >
                      <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${tokens.accent}15`, borderRadius: '10px', fontSize: '20px' }}>
                        {categoryIconsForSearch(tool.categoryId)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: tokens.textPrimary, fontSize: '15px' }}>{tool.name}</div>
                        <div style={{ color: tokens.textSecondary, fontSize: '12px', marginTop: '2px' }}>{tool.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : showManualGrid ? (
              /* Sub-Portal Variant Beta: Premium 3D Vector Folders System grid view layout */
              <motion.div key="categories-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                  <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '16px', fontWeight: '800', color: '#c9a96e', margin: 0, letterSpacing: '1px' }}>
                    UTILITY VECTOR SYSTEMS
                  </h2>
                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,169,110,0.3), transparent)' }} />
                </div>

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate={loaded ? "visible" : "hidden"}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(165px, 22vw, 250px), 1fr))', gap: '20px' }}
                >
                  {categories.map((cat, index) => (
                    <CategoryCard
                      key={cat.id}
                      cat={cat}
                      index={index}
                      tokens={tokens}
                      navigate={navigate}
                      shouldReduce={shouldReduce}
                    />
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              /* Sub-Portal Variant Gamma: Clean AI Suggestions Launcher Landing View */
              <motion.div key="ai-suggestions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ textAlign: 'center', marginTop: '56px' }}>
                <p style={{ color: tokens.textSecondary, fontSize: '16px', marginBottom: '20px', fontWeight: '500' }}>Suggested Prompts:</p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '720px', margin: '0 auto' }}>
                  {[
                    "Track my BMI metrics",
                    "Check London time offsets",
                    "Configure audio noise tracking parameters",
                    "Clean phone speaker and check battery",
                    "Find colours from image and compress it",
                    "Check my reaction time and play memory card game",
                    "Measure magnetic metal field",
                    "Decrypt secure text ciphers"
                  ].map((chipPrompt) => (
                    <button
                      key={chipPrompt}
                      onClick={() => window.dispatchEvent(new CustomEvent('trigger-smart-search', { detail: chipPrompt }))}
                      style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, color: tokens.textPrimary, padding: '12px 24px', borderRadius: '28px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', transition: 'border-color 0.2s, background-color 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = tokens.accent; e.currentTarget.style.backgroundColor = `${tokens.accent}05`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = tokens.border; e.currentTarget.style.backgroundColor = tokens.surface; }}
                    >
                      {chipPrompt}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function categoryIconsForSearch(cid) {
  switch (cid) {
    case 'timeanddate': return '⏰';
    case 'calculative': return '🔢';
    case 'tools': return '🛠️';
    case 'health': return '❤️';
    case 'text': return '📝';
    case 'media': return '🎬';
    case 'device': return '📱';
    case 'games': return '🎮';
    default: return '⚙️';
  }
}