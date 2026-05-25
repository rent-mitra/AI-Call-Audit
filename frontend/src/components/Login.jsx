import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials or connection issue.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel animate-fade-in" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <span style={styles.logoIcon}>🎙️</span>
            <span style={styles.logoText}>Call Audit AI</span>
          </div>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Sign in to your Call Audit System account</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={20} style={{ color: 'var(--error)' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Password</label>
              <Link to="/forgot-password" style={styles.forgotLink}>Forgot password?</Link>
            </div>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <span style={styles.spinner}></span>
            ) : (
              <>
                <span>Sign In</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Don't have your business registered? <Link to="/register-business" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '600' }}>Register Business</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px 32px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  logoIcon: {
    fontSize: '2rem',
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: '700',
    letterSpacing: '0.5px',
    background: 'linear-gradient(to right, #3B82F6, #10B981)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  title: {
    fontSize: '1.75rem',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'var(--error-bg)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: 'var(--text-primary)',
    marginBottom: '24px',
    fontSize: '0.875rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  forgotLink: {
    fontSize: '0.8125rem',
    color: 'var(--accent-primary)',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '12px 16px 12px 42px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.9375rem',
    outline: 'none',
    transition: 'all 0.2s',
  },
  eyeButton: {
    position: 'absolute',
    right: '14px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '12px',
    fontSize: '0.9375rem',
    borderRadius: '8px',
    marginTop: '8px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

// Inject critical spinner keyframes into DOM if stylesheet doesn't have it
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default Login;
