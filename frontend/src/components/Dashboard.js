import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, ShieldCheck, Settings, LogOut, CircleDot, Shield, RefreshCw, 
  FolderGit2, Wand2, LayoutTemplate, CloudUpload, CloudDownload, Bot, X, Loader2
} from 'lucide-react';
import api from '../services/api'; 
import './Dashboard.css';
import SnippetCard from './SnippetCard';
import AddSnippetModal from './AddSnippetModal';
import RepoAnalytics from './RepoAnalytics';
import UtilityVault from './UtilityVault';
import ComponentLibrary from './ComponentLibrary';
import CodeAuditor from './CodeAuditor';
import SettingsPanel from './SettingsPanel';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [snippets, setSnippets] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isRefreshingRepo, setIsRefreshingRepo] = useState(false);
  const [repoRefreshTrigger, setRepoRefreshTrigger] = useState(0); 

  // --- GLOBAL WORKSPACE STATE ---
  const [syncMode, setSyncMode] = useState(null);
  const [briefingData, setBriefingData] = useState(null);

  const navigate = useNavigate();
  
  const fetchSnippets = useCallback(() => {
    api.get('snippets/').then(res => setSnippets(res.data)).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    api.get('auth/user/').then(res => setUser(res.data)).catch(() => navigate('/'));
    fetchSnippets();
  }, [navigate, fetchSnippets]);

  const handleLogout = () => {
    localStorage.removeItem('gemini_api_key');
    localStorage.removeItem('github_token');
    localStorage.removeItem('access_token');
    api.post('auth/logout/').then(() => navigate('/')).catch(() => navigate('/'));
  };

  const openModal = (mode, snippet = null) => {
    setModalMode(mode); setSelectedSnippet(snippet); setIsModalOpen(true);
  };

  const handleRerunAnalytics = async () => {
    setIsRefreshingRepo(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      setRepoRefreshTrigger(prev => prev + 1);
    } catch (error) { console.error(error); } finally { setIsRefreshingRepo(false); }
  };

  // --- THE NEW DASHBOARD-LEVEL WORKSPACE LOGIC ---
  const handlePauseWorkflow = async () => {
    setSyncMode('pausing');
    try {
      // Scoop up the drafts that the components auto-saved!
      const vaultState = JSON.parse(localStorage.getItem('draft_vault_state') || '{"code":"","entities":[]}');
      const auditorState = { code: localStorage.getItem('draft_auditor_code') || '' };

      await api.post('workspace/snapshot/', {
        vault_state: vaultState,
        auditor_state: auditorState
      });
    } catch (err) {
      console.error("Failed to pause", err);
      alert("Failed to save workspace to server.");
    } finally {
      setSyncMode(null);
    }
  };

  const handleResumeWorkflow = async () => {
    setSyncMode('resuming');
    const userGeminiKey = localStorage.getItem('gemini_api_key');

    try {
      const res = await api.get('workspace/snapshot/', { headers: { 'X-Gemini-Key': userGeminiKey || '' }});
      const { vault_state, auditor_state, ai_briefing } = res.data;

      // Put the data back into the browser memory
      if (vault_state) localStorage.setItem('draft_vault_state', JSON.stringify(vault_state));
      if (auditor_state) localStorage.setItem('draft_auditor_code', auditor_state.code || '');

      // Shout to the components to re-load from memory
      window.dispatchEvent(new Event('workspace-restored'));

      if (ai_briefing) setBriefingData(ai_briefing);

    } catch (err) {
      if (err.response?.status === 404) alert("No paused workflow found.");
      else alert("Failed to connect to workflow server.");
    } finally {
      setSyncMode(null);
    }
  };

  return (
    <div className="dashboard-container">
      
      <aside className="sidebar">
        <div className="sidebar-header"><h1 className="sidebar-logo">DevPulse</h1></div>
        
        <nav className="nav-menu">
          <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><LayoutGrid size={18} /><span>Overview</span></button>
          <button className={`nav-item ${activeTab === 'vault' ? 'active' : ''}`} onClick={() => setActiveTab('vault')}><ShieldCheck size={18} /><span>Vault</span></button>
          <button className={`nav-item ${activeTab === 'utilities' ? 'active' : ''}`} onClick={() => setActiveTab('utilities')}><Wand2 size={18} /><span>Utilities</span></button>
          <button className={`nav-item ${activeTab === 'components' ? 'active' : ''}`} onClick={() => setActiveTab('components')}><LayoutTemplate size={18} />Component Library</button>
          <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}><FolderGit2 size={18} /><span>Repo Pulse</span></button>
          <button className={`nav-item ${activeTab === 'auditor' ? 'active' : ''}`} onClick={() => setActiveTab('auditor')}><Shield size={18} /><span>Code Auditor</span></button>
        </nav>

        <button className="nav-item active" onClick={() => openModal('create')} style={{ marginBottom: '1rem' }}>
          <span>+ New Snippet</span>
        </button>

        {/* Global Sidebar Controls */}
        <div className="sidebar-workspace-controls" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ fontSize: '0.70rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 8px 0', paddingLeft: '12px', fontWeight: 'bold' }}>Context Snapshot</p>
          <button onClick={handleResumeWorkflow} className="nav-item" style={{ color: '#cbd5e1' }}><CloudDownload size={18} className="text-indigo-400" /><span>Resume Workflow</span></button>
          <button onClick={handlePauseWorkflow} className="nav-item" style={{ color: '#cbd5e1' }}><CloudUpload size={18} className="text-indigo-400" /><span>Pause Workflow</span></button>
        </div>

        <button onClick={handleLogout} className="nav-item logout" style={{ marginTop: '1rem' }}><LogOut size={18} /><span>Sign Out</span></button>
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-text"><h2>Welcome back, {user ? user.username : 'Developer'}</h2><p>Your command center is ready.</p></div>
          <button className="settings-btn" onClick={() => setIsSettingsOpen(true)}><Settings size={20} /></button>
        </header>

        <div className="dashboard-grid">
          <div className="stat-card"><h3>Active Snippets</h3><p className="stat-value">{snippets.length}</p></div>
          <div className="stat-card"><h3>Vault Health</h3><p className="stat-value" style={{ color: '#818cf8' }}>Secure</p></div>
          <div className="stat-card"><h3>Status</h3><div className="status-indicator"><CircleDot size={12} className="status-dot-icon" /><span className="status-text">Operational</span></div></div>
        </div>

        {activeTab === 'vault' && (<div className="snippet-grid fade-in">{snippets.length > 0 ? snippets.map(item => (<SnippetCard key={item.id} snippet={item} onRefresh={fetchSnippets} onEdit={(s) => openModal('edit', s)} onView={(s) => openModal('view', s)}/>)) : <p style={{ color: 'var(--text-muted)', marginTop: '2rem' }}>No secrets stored yet.</p>}</div>)}
        {activeTab === 'overview' && (<div className="fade-in" style={{ marginTop: '2rem', color: 'var(--text-muted)' }}><p>Select a tab from the sidebar to manage your workspace.</p></div>)}
        <div className="h-full fade-in" style={{ display: activeTab === 'analytics' ? 'block' : 'none' }}>
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div><h3 style={{ fontSize: '1.5rem', margin: '0 0 8px 0', color: 'white' }}>Repository Pulse</h3><p style={{ color: 'var(--text-muted)', margin: 0 }}>AI-driven health metrics and recovery steps for your codebase.</p></div>
            <button onClick={handleRerunAnalytics} disabled={isRefreshingRepo} className="refresh-btn"><RefreshCw size={16} className={isRefreshingRepo ? "animate-spin text-indigo-400" : ""} />{isRefreshingRepo ? 'Scanning...' : 'Rerun Analytics'}</button>
          </div>
          <RepoAnalytics refreshTrigger={repoRefreshTrigger} />
        </div>
        <div className="h-full" style={{ display: activeTab === 'utilities' ? 'block' : 'none' }}><UtilityVault /></div>
        <div className="h-full" style={{ display: activeTab === 'components' ? 'block' : 'none' }}><ComponentLibrary /></div>
        <div className="h-full" style={{ display: activeTab === 'auditor' ? 'block' : 'none' }}><CodeAuditor /></div>
      </main>

      <AddSnippetModal isOpen={isModalOpen} mode={modalMode} initialData={selectedSnippet} onClose={() => { setIsModalOpen(false); setSelectedSnippet(null); }} onRefresh={fetchSnippets} />
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} user={user} />

      {/* --- DASHBOARD LEVEL MODALS (Will display over everything!) --- */}
      {briefingData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="fade-in" style={{ background: '#1e1e2e', border: '1px solid #334155', borderRadius: '16px', padding: '32px', maxWidth: '500px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative' }}>
            <button onClick={() => setBriefingData(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}><div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '12px', borderRadius: '50%' }}><Bot size={28} color="#6366f1" /></div><h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>Mental Context Restored</h2></div>
            <p style={{ color: '#cbd5e1', lineHeight: '1.7', fontSize: '1.05rem', margin: 0 }}>{briefingData}</p>
            <button onClick={() => setBriefingData(null)} style={{ width: '100%', marginTop: '24px', padding: '12px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Dive Back In</button>
          </div>
        </div>
      )}

      {syncMode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, transition: 'all 0.3s ease' }}>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '32px' }}>
            <Loader2 size={100} color="#6366f1" className="animate-spin" style={{ position: 'absolute', opacity: 0.3 }} />
            <Loader2 size={120} color="#818cf8" className="animate-spin" style={{ position: 'absolute', opacity: 0.1, animationDirection: 'reverse', animationDuration: '3s' }} />
            <div className="animate-pulse" style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '24px', borderRadius: '50%' }}>
              {syncMode === 'pausing' ? <CloudUpload size={48} color="#818cf8" /> : <Bot size={48} color="#818cf8" />}
            </div>
          </div>
          <h2 className="animate-pulse" style={{ color: 'white', fontSize: '2rem', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 12px 0', fontWeight: '800' }}>
            {syncMode === 'pausing' ? 'Securing Context Snapshot' : 'Restoring Mental Context'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', letterSpacing: '1px' }}>
            {syncMode === 'pausing' ? 'Encrypting workspace state and utilities to the cloud...' : 'Decrypting workspace and synthesizing AI briefing...'}
          </p>
          <div style={{ width: '300px', height: '2px', background: 'rgba(255,255,255,0.1)', marginTop: '40px', position: 'relative', overflow: 'hidden', borderRadius: '2px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '30%', background: 'linear-gradient(90deg, transparent, #818cf8, transparent)', animation: 'scanline 1.5s infinite linear' }} />
          </div>
          <style>{`@keyframes scanline { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }`}</style>
        </div>
      )}

    </div>
  );
};

export default Dashboard;