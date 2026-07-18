import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import CosmicCanvas from '../components/CosmicCanvas';

// ── SVG SUB-ICONS ENGINE COMPONENTS ──────────────────────────────────────────
const EyeIcon = ({ open }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

// LogoIcon SVG was replaced in favor of premium image asset

function getFirebaseErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-email': return 'Invalid email address format.';
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/wrong-password': return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests': return 'Too many failed attempts. Please try again later.';
    case 'auth/user-disabled': return 'This account has been disabled.';
    case 'auth/invalid-credential': return 'Invalid email or password.';
    case 'auth/network-request-failed': return 'Network error. Please check your internet connection.';
    case 'auth/internal-error': return 'Firebase internal error. Please try again later.';
    default: return `Error: ${code || 'Unknown'}. Please try again.`;
  }
}

// ── FIXED BACKGROUND COMPONENT LAYER: BALANCED ABSOLUTE EDGE-SCALING ──
function AmbientBackground() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', backgroundColor: '#0c0c0c', pointerEvents: 'none', width: '100vw', height: '100vh' }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          minWidth: '100%', 
          minHeight: '100%', 
          width: 'auto', 
          height: 'auto', 
          transform: 'translate(-50%, -50%)', 
          objectFit: 'cover' 
        }}
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260514_135830_bb6491d1-9b66-4aec-9722-13b4dfe3fb46.mp4"
          type="video/mp4"
        />
      </video>
    </div>
  );
}

