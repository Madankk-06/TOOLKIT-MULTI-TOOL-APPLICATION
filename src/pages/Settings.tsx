import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BackButton from '../components/BackButton';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { deleteUser, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import { TRIGGER_GUIDE_EVENT } from '../components/OnboardingGuide';

export default function Settings() {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme, tokens } = useTheme();
  const navigate = useNavigate();

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [language, setLanguage] = useState('English');

  // Page States
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFullscreenVideo, setShowFullscreenVideo] = useState(false);
  const [passwordForDelete, setPasswordForDelete] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFullName(data.displayName || currentUser.displayName || '');
          setUsername(data.username || currentUser.displayName?.toLowerCase().replace(/\s+/g, '') || '');
          setDob(data.dob || '');
          setGender(data.gender || 'Prefer not to say');
          setLanguage(data.language || 'English');
        } else {
          setFullName(currentUser.displayName || '');
          setUsername(currentUser.displayName?.toLowerCase().replace(/\s+/g, '') || '');
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaveLoading(true);
    setError('');
    setSuccess('');

    try {
      // 1. Update auth display name
      await updateProfile(currentUser, { displayName: fullName });

      // 2. Update Firestore profile details
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        displayName: fullName,
        username: username,
        dob: dob,
        gender: gender,
        language: language,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setSuccess('Profile settings successfully updated!');
    } catch (err: any) {
      console.error("Error saving settings:", err);
      setError(err.message || 'Failed to save settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to log out.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    setDeleteLoading(true);
    setError('');
    
    try {
      const uid = currentUser.uid;

      // 1. Re-authenticate if password is required/provided
      if (passwordForDelete && currentUser.email) {
        try {
          const credential = EmailAuthProvider.credential(currentUser.email, passwordForDelete);
          await reauthenticateWithCredential(currentUser, credential);
        } catch (reauthErr: any) {
          console.error("Re-authentication failed:", reauthErr);
          if (reauthErr.code === 'auth/wrong-password' || reauthErr.code === 'auth/invalid-credential') {
            setError('Incorrect password. Please enter your valid account password.');
            setDeleteLoading(false);
            return;
          }
          throw reauthErr;
        }
      }

      // 2. Delete Firestore user document
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (fsErr) {
        console.warn("Firestore document cleanup warning:", fsErr);
      }

      // 3. Remove local storage flags
      try {
        localStorage.removeItem(`terms_accepted_${uid}`);
        localStorage.removeItem('toolkit-guide-seen');
      } catch {}

      // 4. Delete Firebase Auth user account
      await deleteUser(currentUser);

      // 5. Logout & redirect cleanly
      try {
        await logout();
      } catch {}
      navigate('/login', { replace: true });
    } catch (err: any) {
      console.error("Delete account error:", err);
      if (err.code === 'auth/requires-recent-login') {
        setRequiresPassword(true);
        setError('For security, please enter your account password below to confirm deletion.');
      } else {
        setError(err.message || 'Failed to delete account.');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: tokens.background, color: tokens.textPrimary }}>
        <div style={{ fontSize: '18px', fontFamily: "'Orbitron', sans-serif" }}>Loading user configurations...</div>
      </div>
    );
  }

  // Styles object utilizing tokens for reactive dark/light themes
  const styles = {
    container: {
      maxWidth: '720px',
      margin: '0 auto',
      padding: '40px 24px',
      fontFamily: "'Space Grotesk', sans-serif",
      color: tokens.textPrimary,
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${tokens.border}`,
      paddingBottom: '20px',
      marginBottom: '32px',
    },
    title: {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '28px',
      fontWeight: '900',
      background: 'linear-gradient(135deg, #e91e8c, #ff6b35)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      margin: 0,
    },
    subtitle: {
      fontSize: '14px',
      color: tokens.textSecondary,
      marginTop: '4px',
    },
    card: {
      backgroundColor: tokens.surface,
      border: `1px solid ${tokens.border}`,
      borderRadius: '16px',
      padding: '28px',
      marginBottom: '24px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    },
    sectionTitle: {
      fontFamily: "'Orbitron', sans-serif",
      fontSize: '16px',
      fontWeight: '800',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: tokens.accent,
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
      marginBottom: '20px',
    },
    label: {
      fontSize: '12px',
      fontWeight: '700',
      textTransform: 'uppercase' as const,
      color: tokens.textSecondary,
      letterSpacing: '0.5px',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      backgroundColor: tokens.inputBg,
      border: `1px solid ${tokens.border}`,
      borderRadius: '10px',
      color: tokens.textPrimary,
      fontSize: '15px',
      outline: 'none',
      fontFamily: 'inherit',
      transition: 'border-color 0.2s',
    },
    button: {
      background: 'linear-gradient(135deg, #e91e8c, #ff6b35)',
      border: 'none',
      borderRadius: '10px',
      color: '#fff',
      fontSize: '15px',
      fontWeight: '700',
      padding: '14px 28px',
      cursor: 'pointer',
      fontFamily: "'Orbitron', sans-serif",
      transition: 'opacity 0.2s',
    },
    logoutBtn: {
      background: 'transparent',
      border: `1px solid ${tokens.border}`,
      borderRadius: '10px',
      color: tokens.textPrimary,
      fontSize: '14px',
      fontWeight: '600',
      padding: '10px 20px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.2s',
    },
    deleteBtn: {
      background: '#dc2626',
      border: 'none',
      borderRadius: '10px',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '700',
      padding: '10px 20px',
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all 0.2s',
    },
    alertSuccess: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      borderRadius: '10px',
      padding: '12px 16px',
      color: '#10b981',
      fontSize: '14px',
      marginBottom: '24px',
    },
    alertError: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      borderRadius: '10px',
      padding: '12px 16px',
      color: '#ef4444',
      fontSize: '14px',
      marginBottom: '24px',
    },
    backLink: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      textDecoration: 'none',
      color: tokens.textSecondary,
      fontSize: '14px',
      cursor: 'pointer',
      marginBottom: '20px',
      border: 'none',
      background: 'none',
      padding: 0,
      fontFamily: 'inherit',
    },
    videoPreviewWrapper: {
      position: 'relative' as const,
      width: '240px',
      height: '135px',
      borderRadius: '12px',
      overflow: 'hidden',
      cursor: 'pointer',
      border: `1px solid ${tokens.border}`,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    },
    videoPreview: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
    },
    playOverlay: {
      position: 'absolute' as const,
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      transition: 'background-color 0.2s',
    },
    playButtonCircle: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      paddingLeft: '3px',
      boxSizing: 'border-box' as const,
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        .author-card-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px 0;
          text-align: center;
        }

        .author-name {
          font-family: 'Orbitron', sans-serif;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: 2px;
          color: var(--color-text-primary, #fff);
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .author-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          color: var(--color-text-secondary, #aaa);
          margin-bottom: 24px;
          letter-spacing: 1px;
        }

        .author-social-list {
          display: flex;
          gap: 16px;
          justify-content: center;
          padding: 0;
          margin: 0;
          list-style: none;
        }

        .author-social-list li {
          list-style: none;
        }

        .author-social-list li a {
          width: 72px;
          height: 72px;
          background-color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          border-radius: 50%;
          position: relative;
          overflow: hidden;
          border: 3px solid #fff;
          z-index: 1;
          transition: border-color 0.5s;
        }

        .author-social-list li a:before {
          content: "";
          position: absolute;
          top: 100%;
          left: 0;
          width: 100%;
          height: 100%;
          transition: all 0.5s;
          z-index: 2;
        }

        .author-social-list li a:hover:before {
          top: 0;
        }

        .author-social-list li.soc-linkedin a:before {
          background: #0077b5;
        }
        .author-social-list li.soc-gmail a:before {
          background: #dd4b39;
        }
        .author-social-list li.soc-github a:before {
          background: #24292e;
        }
        .author-social-list li.soc-instagram a:before {
          background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
        }

        .author-social-list li a .social-icon {
          position: relative;
          z-index: 3;
          width: 32px;
          height: 32px;
          fill: #171717;
          color: #171717;
          transition: all 0.5s ease-out;
        }

        .author-social-list li a:hover {
          border-color: transparent;
        }

        .author-social-list li a:hover .social-icon {
          fill: #fff;
          color: #fff;
          transform: rotateY(360deg);
        }
      `}</style>
      <div style={{ marginBottom: '16px' }}>
        <BackButton />
      </div>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Workspace Settings</h1>
          <div style={styles.subtitle}>Configure user details and workspace preferences</div>
        </div>
      </div>

      {success && <div style={styles.alertSuccess}>{success}</div>}
      {error && <div style={styles.alertError}>{error}</div>}

      {/* ── PROFILE INFORMATION CARD ── */}
      <form onSubmit={handleSave} style={styles.card}>
        <div style={styles.sectionTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profile Information
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              style={styles.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. johndoe"
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Date of Birth</label>
            <input
              type="date"
              style={styles.input}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Gender</label>
            <select
              style={styles.input}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Primary Language</label>
          <select
            style={styles.input}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Arabic">Arabic</option>
            <option value="Hindi">Hindi</option>
            <option value="Portuguese">Portuguese</option>
            <option value="Japanese">Japanese</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button type="submit" style={styles.button} disabled={saveLoading}>
            {saveLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* ── THEME PREFERENCES CARD ── */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          Theme Settings
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Interface Theme</div>
            <div style={{ fontSize: '13px', color: tokens.textSecondary, marginTop: '2px' }}>
              Current theme selection: <strong style={{ textTransform: 'capitalize' }}>{theme}</strong>
            </div>
          </div>
          <button onClick={toggleTheme} style={styles.logoutBtn}>
            Cycle Theme
          </button>
        </div>
      </div>

      {/* ── WELCOME INTRODUCTION VIDEO CARD ── */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          Introduction Video
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            style={styles.videoPreviewWrapper}
            onClick={() => setShowFullscreenVideo(true)}
          >
            <video
              src="/Introduction_Video.mp4"
              muted
              loop
              autoPlay
              playsInline
              style={styles.videoPreview}
            />
            <div style={styles.playOverlay}>
              <div style={styles.playButtonCircle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            </div>
          </motion.div>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '8px' }}>App Introduction Video</div>
            <div style={{ fontSize: '13px', color: tokens.textSecondary, lineHeight: '1.6', marginBottom: '16px' }}>
              Toolkit AI introduction video. A next-generation platform that combines powerful utilities, intelligent AI features and productivity tools into one modern experience.
            </div>
            <button
              onClick={() => setShowFullscreenVideo(true)}
              style={styles.logoutBtn}
            >
              Play Fullscreen
            </button>
          </div>
        </div>
      </div>

      {/* ── APP GUIDE / TOUR CARD ── */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          App Guide
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '15px', marginBottom: '6px' }}>Interactive App Tour</div>
            <div style={{ fontSize: '13px', color: tokens.textSecondary, lineHeight: '1.6' }}>
              Take a quick tour of ToolKit. Learn how to navigate the sidebar, launch tools with AI prompts, sync your settings, and get the most out of your workspace.
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('toolkit-guide-seen');
              window.dispatchEvent(new Event(TRIGGER_GUIDE_EVENT));
            }}
            style={styles.logoutBtn}
          >
            🏙️ Start Guide
          </button>
        </div>
      </div>

      {/* ── ABOUT THE AUTHOR CARD ── */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Connect with the Author 
        </div>
        <div className="author-card-content">
          <div className="author-name">MADAN KK</div>
          <div className="author-title">Developer & Creator of ToolKit Application</div>
          
          <ul className="author-social-list">
            <li className="soc-linkedin">
              <a href="https://www.linkedin.com/in/madankk04122004/" target="_blank" rel="noopener noreferrer" title="LinkedIn">
                <svg className="social-icon" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
            </li>
            <li className="soc-gmail">
              <a href="mailto:madankk2004@gmail.com" title="Gmail">
                <svg className="social-icon" viewBox="0 0 24 24">
                  <path d="M24 4.5v15c0 .85-.65 1.5-1.5 1.5H21V7.39l-9 5.86-9-5.86V21H1.5C.65 21 0 20.35 0 19.5v-15c0-.85.65-1.5 1.5-1.5H3l9 6.2 9-6.2h1.5c.85 0 1.5.65 1.5 1.5z"/>
                </svg>
              </a>
            </li>
            <li className="soc-github">
              <a href="https://github.com/Madankk-06" target="_blank" rel="noopener noreferrer" title="GitHub">
                <svg className="social-icon" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </li>
            <li className="soc-instagram">
              <a href="https://www.instagram.com/__.madan___?igsh=NThiOGZvMndlZG9x" target="_blank" rel="noopener noreferrer" title="Instagram">
                <svg className="social-icon" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* ── LOGOUT OPTION CARD ── */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout Session
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', color: tokens.textSecondary, lineHeight: '1.5' }}>
              Disconnect your device from this ToolKit account. You will need to log back in to access your custom workspace tools.
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>

      {/* ── DANGER ZONE CARD (DELETE ACCOUNT) ── */}
      <div style={{ ...styles.card, border: '1px solid #ef4444' }}>
        <div style={{ ...styles.sectionTitle, color: '#ef4444' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Danger Zone
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '15px' }}>Delete Account Permanently</div>
            <div style={{ fontSize: '13px', color: tokens.textSecondary, marginTop: '2px', lineHeight: '1.5' }}>
              Permanently delete your user profile and all associated data from the ToolKit database. This action is irreversible and will delete your authentication credentials.
            </div>
          </div>
          <div>
            {!confirmDelete ? (
              <button 
                onClick={() => { 
                  setConfirmDelete(true); 
                  setRequiresPassword(false); 
                  setPasswordForDelete(''); 
                  setError(''); 
                }} 
                style={styles.deleteBtn}
              >
                Delete Account
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={handleDeleteAccount} 
                  style={{ ...styles.deleteBtn, padding: '10px 18px' }} 
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button 
                  onClick={() => { 
                    setConfirmDelete(false); 
                    setRequiresPassword(false); 
                    setPasswordForDelete(''); 
                    setError(''); 
                  }} 
                  style={{ ...styles.logoutBtn, padding: '10px 16px' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {confirmDelete && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>
              ⚠️ Security Authentication: Enter your account password to confirm permanent deletion:
            </div>
            <div style={{ display: 'flex', gap: '12px', maxWidth: '420px', flexWrap: 'wrap' }}>
              <input
                type="password"
                placeholder="Enter your account password"
                value={passwordForDelete}
                onChange={(e) => setPasswordForDelete(e.target.value)}
                style={{
                  ...styles.input,
                  borderColor: '#ef4444',
                  backgroundColor: tokens.inputBg,
                  fontSize: '14px',
                  padding: '10px 14px',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDeleteAccount();
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── FULLSCREEN VIDEO OVERLAY ── */}
      {showFullscreenVideo && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden'
        }}>
          <video
            src="/Introduction_Video.mp4"
            autoPlay
            playsInline
            controls
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
            onEnded={() => setShowFullscreenVideo(false)}
          />
          <button
            onClick={() => setShowFullscreenVideo(false)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(8px)',
              color: '#fff',
              padding: '8px 20px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: '700',
              fontSize: '14px',
              letterSpacing: '1px',
              transition: 'all 0.2s',
              zIndex: 10000
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }}
          >
            Close Video
          </button>
        </div>
      )}
    </div>
  );
}
