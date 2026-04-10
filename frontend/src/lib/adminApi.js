import axios from 'axios';

// Backend URL with fallback
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://trade-journal-backend-702893411415.asia-south1.run.app';
const API_URL = `${BACKEND_URL}/api/admin`;

console.log('🌐 Admin API Configuration:', {
  env_var: process.env.REACT_APP_BACKEND_URL,
  backend_url: BACKEND_URL,
  api_url: API_URL
});

// Create axios instance for admin API calls
const adminApi = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add auth token
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🔵 Admin API Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
adminApi.interceptors.response.use(
  (response) => {
    console.log('✅ Admin API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ Admin API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn('🔴 Auth failed - redirecting to login');
      localStorage.removeItem('adminToken');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export default adminApi;
