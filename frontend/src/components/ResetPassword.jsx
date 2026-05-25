import React, { useState, useEffect } from 'react';
import api from '../api';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate the reset token on mount
  useEffect(() => {
    if (!token) {
      setError('Token is missing from the URL.');
      setIsValidating(false);
      return;
    }

    const validateToken = async () => {
      try {
        await api.get(`/auth/validate-reset-token?token=${token}`);
        setTokenValid(true);
      } catch (err) {
        setError(err.response?.data?.message || 'Password reset token is invalid or has expired.');
        setTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel animate-fade-in" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <KeyRound size={28} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h2 style={styles.title}>Define New Password</h2>
          <p style={styles.subtitle}>Set your password to activate or recover your account.</p>
        </div>

        {isValidating ? (
          <div style={styles.validationLoader}>
            <span style={styles.spinner}></span>
            <p style={{ marginTop: '12px' }}>Validating token details...</p>
          </div>
        ) : (
          <>
            {success && (
              <div style={styles.successAlert}>
                <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
                <div>
                  <h4 style={{ margin: 0 }}>Success!</h4>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                    Your password has been successfully configured. Redirecting to Login...
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div style={styles.errorAlert}>
                <AlertCircle size={20} style={{ color: 'var(--error)' }} />
                <span>{error}</span>
              </div>
            )}

            {tokenValid && !success && (
              <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>New Password</label>
                  <div style={styles.inputWrapper}>
                    <Lock size={18} style={styles.inputIcon} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
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

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Confirm Password</label>
                  <div style={styles.inputWrapper}>
                    <Lock size={18} style={styles.inputIcon} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={styles.input}
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  style={styles.submitBtn}
                  disabled={loading}
                >
                  {loading ? <span style={styles.spinner}></span> : 'Activate & Save Password'}
                </button>
              </form>
            )}

            {!tokenValid && !isValidating && (
              <div style={styles.invalidContainer}>
                <p style={{ marginBottom: '20px', fontSize: '0.9375rem' }}>
                  If your activation or recovery token has expired, please request a new one.
                </p>
                <Link to="/forgot-password" className="btn-primary" style={{ textDecoration: 'none' }}>
                  Request New Link
                </Link>
              </div>
            )}
          </>
        )}
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
  iconContainer: {
    display: 'inline-flex',
    padding: '12px',
    borderRadius: '50%',
    backgroundColor: 'var(--bg-tertiary)',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.75rem',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  validationLoader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    color: 'var(--text-secondary)',
  },
  successAlert: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: 'var(--success-bg)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: 'var(--text-primary)',
    marginBottom: '24px',
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
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
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
  invalidContainer: {
    textAlign: 'center',
    padding: '10px 0',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2.5px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'var(--accent-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

export default ResetPassword;
