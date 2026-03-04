// src/components/Login.js
import React from 'react';
import './Login.css';

const Login = () => {
  const handleGithubLogin = () => {
    const clientId = process.env.REACT_APP_GITHUB_CLIENT_ID; 
    
    // Safety net: Alert if the .env variable isn't loaded properly
    if (!clientId) {
      console.error("GitHub Client ID is missing. Please check your frontend/.env file and restart the server.");
      alert("Configuration error: GitHub Client ID is missing.");
      return;
    }
    
    const redirectUri = `${window.location.origin}/login/callback`;
    const scope = 'read:user user:email repo';
    
    // Properly encode the variables so the browser doesn't break the URL string
    const targetUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = targetUrl;
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>DevPulse</h1>
        <p>Command Center for Developers</p>
        <button onClick={handleGithubLogin} className="github-btn">
          Log in with GitHub
        </button>
      </div>
    </div>
  );
};

export default Login;