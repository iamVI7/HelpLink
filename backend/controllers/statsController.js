const User = require('../models/User');
const Request = require('../models/Request');

exports.getStatsOverview = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const hasLocation = lat !== undefined && lng !== undefined
      && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

    const activeThreshold = new Date(Date.now() - 10 * 1000);

    // Exclude the current logged-in user if token provided
    let excludeUserId = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        excludeUserId = decoded.id || decoded._id;
      }
    } catch {
      // Not logged in or invalid token — skip exclusion
    }

    // Base filter — always active within time window
    const baseFilter = {
      lastSeen: { $gte: activeThreshold },
      role: { $ne: 'admin' },
      ...(excludeUserId ? { _id: { $ne: excludeUserId } } : {}),
    };

    // If lat/lng provided, add a 5km geo filter using the 2dsphere index
    const locationFilter = hasLocation
      ? {
          location: {
            $geoWithin: {
              $centerSphere: [
                [parseFloat(lng), parseFloat(lat)], // GeoJSON is [lng, lat]
                5 / 6371,                            // 5km in radians
              ],
            },
          },
        }
      : {};

    const filter = { ...baseFilter, ...locationFilter };

    const [activeUsers, totalActive] = await Promise.all([
      User.find(filter).select('name avatar').limit(6),
      User.countDocuments(filter),
    ]);

    // Stats (unaffected by location — these are global)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [todayHelps, weekHelps] = await Promise.all([
      Request.countDocuments({ status: 'completed', updatedAt: { $gte: today } }),
      Request.countDocuments({ status: 'completed', updatedAt: { $gte: weekAgo } }),
    ]);

    res.json({
      activeUsers,
      totalActive,
      todayHelps,
      weekHelps,
      isLocationScoped: hasLocation, // StatsPill already reads this
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Stats fetch failed' });
  }
};