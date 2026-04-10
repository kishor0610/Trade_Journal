import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api/admin`;

// Get admin token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

// ============ USER MANAGEMENT ============

export const activateUser = async (userId) => {
  const response = await axios.post(`${API_URL}/users/${userId}/activate`, {}, getAuthHeaders());
  return response.data;
};

export const deactivateUser = async (userId) => {
  const response = await axios.post(`${API_URL}/users/${userId}/deactivate`, {}, getAuthHeaders());
  return response.data;
};

export const sendUserEmail = async (userId, subject, message) => {
  const response = await axios.post(`${API_URL}/users/${userId}/send-email`, {
    subject,
    message
  }, getAuthHeaders());
  return response.data;
};

export const resetUserPassword = async (userId) => {
  const response = await axios.post(`${API_URL}/users/${userId}/reset-password`, {}, getAuthHeaders());
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await axios.delete(`${API_URL}/users/${userId}`, getAuthHeaders());
  return response.data;
};

export const updateUser = async (userId, updates) => {
  const response = await axios.patch(`${API_URL}/users/${userId}`, updates, getAuthHeaders());
  return response.data;
};

// ============ SUBSCRIPTION MANAGEMENT ============

export const extendSubscription = async (userId, days) => {
  const response = await axios.patch(`${API_URL}/subscriptions/${userId}/extend`, {
    days
  }, getAuthHeaders());
  return response.data;
};

export const changeUserPlan = async (userId, plan) => {
  const response = await axios.patch(`${API_URL}/subscriptions/${userId}/change-plan`, {
    plan
  }, getAuthHeaders());
  return response.data;
};

export const activateSubscription = async (userId) => {
  const response = await axios.post(`${API_URL}/subscriptions/${userId}/activate`, {}, getAuthHeaders());
  return response.data;
};

export const deactivateSubscription = async (userId) => {
  const response = await axios.post(`${API_URL}/subscriptions/${userId}/deactivate`, {}, getAuthHeaders());
  return response.data;
};

// ============ MT5 MANAGEMENT ============

export const extendMT5Account = async (accountId, days) => {
  const response = await axios.patch(`${API_URL}/mt5/${accountId}/extend`, {
    days
  }, getAuthHeaders());
  return response.data;
};

export const activateMT5Account = async (accountId) => {
  const response = await axios.patch(`${API_URL}/mt5/${accountId}/activate`, {}, getAuthHeaders());
  return response.data;
};

export const deactivateMT5Account = async (accountId) => {
  const response = await axios.patch(`${API_URL}/mt5/${accountId}/deactivate`, {}, getAuthHeaders());
  return response.data;
};

// ============ PAYMENTS & REFUNDS ============

export const refundPayment = async (paymentId, reason) => {
  const response = await axios.post(`${API_URL}/payments/${paymentId}/refund`, {
    payment_id: paymentId,
    reason
  }, getAuthHeaders());
  return response.data;
};

// ============ STATS & ANALYTICS ============

export const getAdminStats = async () => {
  const response = await axios.get(`${API_URL}/stats`, getAuthHeaders());
  return response.data;
};

export const getAllUsers = async (skip = 0, limit = 50) => {
  const response = await axios.get(`${API_URL}/users?skip=${skip}&limit=${limit}`, getAuthHeaders());
  return response.data;
};

export const getActivityLogs = async () => {
  const response = await axios.get(`${API_URL}/activity`, getAuthHeaders());
  return response.data;
};

export const getAllMT5Accounts = async () => {
  const response = await axios.get(`${API_URL}/database/mt5-accounts/all`, getAuthHeaders());
  return response.data;
};

export const getAllPayments = async () => {
  const response = await axios.get(`${API_URL}/database/payments/all`, getAuthHeaders());
  return response.data;
};

export default {
  // User Management
  activateUser,
  deactivateUser,
  sendUserEmail,
  resetUserPassword,
  deleteUser,
  updateUser,
  
  // Subscription Management
  extendSubscription,
  changeUserPlan,
  activateSubscription,
  deactivateSubscription,
  
  // MT5 Management
  extendMT5Account,
  activateMT5Account,
  deactivateMT5Account,
  
// Payments
  refundPayment,
  
  // Stats
  getAdminStats,
  getAllUsers,
  getActivityLogs,
  getAllMT5Accounts,
  getAllPayments
};
