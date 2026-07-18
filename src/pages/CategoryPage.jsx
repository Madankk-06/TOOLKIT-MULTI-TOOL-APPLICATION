import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { categories } from '../data/categories';
import BackButton from '../components/BackButton';

const categoryMeta = {
  timeanddate: { color: '#00d4ff', glow: 'rgba(0,212,255,0.25)' },
  calculative: { color: '#c9a96e', glow: 'rgba(201,169,110,0.25)' },
  tools: { color: '#c9a96e', glow: 'rgba(201,169,110,0.25)' },
  health: { color: '#ff4d6d', glow: 'rgba(255,77,109,0.25)' },
  text: { color: '#00d4ff', glow: 'rgba(0,212,255,0.25)' },
  media: { color: '#c9a96e', glow: 'rgba(201,169,110,0.25)' },
  device: { color: '#00d4ff', glow: 'rgba(0,212,255,0.25)' },
  games: { color: '#c9a96e', glow: 'rgba(201,169,110,0.25)' },
};

// Generic metallic tool icon using initials
const ToolIcon = React.memo(({ name, color }) => {
  const words = name.split(' ');
  const initials = words.length >= 2
    ? words[0][0] + words[1][0]
    : name.slice(0, 2);

  return (
    <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
      <defs>
        <radialGradient id={`ti_bg_${name.replace(/\s/g, '')}`} cx="35%" cy="28%" r="70%">
          <stop offset="0%" stopColor="var(--bg-card)" />
          <stop offset="100%" stopColor="var(--bg-primary)" />
        </radialGradient>
        <radialGradient id={`ti_rim_${name.replace(/\s/g, '')}`} cx="30%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#8a8a9a" />
          <stop offset="100%" stopColor="#3a3a4a" />
        </radialGradient>
        <filter id={`ti_sh_${name.replace(/\s/g, '')}`}>
          <feDropShadow dx="1" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
        </filter>
      </defs>
      <circle cx="32" cy="32" r="29" fill={`url(#ti_rim_${name.replace(/\s/g, '')})`} filter={`url(#ti_sh_${name.replace(/\s/g, '')})`} />
      <circle cx="32" cy="32" r="25" fill={`url(#ti_bg_${name.replace(/\s/g, '')})`} />
      <circle cx="32" cy="32" r="25" stroke={color} strokeWidth="1" strokeOpacity="0.35" fill="none" />
      {/* Highlight arc */}
      <path d="M 18 20 A 16 16 0 0 1 46 20" stroke="rgba(255,255,255,0.12)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <text x="32" y="37" textAnchor="middle" fill={color} fontSize="15" fontWeight="800" fontFamily="'Orbitron', sans-serif" letterSpacing="1">
        {initials.toUpperCase()}
      </text>
    </svg>
  );
});

export default function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const category = categories.find(c => c.id === categoryId);
  const meta = categoryMeta[categoryId] || { color: '#c9a96e', glow: 'rgba(201,169,110,0.25)' };

  if (!category) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <h2 style={{ fontFamily: "'Orbitron', sans-serif", color: 'var(--accent-gold)', fontSize: '22px' }}>Category not found</h2>
        <button onClick={() => navigate('/')} style={{ background: 'linear-gradient(135deg, #e91e8c, #ff6b35)', border: 'none', borderRadius: '10px', color: '#fff', fontFamily: "'Orbitron', sans-serif", fontSize: '14px', fontWeight: '700', padding: '12px 24px', cursor: 'pointer' }}>
          ← Go Home
        </button>
      </div>
    );
  }

  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.055 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -28 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ minHeight: '100vh', background: 'var(--bg-primary)', backgroundImage: 'var(--bg-texture)', fontFamily: "'Space Grotesk', sans-serif", paddingBottom: '60px' }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ padding: 'clamp(20px,4vw,36px) clamp(16px,3vw,28px) clamp(16px,3vw,28px)', borderBottom: '1px solid var(--border-card)', position: 'relative' }}
      >
        {/* Back button */}
        <div style={{ marginBottom: '20px' }}>
          <BackButton />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <motion.h1
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 'clamp(22px, 5vw, 34px)', fontWeight: '900', color: meta.color, margin: 0, letterSpacing: '1px', textShadow: `0 0 32px ${meta.glow}` }}
          >
            {category.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}
          >
            {category.tools.length} professional tools
          </motion.p>
        </div>

        {/* Accent gradient line at bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, ${meta.color}60, transparent)` }} />
      </motion.div>

      {/* Tools list */}
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
        style={{ padding: 'clamp(12px,2vw,20px) clamp(12px,2vw,20px)', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '820px', margin: '0 auto' }}
      >
        {category.tools.map((tool, index) => (
          <motion.div
            key={tool.id}
            variants={itemVariants}
            className="tool-card"
            onClick={() => navigate(tool.path)}
            onKeyDown={e => e.key === 'Enter' && navigate(tool.path)}
            tabIndex={0}
            role="button"
            aria-label={tool.name}
          >
            {/* Icon */}
            <div className="icon-3d-subtle" style={{ flexShrink: 0, width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ToolIcon name={tool.name} color={meta.color} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="tool-name" style={{ color: meta.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tool.name}
              </div>
              <div className="tool-desc" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tool.description}
              </div>
            </div>

            {/* Arrow */}
            <motion.span
              style={{ color: meta.color, fontSize: '22px', lineHeight: 1, flexShrink: 0, opacity: 0.6, fontWeight: '300' }}
              whileHover={{ x: 4, opacity: 1 }}
            >›</motion.span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
