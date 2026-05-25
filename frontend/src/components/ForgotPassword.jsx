import React, { useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message || 'If that email exists, we have sent instructions.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to dispatch reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div className="glass-panel animate-fade-in" style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Reset Password</h2>
          <p style={styles.subtitle}>Enter your email address and we'll send you an activation or recovery link.</p>
        </div>

        {message && (
          <div style={styles.successAlert}>
            <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={20} style={{ color: 'var(--error)' }} />
            <span>{error}</span>
          </div>
        )}

        {!message && (
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

            <button
              type="submit"
              className="btn-primary"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? <span style={styles.spinner}></span> : 'Send Recovery Link'}
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <Link to="/login" style={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </Link>
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
  title: {
    fontSize: '1.75rem',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'var(--success-bg)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: 'var(--text-primary)',
    marginBottom: '24px',
    fontSize: '0.875rem',
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
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '12px',
    fontSize: '0.9375rem',
    borderRadius: '8px',
    marginTop: '8px',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    transition: 'color 0.2s',
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

export default ForgotPassword;
