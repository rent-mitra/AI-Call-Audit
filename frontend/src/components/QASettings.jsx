import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Loader2 } from 'lucide-react';
import api from '../api';

const QASettings = () => {
  const [parameters, setParameters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchParameters();
  }, []);

  const fetchParameters = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/parameters');
      setParameters(response.data);
    } catch (error) {
      console.error("Failed to fetch parameters:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddParameter = () => {
    const newParam = {
      id: `temp-${Date.now()}`,
      category: '',
      question: '',
      mandatory: false,
      marks: 0,
      failure_if_missing: false,
      isNew: true
    };
    setParameters([...parameters, newParam]);
  };

  const handleChange = (id, field, value) => {
    setParameters(parameters.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleDelete = async (id) => {
    if (typeof id === 'string' && id.startsWith('temp-')) {
      setParameters(parameters.filter(p => p.id !== id));
      return;
    }

    try {
      await api.delete(`/parameters/${id}`);
      setParameters(parameters.filter(p => p.id !== id));
    } catch (error) {
      console.error("Failed to delete parameter:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const param of parameters) {
        if (param.isNew) {
          const { id, isNew, ...createData } = param;
          await api.post('/parameters', createData);
        } else {
          const { id, ...updateData } = param;
          await api.put(`/parameters/${id}`, updateData);
        }
      }
      await fetchParameters();
      alert('Settings saved successfully!');
    } catch (error) {
      console.error("Failed to save parameters:", error);
      alert('Failed to save some parameters.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Loader2 className="animate-spin" size={48} color="var(--accent-primary)" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="flex-between" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', letterSpacing: '-0.5px' }}>QA Checklist Configuration</h1>
          <p>Define the parameters the AI uses to evaluate calls.</p>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <th style={{ padding: '16px 24px', fontWeight: '500' }}>Category</th>
              <th style={{ padding: '16px 24px', fontWeight: '500', width: '40%' }}>Question</th>
              <th style={{ padding: '16px 24px', fontWeight: '500' }}>Marks</th>
              <th style={{ padding: '16px 24px', fontWeight: '500' }}>Mandatory</th>
              <th style={{ padding: '16px 24px', fontWeight: '500' }}></th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param) => (
              <tr key={param.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px 24px' }}>
                  <input 
                    type="text" 
                    value={param.category} 
                    onChange={(e) => handleChange(param.id, 'category', e.target.value)}
                    placeholder="e.g. Greeting"
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '8px', borderRadius: '4px', width: '100%' }} 
                  />
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <input 
                    type="text" 
                    value={param.question} 
                    onChange={(e) => handleChange(param.id, 'question', e.target.value)}
                    placeholder="Audit question..."
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '8px', borderRadius: '4px', width: '100%' }} 
                  />
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <input 
                    type="number" 
                    value={param.marks} 
                    onChange={(e) => handleChange(param.id, 'marks', parseInt(e.target.value) || 0)}
                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'white', padding: '8px', borderRadius: '4px', width: '60px' }} 
                  />
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <input 
                    type="checkbox" 
                    checked={param.mandatory} 
                    onChange={(e) => handleChange(param.id, 'mandatory', e.target.checked)}
                  />
                </td>
                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <button onClick={() => handleDelete(param.id)} style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <button className="btn-secondary" onClick={handleAddParameter} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Add Parameter
          </button>
        </div>
      </div>
    </div>
  );
};

export default QASettings;
