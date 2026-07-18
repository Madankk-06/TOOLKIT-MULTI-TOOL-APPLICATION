import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase/config';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get('oobCode');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!oobCode) {
      setError('Invalid or expired reset link.');
      return;
    }

    // Verify the code and get the user's email
    verifyPasswordResetCode(auth, oobCode)
      .then((email) => setEmail(email))
      .catch((err) => {
        console.error(err);
        setError('This reset link has expired or has already been used.');
      });
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.page}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.title}>Password Reset!</h1>
          <p style={styles.text}>Your password has been updated successfully. Redirecting to login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.card}>
        <h1 style={styles.title}>Create New Password</h1>
        {email && <p style={styles.subtitle}>Resetting password for: <strong>{email}</strong></p>}
        
        {error && (
          <div style={styles.errorAlert}>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        {!error || email ? (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.input}
                required
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.input}
                required
              />
            </div>
            <button type="submit" disabled={loading || !!error} style={styles.submitBtn}>
              {loading ? 'Updating...' : 'Save New Password'}
            </button>
          </form>
        ) : (
          <button onClick={() => navigate('/login')} style={styles.backBtn}>Back to Login</button>
        )}
      </motion.div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: "'Rajdhani', sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-card)',
    borderRadius: '20px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
  },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '24px',
    background: 'linear-gradient(135deg, #e91e8c, #ff6b35)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '10px',
  },
  subtitle: { color: 'var(--text-muted)', fontSize: '14px', marginBottom: '25px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' },
  input: {
    width: '100%',
    padding: '12px 15px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-input)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #e91e8c, #ff6b35)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '10px',
  },
  errorAlert: { background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '20px' },
  errorText: { color: '#ff4d6d', fontSize: '13px' },
  successIcon: { fontSize: '48px', color: '#00d4ff', marginBottom: '20px' },
  text: { color: 'var(--text-muted)', fontSize: '16px' },
  backBtn: { background: 'none', border: '1px solid var(--border-card)', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', marginTop: '20px' },
};
