import React, { useState, useEffect } from 'react';
import { Github, Star, AlertCircle, TrendingUp, TrendingDown, Clock, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

// Helper component for the SVG Ring
const ScoreRing = ({ score }) => {
  // Determine color based on score thresholds
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const strokeDasharray = `${score}, 100`;

  return (
    <svg viewBox="0 0 36 36" className="circular-chart" style={{ width: '60px', height: '60px' }}>
      <path className="circle-bg"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      <path className="circle"
        stroke={color}
        strokeDasharray={strokeDasharray}
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
      <text x="18" y="20.35" className="percentage">{score}</text>
    </svg>
  );
};

const RepoAnalytics = () => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('analytics/repos/')
      .then(res => {
        setRepos(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch analytics", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="analytics-grid">
        {/* Render 6 skeleton cards to match our API request */}
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div className="repo-card" key={`skeleton-${n}`}>
            
            {/* Header Skeleton */}
            <div>
              <div className="skeleton-pulse skel-title"></div>
              <div className="skeleton-pulse skel-meta"></div>
            </div>

            {/* Scores Skeleton */}
            <div className="skeleton-pulse skel-box"></div>

            {/* Recovery Steps Skeleton */}
            <div style={{ marginTop: '10px' }}>
              <div className="skeleton-pulse skel-text-line"></div>
              <div className="skeleton-pulse skel-text-line"></div>
              <div className="skeleton-pulse skel-text-line short"></div>
            </div>
            
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="analytics-grid">
      {repos.map(repo => {
        const scoreDiff = repo.future_score - repo.health_score;
        const isTrendingUp = scoreDiff >= 0;

        return (
          <div className="repo-card" key={repo.id}>
            
            {/* Header Area */}
            <div className="repo-header">
              <div>
                <h3 className="repo-title">
                  <Github size={18} />
                  <a href={repo.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {repo.name}
                  </a>
                </h3>
                <div className="repo-meta">
                  <span className="meta-item"><span className="status-dot" style={{ background: '#3b82f6'}}></span>{repo.language}</span>
                  <span className="meta-item"><Star size={14} /> {repo.stars}</span>
                  <span className="meta-item"><AlertCircle size={14} /> {repo.issues} Issues</span>
                </div>
              </div>
              <div className="meta-item" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <Clock size={14} /> {repo.days_inactive}d ago
              </div>
            </div>

            {/* Scores Area */}
            <div className="scores-container">
              <div className="score-box">
                <ScoreRing score={repo.health_score} />
                <div className="score-details">
                  <h4>Current Health</h4>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Based on tech debt</span>
                </div>
              </div>
              
              <div className="score-box" style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '24px' }}>
                <div className="score-details">
                  <h4>30-Day Projection</h4>
                  <div className="trend-indicator" style={{ color: isTrendingUp ? '#10b981' : '#ef4444' }}>
                    {isTrendingUp ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    <span style={{ fontSize: '1.5rem' }}>{repo.future_score}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recovery Steps Checklist */}
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '12px' }}>Action Items</h4>
              <ul className="recovery-list">
                {repo.recovery_steps.map((step, index) => (
                  <li className="recovery-item" key={index}>
                    {step.includes("perfectly optimized") ? (
                      <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        );
      })}
    </div>
  );
};

export default RepoAnalytics;