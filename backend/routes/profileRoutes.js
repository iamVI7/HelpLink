/**
 * profileRoutes.js
 *
 * PHASE 1 — Backend Aggregation Layer
 *
 * Registers:
 *   GET /api/profile/me  →  profileController.getMyProfile
 *
 * Uses the existing `protect` middleware — no new auth logic introduced.
 *
 * ⚠️  SAFE: Add `app.use('/api/profile', profileRoutes)` in app.js.
 *            Nothing else needs to change.
 */

const express          = require('express');
const router           = express.Router();
const { protect }      = require('../middleware/authMiddleware');
const { getMyProfile } = require('../controllers/profileController');

// GET /api/profile/me — authenticated users only
router.get('/me', protect, getMyProfile);

module.exports = router;