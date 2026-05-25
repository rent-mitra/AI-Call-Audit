import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { LayoutDashboard, Settings, Phone, LogOut, Users } from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  // Define sidebar navigation items based on roles
  const getNavItems = () => {
    if (!user) return [];

    if (user.role === 'ADMIN') {
      return [
        { name: 'Admin Console', path: '/admin', icon: <Users size={20} /> }
      ];
    }

    if (user.role === 'QA') {
      return [
        { name: 'QA Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { name: 'QA Settings', path: '/settings', icon: <Settings size={20} /> }
      ];
    }

    // AGENT
    return [
      { name: 'My Dashboard', path: '/', icon: <LayoutDashboard size={20} /> }
    ];
  };

  const navItems = getNavItems();
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Guest';
  const roleLabel = user ? user.role : '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', height: '40px', 
            borderRadius: '8px', 
            background: 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 15px var(--accent-glow)'
          }}>
            <Phone size={24} color="white" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>
              Audit<span style={{ color: 'var(--accent-primary)' }}>AI</span>
            </h2>
            {user?.tenantName && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>🏢 {user.tenantName}</span>
                {user?.departmentName && <span>📁 {user.departmentName}</span>}
              </div>
            )}
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0 16px', marginTop: '20px' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  textDecoration: 'none',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                  fontWeight: isActive ? '600' : '500',
                  transition: 'all 0.2s ease',
                  border: isActive ? '1px solid var(--border-color)' : '1px solid transparent'
                }}
              >
                <div style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }}>
                  {item.icon}
                </div>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer Logout */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={logout} 
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              width: '100%', padding: '10px 16px', borderRadius: '8px',
              border: 'none', background: 'transparent', color: '#ef4444',
              cursor: 'pointer', fontWeight: '500', transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <header style={{ 
          height: '70px', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{displayName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{roleLabel}</div>
            </div>
            <div style={{ 
              width: '40px', height: '40px', 
              borderRadius: '50%', 
              background: 'var(--bg-tertiary)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border-color)',
              fontWeight: 'bold', color: 'var(--accent-primary)'
            }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
