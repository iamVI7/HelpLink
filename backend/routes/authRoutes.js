const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  registerUser,
  loginUser,
  getUserProfile,
  updateAvailability,
  getAllUsers,
  deleteUserAdmin,
  restoreUserAdmin,
  sendOTP,
  verifyOTP
} = require('../controllers/authController');

// ── NEW: import warning + permanent delete controllers ──
const {
  issueWarning,
  getMyWarnings,
  markWarningRead,
  permanentDeleteUser,
  getUserWarningCount,
} = require('../controllers/userController');

const { protect, isAdmin } = require('../middleware/authMiddleware');
const { validateRequest } = require('../utils/validators');


// ==============================
// Validation rules
// ==============================

const registerValidation = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }),

  body('email')
    .isEmail().withMessage('Please enter a valid email'),

  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  body('phoneNumber')
    .isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits'),

  // FIX: address is optional in validation — the controller and frontend
  // both guarantee a coordinate-based fallback when Nominatim fails on
  // mobile networks, so we must not reject requests with a missing address.
  body('address')
    .optional({ nullable: true, checkFalsy: true })
    .trim(),

  body('location.coordinates')
    .isArray().withMessage('Location coordinates are required')
];

const loginValidation = [
  body('email')
    .isEmail().withMessage('Please enter a valid email'),

  body('password')
    .notEmpty().withMessage('Password is required')
];


// ==============================
// Public routes
// ==============================

router.post('/register', registerValidation, validateRequest, registerUser);
router.post('/login', loginValidation, validateRequest, loginUser);


// ==============================
// Protected routes
// ==============================

router.get('/profile', protect, getUserProfile);
router.patch('/availability', protect, updateAvailability);


// ==============================
// OTP routes (Protected)
// ==============================

router.post('/send-otp', protect, sendOTP);
router.post('/verify-otp', protect, verifyOTP);


// ==============================
// Admin routes (existing - untouched)
// ==============================

router.get('/admin/users',              protect, isAdmin, getAllUsers);
router.patch('/admin/users/:id/delete', protect, isAdmin, deleteUserAdmin);
router.patch('/admin/users/:id/restore',protect, isAdmin, restoreUserAdmin);


// ==============================
// Warning routes (NEW)
// ==============================

router.post('/admin/users/:id/warn',      protect, isAdmin, issueWarning);
router.delete('/admin/users/:id/permanent', protect, isAdmin, permanentDeleteUser);
router.get('/me/warnings',                protect, getMyWarnings);
router.patch('/warnings/:id/read',        protect, markWarningRead);
router.get('/admin/users/:id/warnings/count', protect, isAdmin, getUserWarningCount);


// ==============================
// Export
// ==============================

module.exports = router;