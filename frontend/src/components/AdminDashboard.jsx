import React, { useState, useEffect } from 'react';
import { Users, UserPlus, CheckCircle, AlertCircle, Mail, Phone, User, Lock } from 'lucide-react';
import api from '../api';

const TABS = ['Create QA', 'Create Agent', 'QA Directory', 'Agent Directory'];

const emptyForm = { first_name: '', last_name: '', email: '', phone: '', department_id: '' };

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('Create QA');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [qas, setQas] = useState([]);
  const [agents, setAgents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingQas, setLoadingQas] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const fetchQas = async () => {
    setLoadingQas(true);
    try { const r = await api.get('/users/qas'); setQas(r.data); } catch (e) { console.error(e); } finally { setLoadingQas(false); }
  };

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try { const r = await api.get('/users/agents'); setAgents(r.data); } catch (e) { console.error(e); } finally { setLoadingAgents(false); }
  };

  const fetchDepartments = async () => {
    try { const r = await api.get('/departments'); setDepartments(r.data); } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchQas(); fetchAgents(); fetchDepartments(); }, []);

  const handleCreateDepartment = async () => {
    const name = window.prompt('Enter new department name:');
    if (!name) return;
    try {
      const res = await api.post('/departments', { name, description: '' });
      await fetchDepartments();
      setForm({ ...form, department_id: res.data.id });
      setSuccess(`Department '${name}' created!`);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create department');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab); setSuccess(''); setError(''); setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSubmitting(true);
    const endpoint = activeTab === 'Create QA' ? '/users/create-qa' : '/users/create-agent';
    try {
      const res = await api.post(endpoint, form);
      const token = res.data.activation_token;
      setSuccess(
        <span>
          {activeTab === 'Create QA' ? 'QA' : 'Agent'} account created! Send this link to the user: 
          <a href={`http://localhost:5173/reset-password?token=${token}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', marginLeft: '8px' }}>
            Activation Link
          </a>
        </span>
      );
      setForm(emptyForm);
      if (activeTab === 'Create QA') fetchQas(); else fetchAgents();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user.');
    } finally { setSubmitting(false); }
  };

  const roleBadge = (role) => ({
    padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700',
    backgroundColor: role === 'QA' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
    color: role === 'QA' ? 'var(--warning)' : 'var(--success)',
    border: role === 'QA' ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(16,185,129,0.25)',
  });

  const activationBadge = (activated) => ({
    padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600',
    backgroundColor: activated ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
    color: activated ? 'var(--success)' : 'var(--text-muted)',
    border: activated ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(107,114,128,0.2)',
  });

  const isCreateTab = activeTab === 'Create QA' || activeTab === 'Create Agent';

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '6px' }}>Admin Console</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your team — create QA analysts and call agents, and monitor their accounts.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-color)', marginBottom: '32px' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => handleTabChange(tab)} style={{
            background: 'transparent', border: 'none', padding: '12px 20px', cursor: 'pointer',
            fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.2s',
            borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
            marginBottom: '-1px'
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Create Form */}
      {isCreateTab && (
        <div style={{ maxWidth: '560px' }}>
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={20} color="var(--accent-primary)" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>{activeTab}</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {activeTab === 'Create QA' ? 'QA analysts can audit call recordings and track agent performance.' : 'Agents can upload call recordings for QA review.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>First Name *</label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                    <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required placeholder="Alice"
                      style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Last Name *</label>
                  <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required placeholder="Smith"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Address *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="user@company.com"
                    style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Phone (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000"
                    style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <span>Department *</span>
                  <span onClick={handleCreateDepartment} style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }}>+ New</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.875rem', boxSizing: 'border-box', appearance: 'none' }}>
                    <option value="" disabled>Select a department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'var(--error-bg)', color: 'var(--error)', fontSize: '0.8rem' }}><AlertCircle size={16} />{error}</div>}
              {success && <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(16,185,129,0.08)', color: 'var(--success)', fontSize: '0.8rem', border: '1px solid rgba(16,185,129,0.2)' }}><CheckCircle size={16} style={{ marginTop: '1px', flexShrink: 0 }} />{success}</div>}

              <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: '4px' }}>
                {submitting ? 'Creating Account…' : `Create ${activeTab === 'Create QA' ? 'QA' : 'Agent'} Account`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QA Directory */}
      {activeTab === 'QA Directory' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>QA Analysts ({qas.length})</h3>
            <button onClick={fetchQas} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>Refresh</button>
          </div>
          {loadingQas ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead><tr style={{ background: 'var(--bg-tertiary)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Email</th>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Phone</th>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Role</th>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Status</th>
              </tr></thead>
              <tbody>
                {qas.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No QA analysts yet. Create one from the "Create QA" tab.</td></tr>
                ) : qas.map(u => (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{u.firstName} {u.lastName}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{u.email}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{u.phone || '—'}</td>
                    <td style={{ padding: '16px 24px' }}><span style={roleBadge('QA')}>QA</span></td>
                    <td style={{ padding: '16px 24px' }}><span style={activationBadge(u.isAccountActivated)}>{u.isAccountActivated ? 'Active' : 'Pending'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Agent Directory */}
      {activeTab === 'Agent Directory' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Agents ({agents.length})</h3>
            <button onClick={fetchAgents} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>Refresh</button>
          </div>
          {loadingAgents ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead><tr style={{ background: 'var(--bg-tertiary)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Email</th>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Phone</th>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Role</th>
                <th style={{ padding: '14px 24px', fontWeight: '600' }}>Status</th>
              </tr></thead>
              <tbody>
                {agents.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No agents yet. Create one from the "Create Agent" tab.</td></tr>
                ) : agents.map(u => (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: '500' }}>{u.firstName} {u.lastName}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{u.email}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{u.phone || '—'}</td>
                    <td style={{ padding: '16px 24px' }}><span style={roleBadge('AGENT')}>AGENT</span></td>
                    <td style={{ padding: '16px 24px' }}><span style={activationBadge(u.isAccountActivated)}>{u.isAccountActivated ? 'Active' : 'Pending'}</span></td>
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

export default AdminDashboard;
