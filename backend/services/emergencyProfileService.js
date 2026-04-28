// ─────────────────────────────────────────────────────────────────────────────
// emergencyProfileService.js
//
// RULES:
//  • Never throws — always returns snapshot object or null
//  • No side effects — read-only
//  • Returns only plain JS objects (lean), never Mongoose documents
// ─────────────────────────────────────────────────────────────────────────────

const EmergencyProfile = require('../models/EmergencyProfile');
const User             = require('../models/User');

/**
 * getEmergencyProfileSnapshot(userId)
 *
 * Builds a self-contained snapshot of a user's emergency profile
 * combined with relevant user fields (name, phone, bloodGroup, etc.).
 *
 * @param  {string|ObjectId} userId
 * @returns {Object|null}  Plain snapshot object, or null if anything fails.
 */
const getEmergencyProfileSnapshot = async (userId) => {
  if (!userId) return null;

  try {
    // ── Fetch user basics (name, phone, rating, address) ──────────────────
    const user = await User.findById(userId)
      .select('name phoneNumber rating totalHelpGiven isVerified address')
      .lean();

    if (!user) return null;

    // ── Fetch emergency profile (may not exist — that's fine) ─────────────
    const profile = await EmergencyProfile.findOne({ userId })
      .select('-__v -createdAt -updatedAt')
      .lean();

    // ── Build snapshot — merge user basics + profile fields ───────────────
    const snapshot = {
      // From User
      name:           user.name             ?? null,
      phoneNumber:    user.phoneNumber       ?? null,
      rating:         user.rating           ?? 0,
      totalHelpGiven: user.totalHelpGiven    ?? 0,
      isVerified:     user.isVerified        ?? false,
      address:        user.address           ?? null,

      // From EmergencyProfile (all optional — null if no profile)
      bloodGroup:           profile?.bloodGroup           ?? null,
      allergies:            profile?.allergies            ?? [],
      medicalConditions:    profile?.medicalConditions    ?? [],
      medications:          profile?.medications          ?? [],
      disabilityInfo:       profile?.disabilityInfo       ?? null,
      emergencyContacts:    profile?.emergencyContacts    ?? [],
      specialInstructions:  profile?.specialInstructions  ?? null,

      // Metadata
      capturedAt: new Date().toISOString(),
    };

    return snapshot;

  } catch (err) {
    // ── NEVER crash the request — log and return null ─────────────────────
    console.error('[emergencyProfileService] Failed to build snapshot:', err.message);
    return null;
  }
};

module.exports = { getEmergencyProfileSnapshot };