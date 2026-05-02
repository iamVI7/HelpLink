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

// 🔁 Always read fresh token from localStorage on every request
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
// ✅ AFTERCARE BRIDGE APIs
// ─────────────────────────────────────────────

/**
 * Send aftercare data to UniCare.
 * NOW accepts an optional payload object (consent flags + userNote).
 * If no payload is passed the call still works exactly as before (backward compat).
 *
 * @param {string} id       - HelpLink request MongoDB _id
 * @param {object} payload  - consent flags + userNote built by AftercareButton
 */
export const sendToAftercare = (id, payload = {}) =>
  api.post(`/requests/${id}/aftercare`, payload);

/**
 * Send the user's full medical profile to UniCare.
 * Only called after explicit user consent. Requires JWT.
 */
export const sendMedicalProfile = () =>
  api.post('/requests/aftercare/profile');

// ─────────────────────────────────────────────
// ✅ Aftercare user-id helper (unchanged)
// ─────────────────────────────────────────────
export const storeHlUserId = (userId) => {
  if (userId) localStorage.setItem('hlUserId', String(userId));
};

export default api;