import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Copy, Check, MoreVertical, Trash2, Edit3, Eye } from 'lucide-react';
import api from '../services/api';

const SnippetCard = ({ snippet, onRefresh, onEdit, onView }) => {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = (e) => {
    e.stopPropagation(); // Stop from triggering onView
    navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (e) => {
    e.stopPropagation(); // Stop from triggering onView
    setShowMenu(false);
    if (window.confirm('Delete this secret permanently?')) {
      try {
        await api.delete(`snippets/${snippet.id}/`);
        onRefresh();
      } catch (err) {
        console.error("Delete failed", err);
      }
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation(); // Stop from triggering onView
    setShowMenu(false);
    onEdit(snippet); // Passes the snippet data to Dashboard
  };

  const date = new Date(snippet.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="snippet-card" onClick={() => onView(snippet)}>
      <div className="snippet-header">
        <div style={{ flex: 1 }}>
          <h3 className="snippet-title">{snippet.title}</h3>
          <span className="snippet-lang-badge">{snippet.language}</span>
        </div>
        
        <div className="card-actions-wrapper">
          <button 
            className="action-icon-btn" 
            onClick={handleCopy} 
            title="Copy Code"
          >
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          </button>
          
          <div className="menu-container" ref={menuRef}>
            <button 
              className="action-icon-btn" 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            >
              <MoreVertical size={14} />
            </button>
            
            {showMenu && (
              <div className="dropdown-menu">
                <button onClick={handleEditClick}>
                  <Edit3 size={14} /> Edit
                </button>
                <button className="delete-text" onClick={handleDelete}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {snippet.description && (
        <p className="snippet-description-text">{snippet.description}</p>
      )}

      <div className="snippet-preview">
        <code>{snippet.code}</code>
      </div>

      <div className="snippet-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} />
          <span>{date}</span>
        </div>
        <div className="view-indicator">
          <Eye size={14} />
          <span>Details</span>
        </div>
      </div>
    </div>
  );
};

export default SnippetCard;