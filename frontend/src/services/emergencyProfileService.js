import api from './api';

// ─────────────────────────────────────────────────────────────────────────────
// emergencyProfileService.js
//
// Clean API layer for the Emergency Profile feature.
// All functions return { data } on success or throw — callers handle errors.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the current user's emergency profile.
 * Returns null (not an error) when the user has no profile yet (404).
 */
export const getEmergencyProfile = async () => {
  try {
    const res = await api.get('/emergency-profile');
    return res.data?.profile ?? res.data ?? null;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

/**
 * Create or fully replace the current user's emergency profile.
 * @param {Object} profileData — plain object matching EmergencyProfile schema
 */
export const updateEmergencyProfile = async (profileData) => {
  const res = await api.put('/emergency-profile', profileData);
  return res.data?.profile ?? res.data ?? null;
};