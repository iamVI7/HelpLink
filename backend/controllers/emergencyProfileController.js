const EmergencyProfile = require('../models/EmergencyProfile');

// ─────────────────────────────────────────────────────────────
// GET current user's emergency profile
// ─────────────────────────────────────────────────────────────
const getMyProfile = async (req, res) => {
  try {
    const profile = await EmergencyProfile.findOne({ userId: req.user._id });

    return res.status(200).json({
      success: true,
      profile: profile || null
    });

  } catch (err) {
    console.error('[getMyProfile]', err.message);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch emergency profile'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// CREATE or UPDATE profile (UPSERT)
// ─────────────────────────────────────────────────────────────
const upsertProfile = async (req, res) => {
  try {
    const data = req.body;

    const profile = await EmergencyProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        ...data,
        userId: req.user._id
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    return res.status(200).json({
      success: true,
      profile
    });

  } catch (err) {
    console.error('[upsertProfile]', err.message);

    res.status(500).json({
      success: false,
      message: 'Failed to save emergency profile'
    });
  }
};

module.exports = {
  getMyProfile,
  upsertProfile
};