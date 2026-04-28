const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const {
  getMyProfile,
  upsertProfile
} = require('../controllers/emergencyProfileController');

// All routes require login
router.use(protect);

// GET profile
router.get('/', getMyProfile);

// CREATE / UPDATE profile
router.put('/', upsertProfile);

module.exports = router;