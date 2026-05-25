import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, CheckCircle, XCircle, AlertCircle, Headphones } from 'lucide-react';
import api from '../api';
import { useAuth } from './AuthContext';

const CallDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [callData, setCallData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    // Attempt fetch call data
    api.get(`/calls/${id}`).then(res => {
      setCallData(res.data);
      if (res.data.ai_feedback) setAiFeedback(res.data.ai_feedback);
      setIsLoading(false);
    }).catch(err => {
      setIsLoading(false);
    });

    // Fetch audio blob
    api.get(`/calls/${id}/audio`, { responseType: 'blob' }).then(res => {
      setAudioUrl(URL.createObjectURL(res.data));
    }).catch(err => console.error("Failed to load audio streaming URL.", err));
  }, [id, user?.role]);

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  if (!callData) return <div style={{ padding: '40px', textAlign: 'center' }}>Call not found.</div>;

  const getStatusIcon = (status) => {
    if (status === 'Passed' || status === 'PASSED') return <CheckCircle size={20} color="var(--success)" />;
    if (status === 'Failed' || status === 'FAILED') return <XCircle size={20} color="var(--error)" />;
    return <AlertCircle size={20} color="var(--warning)" />;
  };

  const isAudited = !!callData.final_status;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Header Card */}
      <div className="glass-card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{callData.filename}</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{callData.date}</span>

            {callData.agentName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' }}>
                👤 Agent: {callData.agentName}
              </span>
            )}

            {callData.qaName && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(59,130,246,0.2)' }}>
                🔍 Audited by: {callData.qaName}
              </span>
            )}

            {!callData.qaName && (
              <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: 'rgba(107,114,128,0.1)', color: 'var(--text-muted)', border: '1px solid rgba(107,114,128,0.2)' }}>
                Awaiting QA
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {callData.score !== null && callData.score !== undefined && isAudited && (
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: callData.score >= 80 ? 'var(--success)' : callData.score >= 60 ? 'var(--warning)' : 'var(--error)' }}>
              {callData.score}%
            </div>
          )}
          {callData.final_status && isAudited && (
            <div className={`badge ${callData.final_status.toLowerCase()}`}>
              {callData.final_status.replace('_', ' ')}
            </div>
          )}
        </div>
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <div className="glass-card" style={{ marginBottom: '24px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Headphones color="var(--accent-primary)" />
          <audio controls src={audioUrl} style={{ width: '100%', height: '40px', outline: 'none' }} />
        </div>
      )}

      <div className="grid-cols-2" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start' }}>
        
        {/* Left Column: Evaluation Breakdown or Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {!isAudited ? (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {callData.status === 'FAILED' ? (
                <>
                  <XCircle size={48} style={{ margin: '0 auto 16px auto', color: 'var(--error)' }} />
                  <h3>Audit Failed</h3>
                  <p>The AI encountered an error while processing this call recording.</p>
                </>
              ) : (
                <>
                  <AlertCircle size={48} style={{ margin: '0 auto 16px auto', color: 'var(--warning)' }} />
                  <h3>Processing Audit</h3>
                  <p>The AI is currently analyzing the call recording. Please wait.</p>
                </>
              )}
            </div>
          ) : (
            <>

            {/* AI Summary Read-Only View */}
            {(isAudited && callData.ai_feedback) && (
              <div className="glass-card">
                <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>Feedback Summary</h3>
                <p style={{ lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {callData.ai_feedback}
                </p>
              </div>
            )}

            {callData.results && callData.results.length > 0 && (
              <div className="glass-card" style={{ padding: '0' }}>
                <h3 style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', margin: 0 }}>Parameter Breakdown</h3>
                <div>
                  {callData.results.map((res, idx) => (
                    <div key={idx} style={{ padding: '20px 24px', borderBottom: idx !== callData.results.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {getStatusIcon(res.status)}
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{res.category}</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{res.question}</p>
                          </div>
                        </div>
                        <span style={{ fontWeight: '600' }}>{res.marks_obtained} pts</span>
                      </div>
                      
                      {res.evidence && (
                        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', marginBottom: '12px', borderLeft: '3px solid var(--accent-primary)' }}>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Evidence from Transcript:</p>
                          <p style={{ fontStyle: 'italic', color: 'var(--text-primary)' }}>"{res.evidence}"</p>
                        </div>
                      )}
                      
                      {res.feedback && <p style={{ fontSize: '0.95rem', margin: '8px 0 0 0' }}>{res.feedback}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>
          )}
          </div>

          {/* Right Column: Transcript */}
          <div className="glass-card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column', padding: '0' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MessageSquare size={20} color="var(--accent-primary)" />
              <h3 style={{ margin: 0 }}>Call Transcript</h3>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {callData.transcript && callData.transcript.length > 0 ? (
                callData.transcript.map((line, idx) => {
                  const isAgent = line.speaker.toLowerCase().includes('agent') || line.speaker === 'SPEAKER_00';
                  const displayName = line.speaker === 'SPEAKER_00' ? 'Agent' : line.speaker === 'SPEAKER_01' ? 'Customer' : line.speaker;
                  return (
                    <div key={idx} style={{ alignSelf: isAgent ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textAlign: isAgent ? 'right' : 'left' }}>
                        {displayName} • {line.timestamp}
                      </div>
                      <div style={{
                        background: isAgent ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        borderBottomRightRadius: isAgent ? '0' : '12px',
                        borderBottomLeftRadius: isAgent ? '12px' : '0',
                        color: isAgent ? 'white' : 'var(--text-primary)'
                      }}>
                        {line.text}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                  Transcript is being generated or not available.
                </div>
              )}
            </div>
          </div>

        </div>
    </div>
  );
};

export default CallDetail;
