const User = require('../models/User');
const Warning = require('../models/Warning');          // ← NEW
const { getOnlineUserIds } = require('../socket');

// GET /api/users/nearby?lat=&lng=
const getNearbyUsers = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng query parameters are required',
      });
    }

    const latitude  = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng must be valid numbers',
      });
    }

    const onlineIds = getOnlineUserIds();

    if (onlineIds.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const nearbyUsers = await User.find({
      _id: {
        $ne: req.user._id,
        $in: onlineIds,
      },
      isAvailable: true,
      isDeleted: { $ne: true },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: 2400,
        },
      },
    })
      .select('name isAvailable location role isVerified')
      .limit(20);

    res.status(200).json({
      success: true,
      count: nearbyUsers.length,
      data: nearbyUsers,
    });
  } catch (error) {
    console.error('getNearbyUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching nearby users',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Issue a warning to a user
// @route   POST /auth/admin/users/:id/warn
// @access  Admin
// ─────────────────────────────────────────────────────────────
const issueWarning = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Warning message is required' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser.role === 'admin') {
      return res.status(403).json({ message: 'Cannot warn an admin user' });
    }

    const warning = await Warning.create({
      userId:   req.params.id,
      message:  message.trim(),
      issuedBy: req.user._id,
    });

    res.status(201).json({ message: 'Warning issued successfully', warning });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get unread warnings for logged-in user
// @route   GET /auth/me/warnings
// @access  Private
// ─────────────────────────────────────────────────────────────
const getMyWarnings = async (req, res) => {
  try {
    const warnings = await Warning.find({
      userId: req.user._id,
      isRead: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({ warnings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Mark a warning as read
// @route   PATCH /auth/warnings/:id/read
// @access  Private
// ─────────────────────────────────────────────────────────────
const markWarningRead = async (req, res) => {
  try {
    const warning = await Warning.findById(req.params.id);

    if (!warning) {
      return res.status(404).json({ message: 'Warning not found' });
    }

    if (warning.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    warning.isRead = true;
    await warning.save();

    res.status(200).json({ message: 'Warning marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUserWarningCount = async (req, res) => {
  try {
    const count = await Warning.countDocuments({ userId: req.params.id, isRead: false });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Permanently delete a user
// @route   DELETE /auth/admin/users/:id/permanent
// @access  Admin
// ─────────────────────────────────────────────────────────────
const permanentDeleteUser = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser.role === 'admin') {
      return res.status(403).json({ message: 'Cannot permanently delete an admin user' });
    }

    await User.findByIdAndDelete(req.params.id);
    await Warning.deleteMany({ userId: req.params.id });   // cleanup

    res.status(200).json({ message: 'User permanently deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getNearbyUsers,
  issueWarning,
  getMyWarnings,
  markWarningRead,
  getUserWarningCount,
  permanentDeleteUser,
};