export default function Login() {
  const [isInsideForm, setIsInsideForm] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [introFade, setIntroFade] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIntroFade(true);
    }, 2700);

    const removeTimer = setTimeout(() => {
      setIntroDone(true);
    }, 3500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Generate grid fragments for the outer-edges-to-middle animation (20x15 resolution)
  const row = 20;
  const col = 15;
  const fragments = [];
  const x = col - 1;
  const y = row - 1;

  for (let i = 0; i < row; i++) {
    for (let j = 0; j < col; j++) {
      const delayVal = x / 2 - Math.abs(x / 2 - j) + (x / 2 - Math.abs(y / 2 - i)) + 2.5;
      const isOdd = (i + j) % 2 === 0;
      const rotateX = `rotateX(${isOdd ? -180 : 0}deg)`;
      const rotateY = `rotateY(${isOdd ? 0 : -180}deg)`;
      const delay = `${delayVal * 50}ms`; // Tinier blocks flip faster (50ms delay delta)

      fragments.push(
        <div
          key={`${i}-${j}`}
          className="anim-fragment"
          style={{
            '--x': j,
            '--y': i,
            '--rotateX': rotateX,
            '--rotateY': rotateY,
            '--delay': delay,
            '--duration': '2000ms',
          }}
        />
      );
    }
  }

  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError('Please enter your recovery email.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await resetPassword(resetEmail.trim());
      setSuccess('A secure reset link has been sent to your email. Please check your INBOX or SPAM.');

      setTimeout(() => {
        setResetMode(false);
        setSuccess('');
        setResetEmail('');
      }, 6000);
    } catch (err) {
      console.error("Reset Error:", err);
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Target Video Ambient Wallpaper Frame */}
      <AmbientBackground />

      {/* Cosmic constellation node network backdrop overlay */}
      <CosmicCanvas isInsideForm={isInsideForm} />

      {/* Kinetic floating particles container node */}
      <div style={styles.particlesContainer} aria-hidden="true">
        {[...Array(18)].map((_, i) => (
          <div key={i} style={{ ...styles.particle, ...getParticleStyle(i) }} />
        ))}
      </div>

      {!introDone && (
        <div className="animation-wrapper" style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          display: 'grid',
          gridTemplateRows: 'repeat(20, 1fr)',
          gridTemplateColumns: 'repeat(15, 1fr)',
          zIndex: 9999,
          pointerEvents: 'none',
          transition: 'opacity 0.8s ease-in-out',
          opacity: introFade ? 0 : 1,
        }}>
          <style>{`
            .animation-wrapper {
              --row: 20;
              --col: 15;
              --box-width: 100vw;
              --box-height: 100vh;
              --frag-width: calc(var(--box-width) / var(--col));
              --frag-height: calc(var(--box-height) / var(--row));
            }
            .anim-fragment {
              width: var(--frag-width);
              height: var(--frag-height);
              background: #0c0c0c;
              backface-visibility: hidden;
              will-change: transform, opacity;
              transform: rotateX(0) rotateY(0) scale(1);
              animation: flipReveal var(--duration) cubic-bezier(0.25, 1, 0.5, 1) var(--delay) forwards;
              opacity: 1;
            }
            @keyframes flipReveal {
              0% {
                transform: rotateX(0) rotateY(0) scale(1);
                opacity: 1;
              }
              15% {
                transform: rotateX(0) rotateY(0) scale(1);
                opacity: 1;
              }
              100% {
                transform: var(--rotateX) var(--rotateY) scale(0.6);
                opacity: 0;
              }
            }
          `}</style>
          {fragments}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
        style={styles.card}
        onMouseEnter={() => setIsInsideForm(true)}
        onMouseLeave={() => setIsInsideForm(false)}
      >
        {/* Logo Branding Header Area */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'backOut' }}
          style={styles.logoArea}
        >
          <img src="/logo.png" alt="ToolKit Logo" style={{ width: '56px', height: '56px', objectFit: 'contain', marginBottom: '8px' }} />
          <motion.h1
            style={styles.brandName}
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          >
            ToolKit
          </motion.h1>
          <p style={styles.tagline}>Sign in to your workspace</p>
        </motion.div>

        {/* Dynamic Exception Warning Feedback Alerts */}
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              ...styles.errorAlert,
              background: success ? 'rgba(0,212,255,0.1)' : 'rgba(255,77,109,0.12)',
              borderColor: success ? 'rgba(0,212,255,0.3)' : 'rgba(255,77,109,0.30)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={success ? '#00d4ff' : '#ff4d6d'} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              {success ? (
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              ) : (
                <circle cx="12" cy="12" r="10" />
              )}
              {success ? <polyline points="22 4 12 14.01 9 11.01" /> : (
                <>
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </>
              )}
            </svg>
            <span style={{ ...styles.errorText, color: success ? '#00d4ff' : '#ff6b84' }}>
              {success || error}
            </span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!resetMode ? (
            <motion.form
              key="login-form"
              onSubmit={handleSubmit}
              style={styles.form}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div style={styles.fieldGroup}>
                <label style={styles.label} htmlFor="login-email">Email Address</label>
                <div style={styles.inputWrapper}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={styles.inputIcon}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={styles.input}
                    disabled={loading}
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={styles.label} htmlFor="login-password">Password</label>
                  <button
                    type="button"
                    onClick={() => { setResetMode(true); setError(''); setSuccess(''); }}
                    style={styles.forgotBtn}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={styles.inputWrapper}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={styles.inputIcon}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={styles.input}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    style={styles.eyeBtn}
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                style={styles.submitBtn}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
              >
                {loading ? <LoadingSpinner /> : 'Sign In'}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form
              key="reset-form"
              onSubmit={handleResetPassword}
              style={styles.form}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div style={styles.fieldGroup}>
                <p style={styles.resetInstruction}>
                  Enter your email address and we'll send you a secure link to reset your password.
                </p>
                <label style={styles.label} htmlFor="reset-email">Recovery Email</label>
                <div style={styles.inputWrapper}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={styles.inputIcon}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="recovery@example.com"
                    style={styles.input}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                style={styles.submitBtn}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? <LoadingSpinner /> : 'Send Reset Link'}
              </motion.button>

              <button
                type="button"
                onClick={() => { setResetMode(false); setError(''); setSuccess(''); }}
                style={styles.backBtn}
              >
                ← Back to Login
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Footer Navigation Redirection Triggers */}
        <motion.p
          style={styles.registerRow}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          Don't have an account?{' '}
          <Link to="/register" style={styles.registerLink}>
            Create account
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function getParticleStyle(i) {
  const positions = [
    { top: '8%', left: '12%', size: 3, dur: 7, delay: 0 },
    { top: '15%', left: '80%', size: 2, dur: 9, delay: 1.5 },
    { top: '25%', left: '35%', size: 4, dur: 6, delay: 0.8 },
    { top: '30%', left: '92%', size: 2, dur: 11, delay: 2 },
    { top: '45%', left: '5%', size: 3, dur: 8, delay: 0.4 },
    { top: '50%', left: '60%', size: 2, dur: 10, delay: 3 },
    { top: '60%', left: '20%', size: 5, dur: 7, delay: 1.2 },
    { top: '68%', left: '75%', size: 3, dur: 9, delay: 0.6 },
    { top: '75%', left: '45%', size: 2, dur: 12, delay: 2.5 },
    { top: '85%', left: '88%', size: 4, dur: 6, delay: 1.8 },
    { top: '90%', left: '10%', size: 2, dur: 8, delay: 0.2 },
    { top: '5%', left: '55%', size: 3, dur: 10, delay: 3.5 },
    { top: '40%', left: '28%', size: 2, dur: 7, delay: 1 },
    { top: '20%', left: '65%', size: 4, dur: 9, delay: 4 },
    { top: '55%', left: '82%', size: 2, dur: 11, delay: 0.9 },
    { top: '70%', left: '55%', size: 3, dur: 8, delay: 2.2 },
    { top: '35%', left: '8%', size: 2, dur: 6, delay: 3.8 },
    { top: '80%', left: '30%', size: 4, dur: 10, delay: 1.4 },
  ];
  const p = positions[i] || positions[0];
  const colors = ['#e91e8c', '#ff6b35', '#00d4ff', '#c9a96e'];
  const color = colors[i % colors.length];
  return {
    width: `${p.size}px`,
    height: `${p.size}px`,
    top: p.top,
    left: p.left,
    background: color,
    borderRadius: '50%',
    boxShadow: `0 0 ${p.size * 3}px ${color}`,
    animation: `float ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
    opacity: 0.6,
  };
}

// ── CUSTOM STYLING SHEET DATA DECLARATION OBJECTS ────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#0c0c0c', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: "'Rajdhani', sans-serif",
    boxSizing: 'border-box',
  },
  particlesContainer: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1, 
  },
  particle: {
    position: 'absolute',
  },
  card: {
position: 'relative',
    zIndex: 2, 
    width: '100%',
    maxWidth: '500px',
    
    // ── TUNED HIGH-TRANSPARENCY GLASS MATRIX ──
    background: 'rgba(10, 10, 18, 0.18)', // Dropped from 0.45 for an ultra-clear window pane
    border: '1px solid rgba(255, 255, 255, 0.08)', 
    backdropFilter: 'blur(12px) saturate(160%)', // Reduced blur radius from 30px so the video element shows through sharply
    WebkitBackdropFilter: 'blur(12px) saturate(160%)', 
    
    borderRadius: '24px', 
    padding: '44px 38px 38px',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0px rgba(255, 255, 255, 0.05)',
    boxSizing: 'border-box',
  },
  logoArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '32px',
  },
  brandName: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '28px',
    fontWeight: '900',
    background: 'linear-gradient(135deg, #e91e8c, #ff6b35)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    backgroundSize: '200% 200%',
    margin: 0,
    letterSpacing: '2px',
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '14px',
    margin: 0,
    letterSpacing: '0.5px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    borderRadius: '10px',
    padding: '12px 14px',
    marginBottom: '20px',
  },
  errorText: {
    fontSize: '13px',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },
  label: {
    color: 'rgba(255, 255, 255, 0.45)', 
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    fontFamily: "'Rajdhani', sans-serif",
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    color: 'rgba(255, 255, 255, 0.4)', 
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    pointerEvents: 'none',
    zIndex: 1,
  },
  input: {
    width: '100%',
    padding: '13px 44px 13px 44px',
    background: 'rgba(0, 0, 0, 0.15)', // Dropped opacity to keep fields beautifully subtle
    border: '1px solid rgba(255, 255, 255, 0.04)', 
    borderRadius: '10px',
    color: '#ffffff', 
    fontSize: '15px',
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: '500',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
    minHeight: '48px',  
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'rgba(255, 255, 255, 0.4)',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    minWidth: '32px',
    minHeight: '32px',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    marginTop: '6px',
    background: 'linear-gradient(135deg, #e91e8c 0%, #ff6b35 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '700',
    fontFamily: "'Orbitron', sans-serif",
    letterSpacing: '1.5px',
    cursor: 'pointer',
    minHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 24px rgba(233, 30, 140, 0.35)',
  },
  registerRow: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '14px',
    marginTop: '24px',
    marginBottom: 0,
  },
  registerLink: {
    color: '#ff7e5f', 
    textDecoration: 'none',
    fontWeight: '700',
  },
  forgotBtn: {
    background: 'none',
    border: 'none',
    color: '#ff7e5f',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
    fontFamily: "'Rajdhani', sans-serif",
  },
  resetInstruction: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '10px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '15px',
    alignSelf: 'center',
  },
};