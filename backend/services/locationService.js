// services/locationService.js
// Handles all location parsing, normalization, and coordinate extraction.
// Extracted from createRequest in requestController.js — logic is UNCHANGED.

/**
 * Parse location from request body.
 * FIX 6 — parse location string → object if needed.
 * @param {object} body - req.body
 * @returns {object} parsed location object
 */
const parseLocationFromBody = (body) => {
  if (typeof body.location === 'string') {
    return JSON.parse(body.location);
  }
  return body.location;
};

/**
 * Normalize location into GeoJSON [lng, lat] coordinates.
 * FIX 6 — standardize location: always store as GeoJSON Point [lng, lat].
 *
 * @param {boolean} isSOS
 * @param {object} location - parsed location object
 * @returns {{ coordinates: [number, number] } | null}
 *   Returns null if coordinates cannot be resolved (caller must 400).
 */
const resolveCoordinates = (isSOS, location) => {
  if (isSOS && location && typeof location.lat === 'number' && typeof location.lng === 'number') {
    return [location.lng, location.lat];
  }
  if (location && location.coordinates && location.coordinates.length === 2) {
    return location.coordinates;
  }
  return null;
};

module.exports = { parseLocationFromBody, resolveCoordinates };