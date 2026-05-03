// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Callback from './components/Callback';
import Dashboard from './components/Dashboard';
import ComponentLibrary from './components/ComponentLibrary';
import CodeAuditor from './components/CodeAuditor';
import './App.css'; 
import LandingPage from './components/LandingPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />}/>
        <Route path="/login" element={<Login />} />
        <Route path="/login/callback" element={<Callback />} />
        <Route path="/dashboard" element={<Dashboard />}  />
        <Route path="/components" element={<ComponentLibrary />} />
        <Route path="/auditor" element={<CodeAuditor />} />
      </Routes>
    </Router>
  );
}

export default App;