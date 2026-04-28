const User = require('../models/User');
const Request = require('../models/Request');

exports.getStatsOverview = async (req, res) => {
  try {
    // Active users
    const activeThreshold = new Date(Date.now() - 10 * 1000); // 10 sec window

const activeUsers = await User.find({
  lastSeen: { $gte: activeThreshold }
})
.select('name avatar')
.limit(6);

const totalActive = await User.countDocuments({
  lastSeen: { $gte: activeThreshold }
});

    // Today helps
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayHelps = await Request.countDocuments({
      status: 'completed',
      updatedAt: { $gte: today }
    });

    // Week helps
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const weekHelps = await Request.countDocuments({
      status: 'completed',
      updatedAt: { $gte: weekAgo }
    });

    res.json({
      activeUsers,
      totalActive,
      todayHelps,
      weekHelps
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Stats fetch failed' });
  }
};