import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// ✅ Set token synchronously at module load — before any component mounts
const storedToken = localStorage.getItem('token');
if (storedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

// 🔁 MODIFIED (FIX 8) — always read fresh token from localStorage on every request
// ❌ REMOVED: const alreadySet = api.defaults.headers.common['Authorization'];
// ❌ REMOVED: if (!alreadySet) { ... } guard that caused stale token issues
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR — log 401s only, don't touch localStorage
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized on:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────
// SOS API
// ─────────────────────────────────────────────
export const createSOS = (data) => api.post('/requests/sos', data);

// ─────────────────────────────────────────────
// REQUEST APIs
// ─────────────────────────────────────────────
export const createRequest         = (data)     => api.post('/requests', data);
export const getNearbyRequests     = (params)   => api.get('/requests/nearby', { params });
export const getMyRequests         = ()         => api.get('/requests/my-requests');
export const getMyAcceptedRequests = ()         => api.get('/requests/my-accepted');
export const acceptRequest         = (id)       => api.patch(`/requests/${id}/accept`);
export const completeRequest       = (id)       => api.patch(`/requests/${id}/complete`);
export const rateHelper            = (id, data) => api.post(`/requests/${id}/rate`, data);
// ✅ update / enhance a request
export const updateRequest         = (id, data) => api.put(`/requests/${id}`, data);

// ─────────────────────────────────────────────
// ADMIN APIs
// ─────────────────────────────────────────────
export const getAllRequests      = ()   => api.get('/requests/admin/all');
export const deleteRequestAdmin = (id) => api.patch(`/requests/admin/${id}/delete`);

// ─────────────────────────────────────────────
// NEARBY USERS / STATS
// ─────────────────────────────────────────────
export const getStatsOverview = () => api.get('/stats/overview');

export const getNearbyUsers = (lat, lng) =>
  api.get('/users/nearby', { params: { lat, lng } });

// ─────────────────────────────────────────────
// OTP APIs
// ─────────────────────────────────────────────
export const sendOTP   = (phoneNumber)      => api.post('/auth/send-otp', { phoneNumber });
export const verifyOTP = (phoneNumber, otp) => api.post('/auth/verify-otp', { phoneNumber, otp });

// ─────────────────────────────────────────────
// ✅ NEW — AFTERCARE BRIDGE APIs
// sendToAftercare  : works for both guests and logged-in users
// sendMedicalProfile: only called after explicit user consent (logged-in only)
// ─────────────────────────────────────────────

/**
 * Send basic incident data to UniCare.
 * Works for both guests (no token) and logged-in users (token sent automatically).
 * @param {string} id - The request / SOS id
 */
export const sendToAftercare = (id) =>
  api.post(`/requests/${id}/aftercare`);

/**
 * Send the user's full medical profile to UniCare.
 * MUST only be called after the user explicitly clicks "Yes, import my profile".
 * Requires a valid JWT — guests cannot call this.
 */
export const sendMedicalProfile = () =>
  api.post('/requests/aftercare/profile');

export default api;