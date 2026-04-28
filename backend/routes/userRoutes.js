const express = require('express');
const router  = express.Router();

const {
  getNearbyUsers
} = require('../controllers/userController');

const { protect, isAdmin } = require('../middleware/authMiddleware');

// Existing route
router.get('/nearby', protect, getNearbyUsers);

module.exports = router;