import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <span style={styles.spinner}></span>
        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading session details...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Return a clean access denied screen rather than silent redirect
    return (
      <div style={styles.accessDeniedContainer}>
        <div className="glass-panel" style={styles.accessDeniedCard}>
          <ShieldAlert size={48} style={{ color: 'var(--error)', marginBottom: '16px' }} />
          <h2>Access Denied</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            You do not have the necessary permissions to access this page. Required role: {allowedRoles.join(', ')}.
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  return <Outlet />;
};

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: 'var(--accent-primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  accessDeniedContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    padding: '20px',
  },
  accessDeniedCard: {
    maxWidth: '400px',
    padding: '40px 32px',
    textAlign: 'center',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
  },
};

export default ProtectedRoute;
