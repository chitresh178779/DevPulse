import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api'; // Your Axios instance
import { Shield, Zap, BookOpen, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import CodeEditor from '@uiw/react-textarea-code-editor';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeAuditor = () => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('IDLE'); // IDLE, SUBMITTING, POLLING, COMPLETED, FAILED
  const [auditData, setAuditData] = useState(null);
  const [error, setError] = useState('');
  
  const pollingIntervalRef = useRef(null);
  useEffect(() => {
    localStorage.setItem('draft_auditor_code', code);
  }, [code]);

  // 2. Listen for the Dashboard's "Resume" signal to reload the code
  useEffect(() => {
    const handleRestore = () => {
      const restoredCode = localStorage.getItem('draft_auditor_code') || '';
      setCode(restoredCode);
    };
    
    // Run once on load to grab existing drafts
    handleRestore();
    
    window.addEventListener('workspace-restored', handleRestore);
    return () => window.removeEventListener('workspace-restored', handleRestore);
  }, []);
  // Cleanup the interval if the user navigates away
  useEffect(() => {
    return () => clearInterval(pollingIntervalRef.current);
  }, []);

  const startAudit = async () => {
    if (!code.trim()) return;
    
    // --- BYOK INTEGRATION: Grab the key from the browser ---
    const userGeminiKey = localStorage.getItem('gemini_api_key');
    
    if (!userGeminiKey) {
      setError('Please add your Google Gemini API Key in the Settings panel to run an audit.');
      return;
    }

    setStatus('SUBMITTING');
    setError('');
    setAuditData(null);

    try {
      // 1. Submit the code to Django WITH the user's custom API key
      const res = await api.post('audit/submit/', { 
        code: code,
        gemini_api_key: userGeminiKey 
      });
      
      const auditId = res.data.audit_id;
      
      setStatus('POLLING');
      
      // 2. Start polling for results every 2.5 seconds
      pollingIntervalRef.current = setInterval(() => checkStatus(auditId), 2500);
      
    } catch (err) {
      console.error(err);
      // Smart Error Handling: Show Django's specific error message if it exists
      const backendError = err.response?.data?.error || 'Failed to submit code for audit.';
      setError(backendError);
      setStatus('FAILED');
    }
  };

  const checkStatus = async (auditId) => {
    try {
      const res = await api.get(`audit/${auditId}/status/`);
      const currentStatus = res.data.status;

      if (currentStatus === 'COMPLETED') {
        clearInterval(pollingIntervalRef.current);
        setAuditData(res.data);
        setStatus('COMPLETED');
      } else if (currentStatus === 'FAILED') {
        clearInterval(pollingIntervalRef.current);
        // Display AI failure message if available from backend
        const aiError = res.data.feedback?.error || 'The AI worker failed to process this snippet. Check your API key.';
        setError(aiError);
        setStatus('FAILED');
      }
      // If PENDING or PROCESSING, we just let the interval run...
    } catch (err) {
      clearInterval(pollingIntervalRef.current);
      setError('Connection to server lost.');
      setStatus('FAILED');
    }
  };

  // Helper to color-code the scores mapping to your custom CSS classes
  const getScoreTheme = (score) => {
    if (score >= 8) return 'text-success';
    if (score >= 5) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto flex gap-6 h-full">
      
      {/* Left Panel: The Code Editor */}
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">AI Code Auditor</h2>
          <p className="text-slate-400 text-sm">Submit monolithic code for deep architectural analysis.</p>
        </div>
        
        {/* Premium IDE Container */}
        <div className="ide-container flex-1">
          {/* Mac-style Window Header */}
          <div className="ide-header">
            <div className="ide-dots">
              <div className="dot red"></div>
              <div className="dot yellow"></div>
              <div className="dot green"></div>
            </div>
          </div>

          {/* The Editor */}
          <CodeEditor
            value={code}
            language="js"
            placeholder="Paste your code here..."
            onChange={(evn) => setCode(evn.target.value)}
            padding={16}
            className="perfect-aligned-editor"
            style={{ backgroundColor: "transparent" }}
          />

          {/* Glassmorphism Analyzing Overlay */}
          {(status === 'SUBMITTING' || status === 'POLLING') && (
            <div className="analyzing-overlay">
              <div className="scanning-line"></div>
              <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-3" />
              <p className="text-indigo-300 font-semibold tracking-wide animate-pulse">
                Running Deep Audit...
              </p>
            </div>
          )}
        </div>

        {/* Premium Gradient Button */}
        <button
          onClick={startAudit}
          disabled={status === 'SUBMITTING' || status === 'POLLING' || !code.trim()}
          className="premium-audit-btn "
        >
          {status === 'SUBMITTING' && <Loader2 className="animate-spin w-5 h-5" />}
          {status === 'POLLING' && <Loader2 className="animate-spin w-5 h-5" />}
          
          {status === 'IDLE' || status === 'COMPLETED' || status === 'FAILED' ? 'Run Deep Audit' : 
           'AI is Analyzing...'}
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Right Panel: The Results Dashboard */}
      <div className="w-[450px] bg-[#121212] rounded-xl border border-slate-800 p-6 flex flex-col overflow-y-auto">
        
        {/* Loading / Idle States */}
        {status === 'IDLE' && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center">
            <Shield className="w-12 h-12 mb-4 opacity-20" />
            <p>Awaiting code submission.</p>
          </div>
        )}

        {(status === 'POLLING' || status === 'SUBMITTING') && (
          <div className="flex-1 flex flex-col items-center justify-center text-indigo-400 text-center">
            <Loader2 className="w-12 h-12 mb-4 animate-spin opacity-80" />
            <p className="animate-pulse">Auditor is evaluating architecture...</p>
          </div>
        )}

        {/* Completed Dashboard State */}
        {status === 'COMPLETED' && auditData && (
          <div className="audit-dashboard">
            
            <div className="audit-header">
              <CheckCircle className="text-success" size={28} />
              Deep Audit Complete
            </div>

            {/* Top Row: Score Cards */}
            <div className="score-grid">
              <div className="score-card">
                <Shield className={getScoreTheme(auditData.security_score)} size={24} />
                <div className={`score-value ${getScoreTheme(auditData.security_score)}`}>
                  {auditData.security_score}<small>/10</small>
                </div>
                <div className="score-label">Security</div>
              </div>

              <div className="score-card">
                <Zap className={getScoreTheme(auditData.performance_score)} size={24} />
                <div className={`score-value ${getScoreTheme(auditData.performance_score)}`}>
                  {auditData.performance_score}<small>/10</small>
                </div>
                <div className="score-label">Performance</div>
              </div>

              <div className="score-card">
                <BookOpen className={getScoreTheme(auditData.readability_score)} size={24} />
                <div className={`score-value ${getScoreTheme(auditData.readability_score)}`}>
                  {auditData.readability_score}<small>/10</small>
                </div>
                <div className="score-label">Readability</div>
              </div>
            </div>

            {/* Detailed Feedback Mapping with Auto-Refactoring */}
            <div className="space-y-4 mt-6">
              
              {/* 1. Security Risks */}
              {auditData.feedback?.security_issues?.length > 0 && (
                <div className="feedback-card border-danger">
                  <h3 className="text-danger flex items-center gap-2"><Shield size={18}/> Security Risks</h3>
                  <div className="flex flex-col gap-4 mt-3">
                    {auditData.feedback.security_issues.map((issue, i) => (
                      <div key={i} className="pl-3 border-l-2 border-slate-700 pb-2">
                        <strong className="text-white block mb-1">{issue.title}</strong>
                        <p className="text-slate-300 text-sm mb-3 leading-relaxed">{issue.description}</p>
                        
                        {issue.refactor && (
                          <div className="refactor-box">
                            <div className="refactor-header">
                              <span>Suggested Refactor</span>
                              <span className="uppercase text-indigo-400">{issue.language || 'code'}</span>
                            </div>
                            <SyntaxHighlighter 
                              language={issue.language?.toLowerCase() || 'javascript'} 
                              style={vscDarkPlus}
                              customStyle={{ margin: 0, borderRadius: '0 0 0.5rem 0.5rem', fontSize: '0.85rem' }}
                            >
                              {issue.refactor}
                            </SyntaxHighlighter>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Performance Bottlenecks */}
              {auditData.feedback?.performance_bottlenecks?.length > 0 && (
                <div className="feedback-card border-warning mt-4">
                  <h3 className="text-warning flex items-center gap-2"><Zap size={18}/> Performance Bottlenecks</h3>
                  <div className="flex flex-col gap-4 mt-3">
                    {auditData.feedback.performance_bottlenecks.map((issue, i) => (
                      <div key={i} className="pl-3 border-l-2 border-slate-700 pb-2">
                        <strong className="text-white block mb-1">{issue.title}</strong>
                        <p className="text-slate-300 text-sm mb-3 leading-relaxed">{issue.description}</p>
                        
                        {issue.refactor && (
                          <div className="refactor-box">
                            <div className="refactor-header">
                              <span>Suggested Refactor</span>
                              <span className="uppercase text-indigo-400">{issue.language || 'code'}</span>
                            </div>
                           <SyntaxHighlighter 
                              language={issue.language?.toLowerCase() || 'javascript'} 
                              style={vscDarkPlus}
                              customStyle={{ margin: 0, borderRadius: '0 0 0.5rem 0.5rem', fontSize: '0.85rem' }}
                            >
                              {issue.refactor}
                            </SyntaxHighlighter>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Readability Notes */}
              {auditData.feedback?.readability_improvements?.length > 0 && (
                <div className="feedback-card border-success mt-4">
                  <h3 className="text-success flex items-center gap-2"><BookOpen size={18}/> Readability Notes</h3>
                  <div className="flex flex-col gap-4 mt-3">
                    {auditData.feedback.readability_improvements.map((issue, i) => (
                      <div key={i} className="pl-3 border-l-2 border-slate-700 pb-2">
                        <strong className="text-white block mb-1">{issue.title}</strong>
                        <p className="text-slate-300 text-sm mb-3 leading-relaxed">{issue.description}</p>
                        
                        {issue.refactor && (
                          <div className="refactor-box">
                            <div className="refactor-header">
                              <span>Suggested Refactor</span>
                              <span className="uppercase text-indigo-400">{issue.language || 'code'}</span>
                            </div>
                            <SyntaxHighlighter 
                              language={issue.language?.toLowerCase() || 'javascript'} 
                              style={vscDarkPlus}
                              customStyle={{ margin: 0, borderRadius: '0 0 0.5rem 0.5rem', fontSize: '0.85rem' }}
                            >
                              {issue.refactor}
                            </SyntaxHighlighter>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* --- THE GRAND FINALE: COMPLETE REFACTORED CODE --- */}
              {auditData.feedback?.final_refactored_code && (
                <div className="mt-8 pt-8 border-t border-slate-800 animate-in fade-in duration-700">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="text-emerald-400 w-6 h-6" /> 
                    Production-Ready Refactor
                  </h3>
                  <p className="text-slate-400 text-sm mb-4">
                    This unified codebase resolves all identified security vulnerabilities, eliminates O(n^2) bottlenecks, and enforces modern styling conventions.
                  </p>
                  
                  {/* Reuse our Premium IDE Container for the final output! */}
                  <div className="ide-container shadow-2xl shadow-indigo-500/10">
                    <div className="ide-header border-b border-slate-700 bg-[#1e1e2e]">
                      <div className="ide-dots">
                        <div className="dot red"></div>
                        <div className="dot yellow"></div>
                        <div className="dot green"></div>
                      </div>
                      <span className="ml-auto text-xs text-indigo-400 font-mono uppercase tracking-wider font-bold">
                        {auditData.feedback?.language || 'optimized'}
                      </span>
                    </div>
                    
                    <SyntaxHighlighter 
                      language={auditData.feedback?.language?.toLowerCase() || 'javascript'} 
                      style={vscDarkPlus}
                      customStyle={{ margin: 0, padding: '1.5rem', backgroundColor: 'transparent', fontSize: '0.9rem' }}
                    >
                      {auditData.feedback.final_refactored_code}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  
  );
};

export default CodeAuditor;