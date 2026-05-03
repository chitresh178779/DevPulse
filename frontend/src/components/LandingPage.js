import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, ShieldCheck, Blocks, ArrowRight, Github } from 'lucide-react';
import './LandingPage.css'; // <-- Importing our new CSS!

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
    

      {/* --- NAVBAR --- */}
      <nav className="landing-nav">
        <div className="nav-logo">
          DevPulse
        </div>
        <div className="nav-links">
          <a href="#problem">The Problem</a>
          <a href="#features">Architecture</a>
        </div> 
        <button 
          onClick={() => navigate('/login')}
          className="nav-btn"
        >
          Access Command Center
        </button>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="hero-section">
        <div className="hero-badge">
          Built for Uninterrupted Flow State
        </div>

        <h1 className="hero-title">
          Never Lose Your <br />
          <span className="hero-title-highlight">Mental Context</span> Again.
        </h1>
        
        <p className="hero-subtitle">
          DevPulse is an AI-powered IDE wrapper that serializes your volatile workspace state. When you return from an interruption, our LLM synthesizes a "Welcome Back" briefing so you can instantly resume your exact train of thought.
        </p>

        <button 
          onClick={() => navigate('/login')}
          className="hero-btn"
        >
          Connect with GitHub <Github size={20} />
        </button>
      </section>

      {/* --- THE PROBLEM SECTION --- */}
      <section id="problem" className="problem-section">
        <div className="problem-content">
          <h2 className="problem-title">The Cost of Context Switching</h2>
          <p className="problem-text">
            Modern software engineering is fragmented. You paste code into one window, test Regex in another, and decode JWTs in a third. When you close your laptop, that intricate web of temporary GUI state is destroyed. <strong>DevPulse was built to capture that exact moment in time.</strong>
          </p>
        </div>
      </section>

      {/* --- THE SOLUTIONS / PATENT FEATURES --- */}
      <section id="features" className="features-section">
        <div className="feature-grid">
          
          {/* Feature 1 */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <BrainCircuit size={28} />
            </div>
            <h3 className="feature-title">AI Context Synthesis</h3>
            <p className="feature-desc">
              We don't just save your code. We serialize your entire UI state and route it through an LLM to generate a natural-language briefing of your debugging intent when you log back in.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <Blocks size={28} />
            </div>
            <h3 className="feature-title">Auto-Provisioning Utilities</h3>
            <p className="feature-desc">
              Paste a monolithic block of code, and DevPulse automatically parses the strings to provision the exact micro-utilities you need (JSON, Cron, JWT), binding them bidirectionally to your master code.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <ShieldCheck size={28} />
            </div>
            <h3 className="feature-title">Zero-Trust BYOK Proxy</h3>
            <p className="feature-desc">
              Enterprise code requires enterprise security. Our Bring Your Own Key (BYOK) architecture ensures your proprietary API tokens and codebases are never stored unencrypted on our intermediate servers.
            </p>
          </div>

        </div>
      </section>

      {/* --- BOTTOM CTA --- */}
      <section className="cta-section">
        <h2 className="cta-title">Ready to upgrade your workflow?</h2>
        <button 
          onClick={() => navigate('/login')}
          className="cta-btn"
        >
          Initialize Workspace <ArrowRight size={20} />
        </button>
      </section>

    </div>
  );
};

export default LandingPage;