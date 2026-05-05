// services/requestBuilder.js
// Builds the raw document object passed to Request.create().
// Extracted from createRequest — logic is UNCHANGED.

/**
 * Build the request document object for Request.create().
 *
 * @param {object} params
 * @param {object}      params.body            - parsed req.body
 * @param {string|null} params.userId
 * @param {boolean}     params.isSOS
 * @param {number[]}    params.coordinates     - [lng, lat]
 * @param {object}      params.mediaData
 * @param {string}      params.publicId
 * @param {string}      params.actorType       - 'user' | 'guest'
 * @param {string|null} params.resolvedGuestId
 * @param {object|null} params.emergencyProfileSnapshot
 * @returns {object} requestDoc
 */
const buildRequestDoc = ({
  body,
  userId,
  isSOS,
  coordinates,
  mediaData,
  publicId,
  actorType,
  resolvedGuestId,
  emergencyProfileSnapshot,
}) => {
  const { title, description, category, urgency, address } = body;
  const locationStatus = body.locationStatus || 'available';

  const requestDoc = {
    title: title || (isSOS ? `🚨 SOS — ${(category || 'critical').toUpperCase()}` : undefined),
    description: description || (isSOS
      ? (userId
          ? `Emergency SOS triggered by user`
          : `Automated SOS by guest (${resolvedGuestId || body.guestId})`)
      : undefined),
    category: category || (isSOS ? 'critical' : 'other'),
    urgency: urgency || (isSOS ? 'critical' : 'medium'),
    location: { type: 'Point', coordinates },
    address: address || (isSOS ? 'Location captured via GPS' : undefined),
    isSOS,
    isGuest: !userId,
    locationStatus,
    radius: 5000,
    rebroadcastCount: 0,
    lastBroadcastedAt: new Date(),
    media: mediaData,
    emergencyProfileSnapshot: emergencyProfileSnapshot ?? null,
    // ✅ sequential ID fields
    publicId,
    actorType,
  };

  if (userId) {
    requestDoc.createdBy     = userId;
    requestDoc.requesterType = 'user';
  } else {
    requestDoc.guestId       = resolvedGuestId;
    requestDoc.requesterType = 'guest';
    requestDoc.createdBy     = null;
  }

  return requestDoc;
};

module.exports = { buildRequestDoc };