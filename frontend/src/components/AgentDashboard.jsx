import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import api from '../api';

const TABS = ['My Calls', 'Audit Tracker'];

const statusBadge = (status) => {
  const styles = {
    PASSED: { bg: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: 'rgba(16,185,129,0.2)' },
    FAILED: { bg: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: 'rgba(239,68,68,0.2)' },
    NEEDS_REVIEW: { bg: 'rgba(245,158,11,0.1)', color: 'var(--warning)', border: 'rgba(245,158,11,0.2)' },
    PROCESSING: { bg: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', border: 'rgba(59,130,246,0.2)' },
    COMPLETED: { bg: 'rgba(16,185,129,0.08)', color: 'var(--success)', border: 'rgba(16,185,129,0.15)' },
    UPLOADED: { bg: 'rgba(107,114,128,0.1)', color: 'var(--text-muted)', border: 'rgba(107,114,128,0.2)' },
  };
  const s = styles[status] || styles.UPLOADED;
  return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{status?.replace('_', ' ')}</span>;
};

const thStyle = { padding: '14px 24px', fontWeight: '600' };
const tdStyle = { padding: '16px 24px' };

const AgentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('My Calls');
  const [calls, setCalls] = useState([]);
  const [tracker, setTracker] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCalls = async () => {
    setLoading(true);
    try { const r = await api.get('/calls'); setCalls(r.data); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchTracker = async () => {
    setLoading(true);
    try { const r = await api.get('/calls/tracking/by-qa'); setTracker(r.data); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchCalls(); fetchTracker(); }, []);

  const headerRow = (cols) => (
    <thead><tr style={{ background: 'var(--bg-tertiary)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
      {cols.map(c => <th key={c} style={thStyle}>{c}</th>)}
    </tr></thead>
  );

  const total = calls.length;
  const audited = calls.filter(c => c.score !== null).length;
  const avgScore = audited > 0 ? Math.round(calls.filter(c => c.score !== null).reduce((a, b) => a + b.score, 0) / audited) : null;
  const passed = calls.filter(c => c.final_status === 'PASSED').length;

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '6px' }}>My Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track your assigned recordings and see how they performed in QA audits.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Uploads', value: total, color: 'var(--accent-primary)' },
          { label: 'Audited', value: audited, color: 'var(--success)' },
          { label: 'Avg Score', value: avgScore !== null ? `${avgScore}%` : '—', color: avgScore >= 75 ? 'var(--success)' : avgScore >= 50 ? 'var(--warning)' : 'var(--error)' },
          { label: 'Passed', value: passed, color: 'var(--success)' },
        ].map(stat => (
          <div key={stat.label} className="glass-card" style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: stat.color, marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '500' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-color)', marginBottom: '32px' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: 'transparent', border: 'none', padding: '12px 20px', cursor: 'pointer',
            fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.2s', marginBottom: '-1px',
            borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
          }}>{tab}</button>
        ))}
      </div>

      {/* MY CALLS */}
      {activeTab === 'My Calls' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>My Recordings ({calls.length})</h3>
            <button onClick={fetchCalls} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>Refresh</button>
          </div>
          {loading ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              {headerRow(['Recording', 'Uploaded', 'Score', 'Audit Status', 'Audited By', ''])}
              <tbody>
                {calls.length === 0
                  ? <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No recordings assigned yet.</td></tr>
                  : calls.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => navigate(`/call/${c.id}`)}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: '500', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.filename}</div>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{c.date}</td>
                      <td style={tdStyle}>
                        {c.score !== null
                          ? <span style={{ fontWeight: '700', color: c.score >= 75 ? 'var(--success)' : c.score >= 50 ? 'var(--warning)' : 'var(--error)' }}>{c.score}%</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={tdStyle}>{statusBadge(c.final_status || c.status)}</td>
                      <td style={tdStyle}>
                        {c.qaName
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.7rem', color: 'var(--accent-primary)' }}>
                                {c.qaName?.charAt(0)}
                              </div>
                              <span style={{ fontSize: '0.875rem' }}>{c.qaName}</span>
                            </div>
                          : <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Pending</span>}
                      </td>
                      <td style={tdStyle}>
                        <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '5px 12px' }} onClick={e => { e.stopPropagation(); navigate(`/call/${c.id}`); }}>View</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* AUDIT TRACKER */}
      {activeTab === 'Audit Tracker' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>QA Audit Tracker</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Which QA analysts have audited your calls.</p>
            </div>
            <button onClick={fetchTracker} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>Refresh</button>
          </div>
          {loading ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              {headerRow(['QA Analyst', 'Calls Audited'])}
              <tbody>
                {tracker.length === 0
                  ? <tr><td colSpan="2" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>None of your calls have been audited yet.</td></tr>
                  : tracker.map(t => (
                    <tr key={t.qaId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                            {t.qaName?.charAt(0)?.toUpperCase()}
                          </div>
                          <span style={{ fontWeight: '500' }}>{t.qaName}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{t.auditedCount}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '4px' }}>calls</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentDashboard;
