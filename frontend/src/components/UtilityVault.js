import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Braces, Key, FileSearch, Clock, Wand2, ArrowRight } from 'lucide-react';
import cronstrue from 'cronstrue';
import api from '../services/api';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css';

// ... (KEEP YOUR RegexTesterCard COMPONENT EXACTLY AS IT WAS) ...
const RegexTesterCard = ({ entity, onChange }) => {
  const [testString, setTestString] = useState('');
  const [flags, setFlags] = useState('g');
  let matches = [];
  let error = null;
  try {
    if (entity.value) {
      const re = new RegExp(entity.value, flags);
      if (flags.includes('g')) matches = [...testString.matchAll(re)].map(m => m[0]);
      else { const m = testString.match(re); if (m) matches = [m[0]]; }
    }
  } catch (err) { error = "Invalid Regular Expression"; }

  return (
    <div className="repo-card" style={{ padding: '16px', marginBottom: '16px' }}>
      <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}><FileSearch size={16} color="#ef4444" /> Regex Tester</h4>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
        <input type="text" className="form-input" style={{ flex: 3, fontFamily: 'monospace', color: '#ef4444' }} value={entity.value} onChange={(e) => onChange(e.target.value)} />
        <input type="text" className="form-input" style={{ flex: 1, fontFamily: 'monospace', textAlign: 'center' }} value={flags} onChange={(e) => setFlags(e.target.value)} placeholder="Flags (g, i)" />
      </div>
      <textarea className="form-input" style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', height: '60px', marginBottom: '12px', resize: 'none' }} value={testString} onChange={(e) => setTestString(e.target.value)} placeholder="Paste a string here to test the regex..." />
      <div className="form-input" style={{ width: '100%', boxSizing: 'border-box', minHeight: '40px', backgroundColor: 'var(--bg-main)', fontFamily: 'monospace', maxHeight: '100px', overflowY: 'auto' }}>
        {error ? <span style={{ color: '#ef4444' }}>{error}</span> : testString.length === 0 ? <span style={{ color: 'var(--text-muted)' }}>Waiting for test string...</span> : matches.length > 0 ? <ul style={{ margin: 0, paddingLeft: '20px', color: '#10b981' }}>{matches.map((m, i) => <li key={i}>{m}</li>)}</ul> : <span style={{ color: 'var(--text-muted)' }}>No matches found.</span>}
      </div>
    </div>
  );
};


