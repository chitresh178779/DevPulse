import React, { useState, useEffect } from 'react';
import api from '../services/api';

// Added mode and initialData props to handle Edit and View
const AddSnippetModal = ({ isOpen, onClose, onRefresh, mode, initialData }) => {
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    language: 'javascript',
    description: ''
  });
  const isView = mode === 'view';
  // Sync the form fields whenever initialData changes or modal opens
  useEffect(() => {
  if (isOpen) {
    if (initialData && (mode === 'edit' || mode === 'view')) {
      // Fill form with existing snippet data
      setFormData({
        title: initialData.title || '',
        code: initialData.code || '',
        language: initialData.language || 'javascript',
        description: initialData.description || ''
      });
    } else {
      // Fresh form for 'create' mode
      setFormData({ title: '', code: '', language: 'javascript', description: '' });
    }
  }
}, [isOpen, initialData, mode]);

 if (!isOpen) return null;

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Safety check: don't submit if we are just viewing
  if (mode === 'view') return;

  try {
    if (mode === 'edit' && initialData) {
      // 1. Send PUT request to update existing snippet
      await api.put(`snippets/${initialData.id}/`, formData);
      console.log("Snippet updated successfully");
    } else {
      // 2. Send POST request to create new snippet
      await api.post('snippets/', formData);
      console.log("Snippet created successfully");
    }
    
    // 3. Refresh the list in Dashboard.js and close the modal
    onRefresh(); 
    onClose();   
  } catch (err) {
    console.error("Failed to save snippet:", err.response?.data || err.message);
    alert(`Error: ${err.response?.data?.detail || "Could not save snippet"}`);
  }
};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>
          {isView ? 'Secret Details' : mode === 'edit' ? 'Edit Secret' : 'New Secret'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input 
              className="form-input"
              value={formData.title}
              disabled={isView} // Disable inputs in view mode
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Database Connection String"
              required
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <input 
              className="form-input"
              value={formData.description}
              disabled={isView}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="What is this secret for?"
            />
          </div>

          <div className="form-group">
            <label>Language</label>
            <select 
              className="form-input"
              value={formData.language}
              disabled={isView}
              onChange={e => setFormData({...formData, language: e.target.value})}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="sql">SQL</option>
              <option value="C">C</option>
              <option value="C++">C++</option>
              <option value="java">Java</option>
              <option value="go">Go</option>
              <option value="env">Environment (.env)</option>
              <option value="other">Other / Plain Text</option>
            </select>
          </div>

          <div className="form-group">
            <label>Code / Secret</label>
            <textarea 
              className="form-input"
              rows="8"
              disabled={isView}
              style={{ 
                fontFamily: 'monospace', 
                fontSize: '13px',
                background: isView ? '#000' : '' 
              }}
              value={formData.code}
              onChange={e => setFormData({...formData, code: e.target.value})}
              placeholder="Paste your code or secret here..."
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            {!isView && (
              <button type="submit" className="nav-item active" style={{ flex: 1, justifyContent: 'center' }}>
                {mode === 'edit' ? 'Update Vault' : 'Save to Vault'}
              </button>
            )}
            <button type="button" onClick={onClose} className="nav-item" style={{ flex: 1, justifyContent: 'center' }}>
              {isView ? 'Close' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSnippetModal;