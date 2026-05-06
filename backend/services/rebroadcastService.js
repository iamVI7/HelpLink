// services/rebroadcastService.js
// Periodically expands the search radius for open, unaccepted requests and
// re-notifies newly reachable helpers.
//
// ✅ NEW: after each rebroadcast wave, calls _persistAndEmitActivityUpdate so
//         the guest's activity feed reflects the real running notified count
//         and the nearest helper distance without any fake timers.
//
// All existing radius-expansion and socket-emission logic is UNCHANGED.

const Request  = require('../models/Request');
const User     = require('../models/User');
const { getSocketIO, getUserSocketId } = require('../socket');
const { RADIUS_STEPS, REBROADCAST_INTERVAL } = require('../utils/rebroadcastConfig');
const { calculateDistance, calculateETA }    = require('../utils/distance');

// ✅ Reuse the shared activity-update helper from notificationService
// so the DB write + socket emit logic stays in one place.
const { _persistAndEmitActivityUpdate } = require('./notificationService');

const rebroadcastRequests = async () => {
  try {
    const now = Date.now();
    const io  = getSocketIO();

    const pendingRequests = await Request.find({
      status:     'open',
      acceptedBy: null,
      isDeleted:  false,
    });

    for (let req of pendingRequests) {
      if (!req.lastBroadcastedAt) {
        req.lastBroadcastedAt = new Date();
        await req.save();
        continue;
      }

      // Guard: skip if location is missing or malformed
      if (!req.location || !req.location.coordinates?.length) continue;

      const timeDiff = now - new Date(req.lastBroadcastedAt).getTime();
      if (timeDiff < REBROADCAST_INTERVAL) continue;

      const nextIndex = req.rebroadcastCount + 1;
      if (nextIndex >= RADIUS_STEPS.length) continue;
      if (req.radius === RADIUS_STEPS[nextIndex]) continue;

      // ── Update radius (existing logic — UNCHANGED) ──────────────────────
      req.radius            = RADIUS_STEPS[nextIndex];
      req.rebroadcastCount += 1;
      req.lastBroadcastedAt = new Date();
      await req.save();

      // ── Query newly reachable users (existing logic — UNCHANGED) ─────────
      const nearbyUsers = await User.find({
        ...(req.createdBy ? { _id: { $ne: req.createdBy } } : {}),
        isAvailable: true,
        location: {
          $near: {
            $geometry: req.location,
            $maxDistance: req.radius,
          },
        },
      }).select('_id location').lean();

      // ── Notify helpers (existing socket emit — UNCHANGED) ─────────────────
      nearbyUsers.forEach(user => {
        const socketId = getUserSocketId(user._id.toString());
        if (socketId && user.location?.coordinates) {
          const [userLng, userLat] = user.location.coordinates;
          const [reqLng,  reqLat]  = req.location.coordinates;
          const distance = calculateDistance(userLat, userLng, reqLat, reqLng);
          const eta      = calculateETA(distance);

          io.to(socketId).emit('new_request', {
            request: {
              ...req.toObject(),
              isRebroadcast: true,
              distance,
              eta,
            },
            message: `🔁 Expanded search radius: ${req.radius / 1000} km`,
          });
        }
      });

      console.log(
        `🔁 Rebroadcast ${req._id} → ${req.radius / 1000}km | users: ${nearbyUsers.length}`
      );

      // ── ✅ NEW: Update activity feed after this rebroadcast wave ──────────
      // _persistAndEmitActivityUpdate increments notifiedCount by the number
      // of users in THIS wave (not cumulative) and updates nearestHelperDistance.
      // It also emits sos_activity_update to the guest's room and request room.
      // Errors inside are caught and logged — they never abort the loop.
      if (req.isSOS && req.location?.coordinates) {
        await _persistAndEmitActivityUpdate(
          req,
          nearbyUsers,
          req.location.coordinates,
          io
        );
      }
      // ── END: Activity feed update ─────────────────────────────────────────
    }

  } catch (err) {
    console.error('Rebroadcast error:', err);
  }
};

module.exports = rebroadcastRequests;