const UtilityVault = () => {
  const [masterCode, setMasterCode] = useState('');
  const [entities, setEntities] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const lastCodeLength = useRef(0);
  const skipNextScan = useRef(false);

  // --- NEW: Context Snapshot Syncing ---
  useEffect(() => {
    localStorage.setItem('draft_vault_state', JSON.stringify({ code: masterCode, entities }));
  }, [masterCode, entities]);

  useEffect(() => {
    const handleRestore = () => {
      skipNextScan.current = true; // Prevent AI from re-scanning on load
      const restored = JSON.parse(localStorage.getItem('draft_vault_state') || '{"code":"","entities":[]}');
      setMasterCode(restored.code || '');
      setEntities(restored.entities || []);
    };
    
    handleRestore(); // Grab drafts on load
    window.addEventListener('workspace-restored', handleRestore);
    return () => window.removeEventListener('workspace-restored', handleRestore);
  }, []);

  // --- AI Extraction Trigger ---
  const analyzeCode = useCallback(async () => {
    if (!masterCode.trim()) return;
    const userGeminiKey = localStorage.getItem('gemini_api_key');
    if (!userGeminiKey) { alert("Please add your Google Gemini API Key in the Settings panel."); return; }

    setIsAnalyzing(true);
    try {
      const res = await api.post('utilities/extract/', { code: masterCode, gemini_api_key: userGeminiKey });
      setEntities(res.data.entities);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to extract utilities.");
    }
    setIsAnalyzing(false);
  }, [masterCode]);

  useEffect(() => {
    if (skipNextScan.current) { skipNextScan.current = false; lastCodeLength.current = masterCode.length; return; }
    const lengthDiff = Math.abs(masterCode.length - lastCodeLength.current);
    if (lengthDiff > 30 && masterCode.length > 10) {
      const timer = setTimeout(() => { analyzeCode(); }, 800); 
      lastCodeLength.current = masterCode.length;
      return () => clearTimeout(timer);
    }
    lastCodeLength.current = masterCode.length;
  }, [masterCode, analyzeCode]);

  const handleUtilityUpdate = (entityId, newValue) => {
    skipNextScan.current = true;
    const entityIndex = entities.findIndex(e => e.id === entityId);
    if (entityIndex === -1) return;
    const entity = entities[entityIndex];

    let finalValue = newValue;
    const originalText = masterCode.substring(entity.startIndex, entity.endIndex);
    if (originalText.startsWith('"') && !finalValue.startsWith('"')) finalValue = '"' + finalValue;
    else if (originalText.startsWith("'") && !finalValue.startsWith("'")) finalValue = "'" + finalValue;
    if (originalText.endsWith('"') && !finalValue.endsWith('"')) finalValue = finalValue + '"';
    else if (originalText.endsWith("'") && !finalValue.endsWith("'")) finalValue = finalValue + "'";

    const lengthDiff = finalValue.length - (entity.endIndex - entity.startIndex);

    setMasterCode(prevCode => {
      const before = prevCode.substring(0, entity.startIndex);
      const after = prevCode.substring(entity.endIndex);
      return before + finalValue + after;
    });

    setEntities(prevEntities => {
      const newEntities = [...prevEntities];
      newEntities[entityIndex] = { ...newEntities[entityIndex], value: newValue, endIndex: newEntities[entityIndex].endIndex + lengthDiff };
      for (let i = entityIndex + 1; i < newEntities.length; i++) {
        newEntities[i].startIndex += lengthDiff;
        newEntities[i].endIndex += lengthDiff;
      }
      return newEntities;
    });
  };

  const renderUtilityTool = (entity) => {
    const { id, type, value } = entity;
    const handleChange = (e) => handleUtilityUpdate(id, e.target.value);

    switch (type) {
      case 'json':
        let formattedJson = '// Invalid JSON';
        try { formattedJson = JSON.stringify(JSON.parse(value), null, 2); } catch (e) {}
        return (
          <div className="repo-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}><Braces size={16} color="#3b82f6" /> JSON Object</h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <textarea className="form-input" style={{ flex: 1, boxSizing: 'border-box', fontFamily: 'monospace', height: '150px' }} value={value} onChange={handleChange} />
              <ArrowRight style={{ alignSelf: 'center', color: 'var(--text-muted)' }} />
              <textarea className="form-input" style={{ flex: 1, fontFamily: 'monospace', height: '150px', background: 'var(--bg-main)' }} value={formattedJson} readOnly />
            </div>
          </div>
        );
      case 'jwt':
        let jwtData = { header: '// Invalid', payload: '// Invalid' };
        try {
          const parts = value.split('.');
          if (parts.length === 3) {
            jwtData.header = JSON.stringify(JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'))), null, 2);
            jwtData.payload = JSON.stringify(JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))), null, 2);
          }
        } catch (e) {}
        return (
          <div className="repo-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}><Key size={16} color="#f59e0b" /> JWT Token</h4>
            <textarea className="form-input" style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', marginBottom: '10px' }} value={value} onChange={handleChange} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <textarea className="form-input" style={{ flex: 1, boxSizing: 'border-box', fontFamily: 'monospace', height: '100px', background: 'var(--bg-main)', color: '#f59e0b' }} value={jwtData.header} readOnly />
              <textarea className="form-input" style={{ flex: 2, boxSizing: 'border-box', fontFamily: 'monospace', height: '100px', background: 'var(--bg-main)', color: '#10b981' }} value={jwtData.payload} readOnly />
            </div>
          </div>
        );
      case 'cron':
        let humanCron = 'Invalid Cron';
        try { humanCron = cronstrue.toString(value); } catch (e) {}
        return (
          <div className="repo-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}><Clock size={16} color="#10b981" /> Cron Expression</h4>
            <input type="text" className="form-input" style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '1.2rem', textAlign: 'center' }} value={value} onChange={handleChange} />
            <p style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold', marginTop: '10px' }}>{humanCron}</p>
          </div>
        );
      case 'regex':
        return <RegexTesterCard key={id} entity={entity} onChange={(val) => handleUtilityUpdate(id, val)} />;
      default:
        return null;
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.8rem', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>UTILITIES</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Paste monolithic code. Auto-provision utilities.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="nav-item active" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '8px', background: 'var(--text-main)', color: 'var(--bg-main)', fontWeight: 'bold' }} onClick={analyzeCode} disabled={isAnalyzing}>
            <Wand2 size={16} />{isAnalyzing ? 'Scanning Code...' : 'Extract Utilities'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}> 
          <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#1e1e1e', borderRadius: '8px', border: '1px solid var(--border-subtle)'}}>
            <Editor value={masterCode} onValueChange={code => setMasterCode(code)} highlight={code => Prism.highlight(code, Prism.languages.javascript, 'javascript')} padding={16} style={{ fontFamily: '"Fira Code", "Consolas", monospace', fontSize: 14, minHeight: '100%', outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', minWidth: 0 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>Active Tools <span style={{ background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem' }}>{entities.length} Bindings</span></h3>
          {entities.length === 0 ? (
            <div style={{ border: '1px dashed var(--border-subtle)', borderRadius: '12px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Awaiting extraction...</div>
          ) : (
            entities.map(entity => (<div key={entity.id}>{renderUtilityTool(entity)}</div>))
          )}
        </div>
      </div>
    </div>
  );
};
export default UtilityVault;