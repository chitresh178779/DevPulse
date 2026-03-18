// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api/', 
    
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

// Intercept every request to automatically attach the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If the token is invalid or expired, clear it and kick user to login
      localStorage.removeItem('access_token');
      window.location.href = '/'; 
    }
    return Promise.reject(error);
  }
);

export default api;