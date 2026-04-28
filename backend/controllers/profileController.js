/**
 * profileController.js
 *
 * PHASE 1 — Backend Aggregation Layer
 *
 * Provides a single endpoint that aggregates all user-related data:
 *   - User identity (no password)
 *   - Emergency profile
 *   - Recent requests (as requester / createdBy)
 *   - Recent helps (as helper / acceptedBy)
 *   - Stats (totalHelps, rating)
 *
 * ⚠️  SAFE: Does NOT touch or modify any existing controller.
 *            Uses the same models already in use by other controllers.
 */

const User             = require('../models/User');
const EmergencyProfile = require('../models/EmergencyProfile');
const Request          = require('../models/Request');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/profile/me
// Protected — requires valid JWT (uses existing `protect` middleware)
// ─────────────────────────────────────────────────────────────────────────────
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // ── 1. Fetch user (password already excluded by `protect` middleware,
    //        but we re-select explicitly for clarity and safety) ──────────────
    const user = await User.findById(userId)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // ── 2. Fetch emergency profile (null if not yet created) ─────────────────
    const emergencyProfile = await EmergencyProfile.findOne({ userId })
      .lean();

    // ── 3. Fetch recent requests created by this user ────────────────────────
    //    - Exclude soft-deleted ones (isDeleted: true)
    //    - Limit to 10 most recent, sorted newest first
    const recentRequests = await Request.find({
      createdBy: userId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title description category urgency status createdAt address isSOS completedAt rated acceptedBy')
      .populate('acceptedBy', 'name avatar rating')
      .lean();

    // ── 4. Fetch recent helps (requests where this user was the helper) ───────
    //    - Exclude soft-deleted ones
    //    - Limit to 10 most recent, sorted by completion date
    const recentHelps = await Request.find({
      acceptedBy: userId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title description category urgency status createdAt address isSOS completedAt createdBy')
      .populate('createdBy', 'name avatar rating')
      .lean();

    // ── 5. Compute stats ──────────────────────────────────────────────────────
    //    totalHelpGiven is already tracked on the User model.
    //    rating is already tracked on the User model.
    //    We expose them here for the frontend ProfileStats component.
    const stats = {
      totalHelps : user.totalHelpGiven || 0,
      rating     : user.rating         || 0,
      totalRatings: user.totalRatings  || 0,
    };

    // ── 6. Return structured response ─────────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        user,
        emergencyProfile: emergencyProfile || null,
        stats,
        activity: {
          requests: recentRequests,
          helps   : recentHelps,
        },
      },
    });

  } catch (err) {
    console.error('[profileController] getMyProfile error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
    });
  }
};

module.exports = { getMyProfile };