import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, XCircle, Clock, Search, Upload, ChevronRight, ArrowLeft } from 'lucide-react';
import api from '../api';
import UploadModal from './UploadModal';

const TABS = ['Audit History'];

const statusBadge = (status) => {
  const styles = {
    PASSED: { bg: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: 'rgba(16,185,129,0.2)' },
    FAILED: { bg: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: 'rgba(239,68,68,0.2)' },
    NEEDS_REVIEW: { bg: 'rgba(245,158,11,0.1)', color: 'var(--warning)', border: 'rgba(245,158,11,0.2)' },
    PROCESSING: { bg: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', border: 'rgba(59,130,246,0.2)' },
    COMPLETED: { bg: 'rgba(16,185,129,0.08)', color: 'var(--success)', border: 'rgba(16,185,129,0.15)' },
  };
  const s = styles[status] || { bg: 'rgba(107,114,128,0.1)', color: 'var(--text-muted)', border: 'rgba(107,114,128,0.2)' };
  return <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{status?.replace('_', ' ')}</span>;
};

const avatar = (name, color = 'var(--success)', bg = 'rgba(16,185,129,0.12)') => (
  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.75rem', color, flexShrink: 0 }}>
    {name?.charAt(0)?.toUpperCase() || '?'}
  </div>
);

const thStyle = { padding: '14px 24px', fontWeight: '600' };
const tdStyle = { padding: '16px 24px' };

const QADashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Audit History');
  const [search, setSearch] = useState('');
  const [calls, setCalls] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [rAgents, rCalls] = await Promise.all([
        api.get('/users/agents'),
        api.get('/calls')
      ]);
      setAgents(rAgents.data);
      setCalls(rCalls.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const switchTab = (t) => { setActiveTab(t); setSearch(''); };

  const viewAudit = (callId) => navigate(`/call/${callId}`);

  const headerRow = (cols) => (
    <thead><tr style={{ background: 'var(--bg-tertiary)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
      {cols.map(c => <th key={c} style={thStyle}>{c}</th>)}
    </tr></thead>
  );

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '6px' }}>QA Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Upload calls and review agent performance.</p>
        </div>
        <button onClick={() => setIsUploadOpen(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={18} />
          Upload Recording
        </button>
      </div>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-color)', marginBottom: '32px' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => switchTab(tab)} style={{
            background: 'transparent', border: 'none', padding: '12px 20px', cursor: 'pointer',
            fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.2s', marginBottom: '-1px',
            borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
          }}>{tab}</button>
        ))}
      </div>

      {/* AUDIT HISTORY */}
      {activeTab === 'Audit History' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          {!selectedAgent ? (
            <>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Agents in My Department</h3>
                <button onClick={load} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>Refresh</button>
              </div>
              {loading ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
                <div style={{ padding: '12px' }}>
                  {agents.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No agents in your department.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                      {agents.map(a => {
                        const agentCalls = calls.filter(c => c.agentId === a.user_id);
                        return (
                          <div key={a.user_id} onClick={() => setSelectedAgent(a)}
                            style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {avatar(`${a.firstName} ${a.lastName}`)}
                              <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '600' }}>{a.firstName} {a.lastName}</h4>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{agentCalls.length} Recordings</div>
                              </div>
                            </div>
                            <ChevronRight size={20} color="var(--text-muted)" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={() => setSelectedAgent(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '6px' }}>
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 style={{ margin: 0 }}>{selectedAgent.firstName} {selectedAgent.lastName}'s Audits</h3>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                {headerRow(['Recording', 'Date', 'Status', 'Audit Result', 'Score', 'Action'])}
                <tbody>
                  {calls.filter(c => c.agentId === selectedAgent.user_id).length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No recordings for this agent.</td></tr>
                  ) : calls.filter(c => c.agentId === selectedAgent.user_id).map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={tdStyle}><div style={{ fontWeight: '500' }}>{c.filename}</div></td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{c.date}</td>
                      <td style={tdStyle}>{statusBadge(c.status)}</td>
                      <td style={tdStyle}>{c.final_status ? statusBadge(c.final_status) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td style={tdStyle}>
                        {c.score !== null ? (
                          <span style={{ fontWeight: '700', color: c.score >= 75 ? 'var(--success)' : c.score >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                            {c.score}%
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => viewAudit(c.id)} className="btn-secondary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
                          View Results
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onUploadSuccess={() => { load(); }} />
    </div>
  );
};

export default QADashboard;
