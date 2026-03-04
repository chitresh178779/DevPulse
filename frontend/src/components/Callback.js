// src/components/Callback.js
import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const Callback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Create a ref shield to track if we've already fired the request
  const hasFired = useRef(false); 

  useEffect(() => {
    // If the shield is up, stop immediately. Don't run the second time.
    if (hasFired.current) return; 
    
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get('code');

    if (code) {
      // Put the shield up so the next Strict Mode render can't pass
      hasFired.current = true; 

     api.post('auth/github/login/', { code: code })
      .then(response => {
        // Grab the token from dj-rest-auth and save it to the browser's local storage
        const token = response.data.access_token || response.data.access;
        if (token) {
            localStorage.setItem('access_token', token);
        }
        navigate('/dashboard'); 
      })
      .catch(error => {
        console.error("Login failed:", error.response?.data || error.message);
        navigate('/'); 
      });
    }
  }, [location, navigate]);

  return (
    <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <h2 style={{ color: '#38bdf8' }}>Securing GitHub Connection...</h2>
    </div>
  );
};

export default Callback;