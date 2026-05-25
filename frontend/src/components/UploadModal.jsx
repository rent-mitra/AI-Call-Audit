import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, Loader2, User } from 'lucide-react';
import api from '../api';

const UploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [agentId, setAgentId] = useState('');
  const [agents, setAgents] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      api.get('/users/agents')
         .then(res => setAgents(res.data))
         .catch(err => console.error("Failed to fetch agents", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) handleFileSelection(e.dataTransfer.files[0]);
  };

  const handleFileSelection = (selectedFile) => {
    setError(null);
    if (!selectedFile.name.match(/\.(mp3|wav|m4a|aac)$/i)) {
      setError('Invalid file type. Please upload MP3, WAV, M4A, or AAC.');
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) { setError('Please select a file.'); return; }
    if (!agentId) { setError('Please select an agent.'); return; }
    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('agent_id', agentId);
    try {
      const response = await api.post('/calls/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsUploading(false);
      setFile(null);
      onUploadSuccess(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(11,15,25,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h2 style={{ marginBottom: '24px' }}>Upload Call Recording</h2>

        {error && (
          <div style={{ padding: '12px', backgroundColor: 'var(--error-bg)', color: 'var(--error)', borderRadius: '6px', marginBottom: '16px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>Assign to Agent *</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <select 
              value={agentId} 
              onChange={e => setAgentId(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', outline: 'none', appearance: 'none' }}
            >
              <option value="" disabled>Select an agent in your department</option>
              {agents.map(a => (
                <option key={a.user_id} value={a.user_id}>{a.firstName} {a.lastName} ({a.email})</option>
              ))}
            </select>
          </div>
        </div>

        <div
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            borderRadius: '12px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
            backgroundColor: isDragging ? 'var(--bg-tertiary)' : 'transparent',
            transition: 'all 0.2s ease', marginBottom: '24px'
          }}
        >
          <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleFileSelection(e.target.files[0])} accept=".mp3,.wav,.m4a,.aac" style={{ display: 'none' }} />
          <UploadCloud size={48} color={isDragging ? 'var(--accent-primary)' : 'var(--text-muted)'} style={{ margin: '0 auto 16px auto' }} />
          {file ? (
            <div>
              <p style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{file.name}</p>
              <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Click to upload or drag and drop</p>
              <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>MP3, WAV, M4A, or AAC</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn-secondary" onClick={onClose} disabled={isUploading}>Cancel</button>
          <button className="btn-primary" onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? <><Loader2 size={18} className="animate-spin" /> Uploading...</> : 'Upload & Process'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
