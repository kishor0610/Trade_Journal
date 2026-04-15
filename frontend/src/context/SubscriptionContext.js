import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const FALLBACK_BACKEND_URL = 'https://trade-journal-backend-702893411415.asia-south1.run.app';
const rawBackendUrl = (process.env.REACT_APP_BACKEND_URL || FALLBACK_BACKEND_URL).trim();
const BACKEND_URL = rawBackendUrl.replace(/\/$/, '').replace(/\/api$/, '');
const API_URL = `${BACKEND_URL}/api`;

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  // Initialize from localStorage to avoid loading delay on fresh login
  const getCachedSubscription = () => {
    try {
      const cached = localStorage.getItem('subscription__data');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };
  
  const [subscription, setSubscription] = useState(getCachedSubscription());
  const [loading, setLoading] = useState(!getCachedSubscription()); // Skip loading if cached data exists

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await axios.get(`${API_URL}/subscriptions/my-subscription`);
      setSubscription(response.data);
      
      // Cache the subscription data
      localStorage.setItem('subscription__data', JSON.stringify(response.data));
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  // Listen for login/register events and instantly apply cached subscription data
  useEffect(() => {
    const handleSubscriptionRefresh = () => {
      const cached = getCachedSubscription();
      if (cached) {
        setSubscription(cached);
        setLoading(false);
      }
    };
    window.addEventListener('subscription:refresh', handleSubscriptionRefresh);
    return () => window.removeEventListener('subscription:refresh', handleSubscriptionRefresh);
  }, []);

  useEffect(() => {
    const refreshOnFocus = () => {
      fetchSubscription();
    };

    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchSubscription();
      }
    };

    const intervalId = setInterval(() => {
      fetchSubscription();
    }, 60000);

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
    };
  }, []);

  const isActive = subscription?.is_active || false;
  const isTrial = subscription?.subscription_status === 'trial';
  const isExpired = subscription?.subscription_status === 'expired';

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      isActive,
      isTrial,
      isExpired,
      loading,
      refreshSubscription: fetchSubscription
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
