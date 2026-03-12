import React, { useState } from 'react';
import { Braces, Key, FileSearch, Clock, Wand2, ArrowRight } from 'lucide-react';
import cronstrue from 'cronstrue';
import api from '../services/api';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css';


    const RegexTesterCard = ({ entity, onChange }) => {
    const [testString, setTestString] = useState('');
    const [flags, setFlags] = useState('g'); // Global flag by default

    let matches = [];
    let error = null;

    try {
        if (entity.value) {
        const re = new RegExp(entity.value, flags);
        // If global flag is present, find all matches. Otherwise, just find the first.
        if (flags.includes('g')) {
            matches = [...testString.matchAll(re)].map(m => m[0]);
        } else {
            const m = testString.match(re);
            if (m) matches = [m[0]];
        }
        }
    } catch (err) {
        error = "Invalid Regular Expression";
    }

    return (
        <div className="repo-card" style={{ padding: '16px', marginBottom: '16px' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
            <FileSearch size={16} color="#ef4444" /> Regex Tester
        </h4>
        
        {/* Pattern & Flags */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <input 
            type="text" 
            className="form-input" 
            style={{ flex: 3, fontFamily: 'monospace', color: '#ef4444' }} 
            value={entity.value} 
            onChange={(e) => onChange(e.target.value)} 
            />
            <input 
            type="text" 
            className="form-input" 
            style={{ flex: 1, fontFamily: 'monospace', textAlign: 'center' }} 
            value={flags} 
            onChange={(e) => setFlags(e.target.value)} 
            placeholder="Flags (g, i)" 
            />
        </div>

        {/* Test String Input */}
        <textarea 
            className="form-input" 
            style={{ width: '100%', fontFamily: 'monospace', height: '60px', marginBottom: '12px', resize: 'none' }} 
            value={testString} 
            onChange={(e) => setTestString(e.target.value)} 
            placeholder="Paste a string here to test the regex..." 
        />

        {/* Live Match Results */}
        <div className="form-input" style={{ width: '100%', minHeight: '40px', backgroundColor: 'var(--bg-main)', fontFamily: 'monospace', maxHeight: '100px', overflowY: 'auto' }}>
            {error ? (
            <span style={{ color: '#ef4444' }}>{error}</span>
            ) : testString.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>Waiting for test string...</span>
            ) : matches.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#10b981' }}>
                {matches.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
            ) : (
            <span style={{ color: 'var(--text-muted)' }}>No matches found.</span>
            )}
        </div>
        </div>
    );
    };
const UtilityVault = () => {
  const [masterCode, setMasterCode] = useState('');
  const [entities, setEntities] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- 1. The AI Extraction Trigger ---
  const analyzeCode = async () => {
    if (!masterCode.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await api.post('utilities/extract/', { code: masterCode });
      setEntities(res.data.entities);
    } catch (err) {
      console.error("Failed to analyze code", err);
      alert("Failed to extract utilities. Check console.");
    }
    setIsAnalyzing(false);
  };

  // --- 2. The Patentable BSUB Mechanism ---
  const handleUtilityUpdate = (entityId, newValue) => {
    setEntities(prevEntities => {
      const entityIndex = prevEntities.findIndex(e => e.id === entityId);
      if (entityIndex === -1) return prevEntities;

      const entity = prevEntities[entityIndex];
      const lengthDifference = newValue.length - (entity.endIndex - entity.startIndex);

      // A. Update the Master Code string live
      setMasterCode(prevCode => 
        prevCode.slice(0, entity.startIndex) + newValue + prevCode.slice(entity.endIndex)
      );

      // B. Shift indices of all subsequent entities so the bind doesn't break
      const newEntities = [...prevEntities];
      newEntities[entityIndex] = { ...entity, value: newValue, endIndex: entity.startIndex + newValue.length };

      for (let i = entityIndex + 1; i < newEntities.length; i++) {
        newEntities[i].startIndex += lengthDifference;
        newEntities[i].endIndex += lengthDifference;
      }

      return newEntities;
    });
  };

  // --- 3. UI Helpers ---
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
              <textarea className="form-input" style={{ flex: 1, fontFamily: 'monospace', height: '150px' }} value={value} onChange={handleChange} />
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
            <textarea className="form-input" style={{ width: '100%', fontFamily: 'monospace', marginBottom: '10px' }} value={value} onChange={handleChange} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <textarea className="form-input" style={{ flex: 1, fontFamily: 'monospace', height: '100px', background: 'var(--bg-main)', color: '#f59e0b' }} value={jwtData.header} readOnly />
              <textarea className="form-input" style={{ flex: 2, fontFamily: 'monospace', height: '100px', background: 'var(--bg-main)', color: '#10b981' }} value={jwtData.payload} readOnly />
            </div>
          </div>
        );

      case 'cron':
        let humanCron = 'Invalid Cron';
        try { humanCron = cronstrue.toString(value); } catch (e) {}
        return (
          <div className="repo-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}><Clock size={16} color="#10b981" /> Cron Expression</h4>
            <input type="text" className="form-input" style={{ width: '100%', fontFamily: 'monospace', fontSize: '1.2rem', textAlign: 'center' }} value={value} onChange={handleChange} />
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
      
      {/* --- Top Header Section --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.8rem', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Code Auditor</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>Paste monolithic code. Auto-provision utilities.</p>
        </div>
        <button 
          className="nav-item active" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '8px', background: 'var(--text-main)', color: 'var(--bg-main)' }}
          onClick={analyzeCode}
          disabled={isAnalyzing}
        >
          <Wand2 size={16} />
          {isAnalyzing ? 'Scanning Code...' : 'Extract Utilities'}
        </button>
      </div>

      {/* --- The Split IDE Layout --- */}
      <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: 0 }}> {/* minHeight: 0 is required for flex scrolling */}
        
        {/* Left Pane: Master Code Auditor */}
        {/* minWidth: 0 prevents long strings from blowing up the 50/50 split */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}> 
          <div 
            style={{ 
              flex: 1, 
              overflowY: 'auto', 
              backgroundColor: '#1e1e1e', // Classic VS Code Dark Background
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <Editor
              value={masterCode}
              onValueChange={code => setMasterCode(code)}
              highlight={code => Prism.highlight(code, Prism.languages.javascript, 'javascript')}
              padding={16}
              style={{
                fontFamily: '"Fira Code", "Consolas", monospace',
                fontSize: 14,
                minHeight: '100%',
                outline: 'none',
                // These two lines force long JWTs/hashes to wrap safely
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            />
          </div>
        </div>

        {/* Right Pane: Auto-Provisioned Utilities */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', minWidth: 0 }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Active Tools 
            <span style={{ background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem' }}>
              {entities.length} Bindings
            </span>
          </h3>
          
          {entities.length === 0 ? (
            <div style={{ border: '1px dashed var(--border-subtle)', borderRadius: '12px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Awaiting extraction...
            </div>
          ) : (
            entities.map(entity => (
              <div key={entity.id}>
                {renderUtilityTool(entity)}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
export default UtilityVault;