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

  // Appeal & review states
  const [agentComments, setAgentComments] = useState('');
  const [qaComments, setQaComments] = useState('');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [showDisputeInput, setShowDisputeInput] = useState(false);

  const fetchCallData = () => {
    setIsLoading(true);
    api.get(`/calls/${id}`).then(res => {
      setCallData(res.data);
      setIsLoading(false);
    }).catch(err => {
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchCallData();

    // Fetch audio blob
    api.get(`/calls/${id}/audio`, { responseType: 'blob' }).then(res => {
      setAudioUrl(URL.createObjectURL(res.data));
    }).catch(err => console.error("Failed to load audio streaming URL.", err));
  }, [id, user?.role]);
  useEffect(() => {
    if (!callData || callData.status === 'COMPLETED' || callData.status === 'FAILED') {
      return;
    }

    const interval = setInterval(() => {
      api.get(`/calls/${id}`).then(res => {
        setCallData(res.data);
      }).catch(err => console.error("Failed to poll call data:", err));
    }, 3000);

    return () => clearInterval(interval);
  }, [callData?.status, id]);
  const handleAgentReview = async (status, comments = '') => {
    setIsReviewSubmitting(true);
    try {
      await api.post(`/calls/${id}/agent-review`, { status, comments });
      // Re-fetch call data to update UI
      api.get(`/calls/${id}`).then(res => {
        setCallData(res.data);
      });
      setShowDisputeInput(false);
      setAgentComments('');
    } catch (err) {
      console.error("Failed to submit agent review:", err);
      alert(err.response?.data?.detail || "Failed to submit review.");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleQaReview = async (action) => {
    if (!qaComments.trim()) {
      alert("Please provide feedback or comments for your decision.");
      return;
    }
    setIsReviewSubmitting(true);
    try {
      await api.post(`/calls/${id}/qa-review`, { action, comments: qaComments });
      // Re-fetch call data to update UI
      api.get(`/calls/${id}`).then(res => {
        setCallData(res.data);
      });
      setQaComments('');
    } catch (err) {
      console.error("Failed to submit QA review:", err);
      alert(err.response?.data?.detail || "Failed to submit QA review.");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  if (!callData) return <div style={{ padding: '40px', textAlign: 'center' }}>Call not found.</div>;

  const getStatusIcon = (status) => {
    if (status === 'Passed' || status === 'PASSED') return <CheckCircle size={20} color="var(--success)" />;
    if (status === 'Failed' || status === 'FAILED') return <XCircle size={20} color="var(--error)" />;
    return <AlertCircle size={20} color="var(--warning)" />;
  };

  const isAudited = callData.status === 'COMPLETED';

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

      {/* Agent & QA Review Panel */}
      {isAudited && (
        <div className="glass-card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--accent-primary)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            💬 Audit Appeal & Satisfaction Review
          </h3>
          
          {/* Case 1: No review submitted yet & logged in as Agent */}
          {user?.role === 'AGENT' && !callData.agentReviewStatus && (
            <div>
              <p style={{ marginBottom: '16px' }}>How do you feel about the AI/QA audit results for this call?</p>
              {!showDisputeInput ? (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ backgroundColor: 'var(--success)' }}
                    disabled={isReviewSubmitting}
                    onClick={() => handleAgentReview('SATISFIED')}
                  >
                    Mark as Satisfied
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
                    disabled={isReviewSubmitting}
                    onClick={() => setShowDisputeInput(true)}
                  >
                    Mark as Unsatisfied / Dispute
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Please explain your objection or reason for disputing this audit:
                  </label>
                  <textarea
                    rows={3}
                    style={{
                      width: '100%',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      padding: '10px',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                    placeholder="E.g., The AI misattributed SPEAKER_00's greeting to the customer instead of the agent."
                    value={agentComments}
                    onChange={(e) => setAgentComments(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      className="btn-primary" 
                      style={{ backgroundColor: 'var(--error)' }}
                      disabled={isReviewSubmitting || !agentComments.trim()}
                      onClick={() => handleAgentReview('DISPUTED', agentComments)}
                    >
                      {isReviewSubmitting ? 'Submitting...' : 'Submit Appeal to QA'}
                    </button>
                    <button 
                      className="btn-secondary" 
                      disabled={isReviewSubmitting}
                      onClick={() => {
                        setShowDisputeInput(false);
                        setAgentComments('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Case 2: Disputed call & logged in as QA */}
          {user?.role === 'QA' && callData.agentReviewStatus === 'DISPUTED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--error-bg)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--error)', margin: '0 0 8px 0', fontSize: '1rem' }}>⚠️ Dispute Raised by Agent</h4>
                <p style={{ color: 'var(--text-primary)', fontStyle: 'italic', margin: 0 }}>
                  "{callData.agentReviewComments || 'No comment provided.'}"
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Provide response comments (Required to resolve dispute):
                </label>
                <textarea
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    padding: '10px',
                    fontFamily: 'inherit',
                    outline: 'none'
                  }}
                  placeholder="Explain why you are rejecting the appeal or confirm if you accept and will re-audit."
                  value={qaComments}
                  onChange={(e) => setQaComments(e.target.value)}
                />
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ backgroundColor: 'var(--success)' }}
                    disabled={isReviewSubmitting || !qaComments.trim()}
                    onClick={() => handleQaReview('RE_AUDIT')}
                  >
                    Accept Appeal & Mark Re-Audited
                  </button>
                  <button 
                    className="btn-primary" 
                    style={{ backgroundColor: 'var(--error)' }}
                    disabled={isReviewSubmitting || !qaComments.trim()}
                    onClick={() => handleQaReview('REJECT')}
                  >
                    Reject Appeal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Case 3: Review submitted or resolved (Viewed by Agent or QA) */}
          {(callData.agentReviewStatus && (user?.role !== 'QA' || callData.agentReviewStatus !== 'DISPUTED')) && (
            <div>
              {callData.agentReviewStatus === 'SATISFIED' && (
                <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                  <CheckCircle size={18} /> Agent marked this audit as Satisfied.
                </div>
              )}
              
              {callData.agentReviewStatus === 'DISPUTED' && (
                <div>
                  <div style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500', marginBottom: '8px' }}>
                    <AlertCircle size={18} /> Audit Appeal Submitted (Awaiting QA Review)
                  </div>
                  <p style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', fontStyle: 'italic' }}>
                    Agent comments: "{callData.agentReviewComments}"
                  </p>
                </div>
              )}

              {callData.agentReviewStatus === 'DISPUTE_REJECTED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                    <XCircle size={18} /> QA Rejected Agent Dispute
                  </div>
                  <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Agent comments:</strong> "{callData.agentReviewComments}"</p>
                    <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>QA decision notes:</strong> "{callData.qaReviewComments}"</p>
                  </div>
                </div>
              )}

              {callData.agentReviewStatus === 'RE_AUDITED' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                    <CheckCircle size={18} /> QA Accepted Appeal & Re-Audited Call
                  </div>
                  <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Agent comments:</strong> "{callData.agentReviewComments}"</p>
                    <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>QA re-audit notes:</strong> "{callData.qaReviewComments}"</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Case 4: No review submitted yet & logged in as QA */}
          {user?.role === 'QA' && !callData.agentReviewStatus && (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
              Awaiting agent review (agent has not marked satisfaction yet).
            </p>
          )}
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
              ) : (callData.status === 'EVALUATING' || callData.status === 'PENDING' || callData.status === 'TRANSCRIBING' || callData.status === 'PENDING_EVALUATION') ? (
                callData.agentReviewStatus === 'RE_AUDITED' ? (
                  <>
                    <AlertCircle size={48} style={{ margin: '0 auto 16px auto', color: 'var(--warning)' }} />
                    <h3>Re-Auditing & Re-Transcribing</h3>
                    <p>The system is currently re-transcribing and re-evaluating the call recording. Please wait.</p>
                  </>
                ) : (
                  <>
                    <AlertCircle size={48} style={{ margin: '0 auto 16px auto', color: 'var(--warning)' }} />
                    <h3>Processing Audit</h3>
                    <p>The AI is currently analyzing the call recording. Please wait.</p>
                  </>
                )
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
