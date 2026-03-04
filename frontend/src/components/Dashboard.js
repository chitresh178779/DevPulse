import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  ShieldCheck, 
  Binary, 
  Settings, 
  LogOut, 
  CircleDot 
} from 'lucide-react';
import api from '../services/api'; 
import './Dashboard.css';
import SnippetCard from './SnippetCard';
import AddSnippetModal from './AddSnippetModal';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [snippets, setSnippets] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const navigate = useNavigate();

  // Define fetchSnippets so it can be called from useEffect and the Modal refresh
  const fetchSnippets = useCallback(() => {
    api.get('snippets/')
      .then(res => setSnippets(res.data))
      .catch(err => console.error("Could not fetch snippets", err));
  }, []);

  useEffect(() => {
    // 1. Fetch the authenticated user's details
    api.get('auth/user/')
      .then(response => {
        setUser(response.data);
      })
      .catch(error => {
        console.error("Error fetching user data:", error);
        navigate('/');
      });

    // 2. Initial fetch of snippets
    fetchSnippets();
  }, [navigate, fetchSnippets]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    api.post('auth/logout/')
      .then(() => {
        navigate('/'); 
      })
      .catch(error => {
        console.error("Logout failed:", error);
        navigate('/');
      });
  };
const openModal = (mode, snippet = null) => {
  console.log("Opening Modal in mode:", mode); // Debugging line
  setModalMode(mode);
  setSelectedSnippet(snippet);
  setIsModalOpen(true);
};
  return (
    <div className="dashboard-container">
      
      {/* Sidebar - Framer Minimalist Style */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-logo">DevPulse</h1>
        </div>
        
        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutGrid size={18} />
            <span>Overview</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'vault' ? 'active' : ''}`}
            onClick={() => setActiveTab('vault')}
          >
            <ShieldCheck size={18} />
            <span>Secret Vault</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'components' ? 'active' : ''}`}
            onClick={() => setActiveTab('components')}
          >
            <Binary size={18} />
            <span>Components</span>
          </button>
        </nav>

        {/* Updated: Use setIsModalOpen consistently */}
        <button className="nav-item active" onClick={() => openModal('create')}>
          <span>+ New Snippet</span>
        </button>

        <button onClick={handleLogout} className="nav-item logout" style={{ marginTop: 'auto' }}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-text">
            <h2>Welcome back, {user ? user.username : 'Developer'}</h2>
            <p>Your command center is ready.</p>
          </div>
          <button className="settings-btn" title="Settings">
            <Settings size={20} />
          </button>
        </header>

        {/* Dashboard Cards Grid */}
        <div className="dashboard-grid">
          <div className="stat-card">
            <h3>Active Snippets</h3>
            <p className="stat-value">{snippets.length}</p>
          </div>
          <div className="stat-card">
            <h3>Vault Health</h3>
            <p className="stat-value" style={{ color: '#818cf8' }}>Secure</p>
          </div>
          <div className="stat-card">
            <h3>Status</h3>
            <div className="status-indicator">
              <CircleDot size={12} className="status-dot-icon" />
              <span className="status-text">Operational</span>
            </div>
          </div>
        </div>

        {/* Content Section based on Active Tab */}
        {activeTab === 'vault' && (
          <div className="snippet-grid fade-in">
            {snippets.length > 0 ? (
              snippets.map(item => (
                <SnippetCard 
                  key={item.id} 
                  snippet={item} 
                  onRefresh={fetchSnippets}
                  onEdit={(s) => openModal('edit', s)}
                  onView={(s) => openModal('view', s)}
                />
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', marginTop: '2rem' }}>No secrets stored yet.</p>
            )}
          </div>
        )}

        {activeTab === 'overview' && (
           <div className="fade-in" style={{ marginTop: '2rem', color: 'var(--text-muted)' }}>
             <p>Select a tab from the sidebar to manage your workspace.</p>
           </div>
        )}
      </main>

      {/* Modal handles creation of new records */}
      <AddSnippetModal 
      isOpen={isModalOpen} 
      mode={modalMode}           // 'create', 'edit', or 'view'
      initialData={selectedSnippet} // The actual snippet object
      onClose={() => { setIsModalOpen(false); setSelectedSnippet(null); }} 
      onRefresh={fetchSnippets} 
      />
    </div>
  );
};

export default Dashboard;