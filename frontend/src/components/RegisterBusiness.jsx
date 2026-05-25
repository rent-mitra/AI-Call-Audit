import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Building, User, FileText, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api';

const RegisterBusiness = () => {
  const navigate = useNavigate();
  
  const [businessName, setBusinessName] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!businessName || !email || !password || !firstName || !lastName) {
      setError('Please fill in all required fields.');
      return;
    }
    
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      await api.post('/auth/register-business', {
        business_name: businessName,
        business_description: businessDesc,
        owner_email: email,
        owner_password: password,
        owner_first_name: firstName,
        owner_last_name: lastName
      });
      
      setSuccess('Business and owner account successfully registered! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to register business. Please try again.');
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
          <h2 style={styles.title}>Register Your Business</h2>
          <p style={styles.subtitle}>Setup a secure multi-tenant workspace for call auditing</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={20} style={{ color: 'var(--error)' }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={styles.successAlert}>
            <CheckCircle size={20} style={{ color: 'var(--success)' }} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.sectionHeader}>Business Information</div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Business Name *</label>
            <div style={styles.inputWrapper}>
              <Building size={18} style={styles.inputIcon} />
              <input
                type="text"
                placeholder="e.g. Telecom Global, Banking Corp"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Description (Optional)</label>
            <div style={styles.inputWrapper}>
              <FileText size={18} style={styles.inputIcon} />
              <input
                type="text"
                placeholder="e.g. Inbound support quality auditing"
                value={businessDesc}
                onChange={(e) => setBusinessDesc(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.sectionHeader}>Owner / Administrator Credentials</div>

          <div style={styles.row}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>First Name *</label>
              <div style={styles.inputWrapper}>
                <User size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Last Name *</label>
              <div style={styles.inputWrapper}>
                <User size={18} style={styles.inputIcon} />
                <input
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address *</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                placeholder="owner@yourcompany.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password *</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            {loading ? (
              <span style={styles.spinner}></span>
            ) : (
              <>
                <span>Register & Setup</span>
                <UserPlus size={18} />
              </>
            )}
          </button>
        </form>

        <div style={styles.footer}>
          Already registered? <Link to="/login" style={styles.footerLink}>Login here</Link>
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
    minHeight: '85vh',
    padding: '40px 20px',
  },
  card: {
    width: '100%',
    maxWidth: '520px',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
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
    fontSize: '1.625rem',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  sectionHeader: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: 'var(--accent-primary)',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
    marginTop: '12px',
    marginBottom: '8px',
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.8125rem',
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
    padding: '10px 12px 10px 42px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'all 0.2s',
  },
  submitBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '12px',
    fontSize: '0.9375rem',
    borderRadius: '8px',
    marginTop: '16px',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  footerLink: {
    color: 'var(--accent-primary)',
    textDecoration: 'none',
    fontWeight: '600',
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

export default RegisterBusiness;
