// services/sosService.js
// All SOS-specific business logic:
//   - active request guard
//   - duplicate SOS guard (15 s)
//   - cooldown enforcement (60 s)
// Extracted from createRequest — logic is UNCHANGED.

const Request = require('../models/Request');

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const SOS_COOLDOWN = 60 * 1000; // 60 seconds

// ── GUIDANCE MAP ──────────────────────────────────────────────────────────────
const guidanceMap = {
  medical: [
    'Stay conscious and keep breathing slowly',
    'Apply firm pressure to any bleeding wound',
    'Do not move if you suspect a spinal injury',
    'Loosen tight clothing around neck and chest',
    'Keep the person warm and calm until help arrives',
  ],
  accident: [
    'Move to a safe area away from traffic',
    'Turn on hazard lights if in a vehicle',
    'Check yourself and others for injuries',
    'Do not move an injured person unless in immediate danger',
    'Stay on the line with emergency services',
  ],
  danger: [
    'Move to a crowded, well-lit public place immediately',
    'Avoid confrontation — your safety is priority',
    'Call emergency services when it is safe to do so',
    'Attract attention by making noise if threatened',
    'Lock yourself in a secure location if possible',
  ],
  critical: [
    'Stay calm — panicking increases risk',
    'Help is on the way — keep your phone active',
    'Stay in your current location unless unsafe',
    'Signal your location (wave, flashlight, noise)',
    'Keep airways clear and breathe steadily',
  ],
  emergency: [
    'Call emergency services immediately if not done',
    'Keep bystanders at a safe distance',
    'Stay with the affected person and monitor breathing',
    'Do not give food or water to an unconscious person',
    'Help is dispatched — stay visible and accessible',
  ],
  default: [
    'Stay calm and assess your surroundings',
    'Keep your phone charged and accessible',
    'Help has been notified — stay put',
    'Signal your location clearly',
    'Contact a trusted person nearby',
  ],
};

/**
 * Build the cooldown query object safely.
 * Mirrors buildCooldownQuery from the original controller.
 *
 * @param {string|null} userId
 * @param {string|null} bodyGuestId - raw guestId from req.body
 * @returns {object|null}
 */
const buildCooldownQuery = (userId, bodyGuestId) => {
  if (userId) {
    return { isSOS: true, createdBy: userId };
  }
  const guestId = bodyGuestId;
  if (guestId && typeof guestId === 'string' && guestId.trim() !== '') {
    return { isSOS: true, guestId: guestId.trim() };
  }
  return null;
};

/**
 * Check for an existing active (open/accepted) SOS for this user/guest.
 * FIX 5 — active request guard.
 *
 * @param {string|null} userId
 * @param {string|null} guestId
 * @returns {Promise<object|null>} existing request doc or null
 */
const findActiveSOSRequest = async (userId, guestId) => {
  return Request.findOne({
    ...(userId ? { createdBy: userId } : { guestId }),
    status: { $in: ['open', 'accepted'] },
    isSOS: true,
    isDeleted: false,
  });
};

/**
 * Check for a very recent SOS (within 15 s) to guard against double-taps.
 *
 * @param {string|null} userId
 * @param {string|null} guestId
 * @returns {Promise<object|null>} recent request doc or null
 */
const findRecentSOSRequest = async (userId, guestId) => {
  return Request.findOne({
    ...(userId ? { createdBy: userId } : { guestId }),
    isSOS: true,
    createdAt: { $gte: new Date(Date.now() - 15000) },
  });
};

/**
 * Enforce the 60-second SOS cooldown.
 *
 * @param {string|null} userId
 * @param {string|null} bodyGuestId
 * @returns {Promise<{ blocked: boolean, remaining?: number }>}
 */
const checkSOSCooldown = async (userId, bodyGuestId) => {
  const cooldownQuery = buildCooldownQuery(userId, bodyGuestId);
  if (!cooldownQuery) return { blocked: false };

  const lastSOS = await Request.findOne(cooldownQuery).sort({ createdAt: -1 });
  if (!lastSOS) return { blocked: false };

  const diff = Date.now() - new Date(lastSOS.createdAt).getTime();
  if (diff < SOS_COOLDOWN) {
    const remaining = Math.ceil((SOS_COOLDOWN - diff) / 1000);
    return { blocked: true, remaining };
  }
  return { blocked: false };
};

/**
 * Get guidance tips for a given category.
 *
 * @param {string} category
 * @returns {string[]}
 */
const getGuidance = (category) => guidanceMap[category] || guidanceMap.default;

module.exports = {
  guidanceMap,
  findActiveSOSRequest,
  findRecentSOSRequest,
  checkSOSCooldown,
  getGuidance,
};