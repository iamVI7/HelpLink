const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const upload = require('../middleware/uploadMiddleware');

const { validateRequest } = require('../utils/validators');
const {
  protect,
  isAdmin,
  authorizeRoles,
  optionalAuth,
} = require('../middleware/authMiddleware');

const attachEmergencyProfile = require('../middleware/attachEmergencyProfile');

const {
  createRequest,
  getNearbyRequests,
  getMyRequests,
  getMyAcceptedRequests,
  acceptRequest,
  completeRequest,
  rateHelper,
  getAllRequests,
  deleteRequestAdmin,
  createGuestSOS,
  updateRequest,
  addGuestImage,
  // ✅ Aftercare Bridge
  sendToAftercare,
  sendMedicalProfile,
  // ✅ Public ID tracking
  trackByPublicId,
  // ✅ NEW — Cancel Request
  cancelRequest,
} = require('../controllers/requestController');

const createRequestValidation = [
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 100 }),
  body('description').notEmpty().withMessage('Description is required').isLength({ max: 500 }),
  body('category').isIn(['blood', 'medical', 'emergency', 'other']).withMessage('Invalid category'),
  body('urgency').isIn(['high', 'medium', 'low']).withMessage('Invalid urgency'),
  body('address').notEmpty().withMessage('Address is required'),
  body('location.coordinates').isArray().withMessage('Location coordinates are required'),
];

const updateRequestValidation = [
  body('title').optional().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('category').optional().isIn(['blood', 'medical', 'emergency', 'other', 'critical', 'accident']),
  body('urgency').optional().isIn(['high', 'medium', 'low', 'critical']),
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — FULLY PUBLIC (no auth at all)
// These must come first so they are never touched by protect middleware.
// ─────────────────────────────────────────────────────────────────────────────

// SOS — guests and logged-in users
router.post('/sos', optionalAuth, attachEmergencyProfile, upload.array('images', 1), createGuestSOS);

// Guest image upload — no auth, validated by isGuest flag in controller
router.put('/:id/guest-image', upload.single('images'), addGuestImage);

// ✅ Track by public ID (e.g. HL-REQ-000123)
router.get('/track/:publicId', optionalAuth, trackByPublicId);

// ✅ Aftercare: allow BOTH guests and logged-in users
router.post('/:id/aftercare', optionalAuth, sendToAftercare);

// ✅ NEW — Cancel Request
// Registered in the PUBLIC section (before protect wall) so guests can call it
// without a JWT token. Ownership is verified inside the controller via guestId.
// optionalAuth populates req.user if a valid token is present so logged-in
// users also get the correct ownership check inside the controller.
router.patch('/:id/cancel', optionalAuth, cancelRequest);

// GET single request — public with optionalAuth (guests need this for tracking)
router.get('/:id', optionalAuth, async (req, res, next) => {
  // Skip this handler for named sub-paths — let them fall through to protected routes
  const named = ['nearby', 'my-requests', 'my-accepted', 'admin', 'track'];
  if (named.some(n => req.params.id === n || req.params.id.startsWith(n))) {
    return next();
  }

  try {
    const mongoose = require('mongoose');
    const Request  = require('../models/Request');

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const request = await Request
      .findById(req.params.id)
      .populate('acceptedBy', 'name phoneNumber location');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const isAcceptedHelper =
      request.acceptedBy &&
      req.user &&
      request.acceptedBy._id.toString() === req.user._id.toString();

    const isOwner =
      request.createdBy &&
      req.user &&
      request.createdBy.toString() === req.user._id.toString();

    // Guest owner: guestId query param must match stored guestId exactly
    const guestIdParam = req.query.guestId;
    const isGuestOwner =
      (request.isGuest || request.requesterType === 'guest') &&
      request.guestId &&
      guestIdParam &&
      request.guestId === String(guestIdParam).trim();

    if (!isAcceptedHelper && !isOwner && !isGuestOwner) {
      if (request.media?.images?.length > 0) {
        request.media.images = request.media.images.map(() => ({ url: null }));
      }
    }

    return res.json({
      _id:                request._id,
      publicId:           request.publicId,
      status:             request.status,
      location:           request.location,
      requesterType:      request.requesterType,
      isSOS:              request.isSOS,
      isGuest:            request.isGuest,
      category:           request.category,
      title:              request.title,
      description:        request.description,
      urgency:            request.urgency,
      isEnhanced:         request.isEnhanced,
      media:              request.media,
      // ✅ NEW — include cancellation data so frontend can react correctly
      cancelledBy:        request.cancelledBy,
      cancellationReason: request.cancellationReason,
      cancelledAt:        request.cancelledAt,
      helper: request.acceptedBy
        ? {
            name:     request.acceptedBy.name,
            phone:    request.acceptedBy.phoneNumber,
            location: request.acceptedBy.location,
          }
        : null,
    });

  } catch (err) {
    console.error('Fetch request error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — PROTECTED (require valid JWT)
// ─────────────────────────────────────────────────────────────────────────────
router.use(protect);

// POST / — create normal request (users only)
router.post(
  '/',
  authorizeRoles('user'),
  attachEmergencyProfile,
  upload.array('images', 3),
  createRequestValidation,
  validateRequest,
  createRequest
);

// Named GET routes — must be after protect
router.get('/nearby',      getNearbyRequests);
router.get('/my-requests', getMyRequests);
router.get('/my-accepted', getMyAcceptedRequests);

// Admin routes
router.get('/admin/all',          isAdmin, getAllRequests);
router.patch('/admin/:id/delete', isAdmin, deleteRequestAdmin);

// Action routes
router.patch('/:id/accept',   acceptRequest);
router.patch('/:id/complete', completeRequest);
router.post('/:id/rate',      rateHelper);

// ✅ Medical profile transfer: logged-in users only
router.post('/aftercare/profile', sendMedicalProfile);

// PUT /:id — update/enhance request
router.put('/:id', upload.array('images', 3), updateRequestValidation, validateRequest, updateRequest);

module.exports = router;