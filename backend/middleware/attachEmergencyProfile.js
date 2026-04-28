// ─────────────────────────────────────────────────────────────────────────────
// attachEmergencyProfile.js
//
// RULES:
//  • Always calls next() — NEVER blocks the request
//  • Guest users (no req.user) → req.emergencyProfileSnapshot = null
//  • Any error → logs silently, sets null, calls next()
// ─────────────────────────────────────────────────────────────────────────────

const { getEmergencyProfileSnapshot } = require('../services/emergencyProfileService');

const attachEmergencyProfile = async (req, res, next) => {
  // Default to null — safe for guests and error cases
  req.emergencyProfileSnapshot = null;

  // Only attempt fetch when a logged-in user is present
  if (req.user && req.user._id) {
    try {
      req.emergencyProfileSnapshot = await getEmergencyProfileSnapshot(req.user._id);
    } catch (err) {
      // Swallow error — never block request flow
      console.error('[attachEmergencyProfile] Unexpected error:', err.message);
    }
  }

  next();
};

module.exports = attachEmergencyProfile;