import React, { useState, useEffect } from 'react';
import { X, Key, Save, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../services/api'; // Ensure this path matches your project structure!

const SettingsPanel = ({ isOpen, onClose, user }) => {
  const [activeMenu, setActiveMenu] = useState('profile');
  
  // --- CONNECTION 1: Profile State ---
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null);

  // --- CONNECTION 2: API Keys State (Loaded from browser) ---
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_token') || '');
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null);

  // Sync state when the user prop loads from the dashboard
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleDrawerClick = (e) => e.stopPropagation();

  // --- ACTION: Save Profile to Django ---
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileStatus(null);
    try {
      // Sends the updated info to your Django backend
      await api.patch('auth/user/', { username, email });
      setProfileStatus('success');
      setTimeout(() => setProfileStatus(null), 3000);
    } catch (error) {
      console.error("Failed to update profile", error);
      setProfileStatus('error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- ACTION: Save Keys to LocalStorage ---
  const handleSaveKeys = async () => {
    setIsSavingKeys(true);
    setKeyStatus(null);
    try {
      // Simulate a tiny delay for the UI spinner
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Saves the keys securely in the browser
      localStorage.setItem('github_token', githubToken);
      localStorage.setItem('gemini_api_key', geminiKey);
      
      setKeyStatus('success');
      setTimeout(() => setKeyStatus(null), 3000);
    } catch (error) {
      console.error("Failed to save keys", error);
      setKeyStatus('error');
    } finally {
      setIsSavingKeys(false);
    }
  };

  return (
    <>
      <div className={`settings-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />

      <div className={`settings-drawer ${isOpen ? 'open' : ''}`} onClick={handleDrawerClick}>
        <div className="settings-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', color: 'white', margin: 0 }}>Settings</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>Manage your workspace preferences.</p>
          </div>
          <button className="settings-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #334155', padding: '0 1.5rem', background: '#1e1e2e' }}>
          <button 
            onClick={() => setActiveMenu('profile')}
            style={{ padding: '1rem 0.75rem', color: activeMenu === 'profile' ? '#6366f1' : '#94a3b8', borderBottom: activeMenu === 'profile' ? '2px solid #6366f1' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
          >
            Profile
          </button>
          <button 
            onClick={() => setActiveMenu('integrations')}
            style={{ padding: '1rem 0.75rem', color: activeMenu === 'integrations' ? '#6366f1' : '#94a3b8', borderBottom: activeMenu === 'integrations' ? '2px solid #6366f1' : '2px solid transparent', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', marginLeft: '1rem' }}
          >
            Integrations
          </button>
        </div>

        <div className="settings-content">
          
          {/* PROFILE TAB */}
          {activeMenu === 'profile' && (
            <div className="fade-in">
              <div className="settings-group">
                <label className="settings-label">Username</label>
                {/* WIRING: value and onChange map what you type to the React State */}
                <input 
                  type="text" 
                  className="settings-input" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="settings-group">
                <label className="settings-label">Email Address</label>
                <input 
                  type="email" 
                  className="settings-input" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com" 
                />
              </div>
              
              {/* WIRING: onClick triggers the save function */}
              <button 
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="premium-audit-btn" 
                style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: profileStatus === 'success' ? '#10b981' : '' }}
              >
                {isSavingProfile ? <Loader2 className="animate-spin" size={18} /> : 
                 profileStatus === 'success' ? <CheckCircle2 size={18} /> : <Save size={18} />}
                {isSavingProfile ? 'Saving...' : profileStatus === 'success' ? 'Profile Updated' : 'Save Changes'}
              </button>
              
              {profileStatus === 'error' && <p style={{color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center'}}>Failed to update profile. Check backend logs.</p>}
            </div>
          )}

          {/* INTEGRATIONS TAB */}
          {activeMenu === 'integrations' && (
            <div className="fade-in">
              <div className="settings-group">
                <label className="settings-label flex items-center gap-2">
                  <Key size={14} className="text-indigo-400" /> GitHub Personal Access Token
                </label>
                <input 
                  type="password" 
                  className="settings-input" 
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Saved securely in your browser. Used for Repository Pulse analytics.</p>
              </div>
              <div className="settings-group">
                <label className="settings-label flex items-center gap-2">
                  <Key size={14} className="text-purple-400" /> Google Gemini API Key
                </label>
                <input 
                  type="password" 
                  className="settings-input" 
                  placeholder="AIzaSyBxxxxxxxxxxxxxxxxxx"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Saved securely in your browser. Used for AI Code Auditor.</p>
              </div>

              <button 
                onClick={handleSaveKeys}
                disabled={isSavingKeys}
                className="premium-audit-btn" 
                style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: keyStatus === 'success' ? '#10b981' : '' }}
              >
                {isSavingKeys ? <Loader2 className="animate-spin" size={18} /> : 
                 keyStatus === 'success' ? <CheckCircle2 size={18} /> : <Save size={18} />}
                {isSavingKeys ? 'Saving...' : keyStatus === 'success' ? 'Keys Secured' : 'Update Keys'}
              </button>
            </div>
          )}
          
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;