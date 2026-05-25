import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import QADashboard from './QADashboard';
import AgentDashboard from './AgentDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  if (user.role === 'ADMIN') {
    navigate('/admin');
    return null;
  }

  if (user.role === 'QA') return <QADashboard />;
  if (user.role === 'AGENT') return <AgentDashboard />;

  return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Unknown role. Please contact your administrator.</div>;
};

export default Dashboard;
