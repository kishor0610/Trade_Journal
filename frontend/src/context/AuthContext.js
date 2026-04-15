import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password });
    const { access_token, user: userData, subscription } = response.data;
    
    localStorage.setItem('token', access_token);
    
    // Store subscription data immediately to avoid loading delay
    if (subscription) {
      localStorage.setItem('subscription__data', JSON.stringify(subscription));
      // Notify SubscriptionContext to pick up the new data without an API call
      window.dispatchEvent(new CustomEvent('subscription:refresh'));
    }
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
    
    return userData;
  };

  const register = async (email, password, name, referral_code = null) => {
    const payload = { email, password, name };
    if (referral_code) {
      payload.referral_code = referral_code;
    }
    const response = await axios.post(`${API_URL}/auth/register`, payload);
    const { access_token, user: userData, subscription } = response.data;
    
    localStorage.setItem('token', access_token);
    
    // Store subscription data immediately for new registrations
    if (subscription) {
      localStorage.setItem('subscription__data', JSON.stringify(subscription));
      // Notify SubscriptionContext to pick up the new data without an API call
      window.dispatchEvent(new CustomEvent('subscription:refresh'));
    }
    
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setToken(access_token);
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('subscription__data'); // Clear subscription data on logout
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
