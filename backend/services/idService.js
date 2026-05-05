// services/idService.js
// Thin wrapper around utils/idGenerator.
// Extracted from createRequest — logic is UNCHANGED.

const { generateRequestId, generateGuestId } = require('../utils/idGenerator');

/**
 * Generate publicId and resolve guestId for a new request.
 *
 * @param {string|null} userId
 * @param {string|null} rawGuestId  - guestId as received from req.body
 * @returns {Promise<{ publicId: string, resolvedGuestId: string|null, actorType: string }>}
 */
const generateIds = async (userId, rawGuestId) => {
  const publicId = await generateRequestId();

  if (userId) {
    return { publicId, resolvedGuestId: null, actorType: 'user' };
  }

  // Use an HL-GUEST ID as the canonical guest identifier when the client
  // sent a raw UUID or nothing useful — keeps guest IDs human-readable too.
  const trimmedGuestId = rawGuestId && rawGuestId.trim() ? rawGuestId.trim() : null;
  const isAlreadyStructured = trimmedGuestId && trimmedGuestId.startsWith('HL-GUEST-');
  const resolvedGuestId = isAlreadyStructured
    ? trimmedGuestId
    : await generateGuestId();

  return { publicId, resolvedGuestId, actorType: 'guest' };
};

module.exports = { generateIds };