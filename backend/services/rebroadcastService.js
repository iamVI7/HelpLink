const Request = require('../models/Request');
const User = require('../models/User');
const { getSocketIO, getUserSocketId } = require('../socket');
const { RADIUS_STEPS, REBROADCAST_INTERVAL } = require('../utils/rebroadcastConfig');
const { calculateDistance, calculateETA } = require('../utils/distance');

const rebroadcastRequests = async () => {
  try {
    const now = Date.now();
    const io = getSocketIO();

    const pendingRequests = await Request.find({
      status: 'open',
      acceptedBy: null,
      isDeleted: false
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

      // 🔥 UPDATE RADIUS
      req.radius = RADIUS_STEPS[nextIndex];
      req.rebroadcastCount += 1;
      req.lastBroadcastedAt = new Date();
      await req.save();

      // FIX: MongoDB requires $near to be the ONLY operator on the location
      // field — $exists and $ne alongside $near causes a BadValue error.
      // The location guard above already ensures location is valid, so
      // $exists/$ne checks are redundant here anyway.
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

      // 🔥 SOCKET EMIT
      nearbyUsers.forEach(user => {
        const socketId = getUserSocketId(user._id.toString());

        if (socketId && user.location?.coordinates) {
          const [userLng, userLat] = user.location.coordinates;
          const [reqLng, reqLat] = req.location.coordinates;

          const distance = calculateDistance(userLat, userLng, reqLat, reqLng);
          const eta = calculateETA(distance);

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
    }

  } catch (err) {
    console.error('Rebroadcast error:', err);
  }
};

module.exports = rebroadcastRequests;