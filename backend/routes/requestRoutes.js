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
  sendToAftercare,
  sendMedicalProfile,
  trackByPublicId,
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
// ─────────────────────────────────────────────────────────────────────────────

router.post('/sos', optionalAuth, attachEmergencyProfile, upload.array('images', 1), createGuestSOS);
router.put('/:id/guest-image', upload.single('images'), addGuestImage);
router.get('/track/:publicId', optionalAuth, trackByPublicId);
router.post('/:id/aftercare', optionalAuth, sendToAftercare);
router.patch('/:id/cancel', optionalAuth, cancelRequest);

// GET single request — public with optionalAuth
router.get('/:id', optionalAuth, async (req, res, next) => {
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
      _id:           request._id,
      publicId:      request.publicId,
      status:        request.status,
      location:      request.location,
      requesterType: request.requesterType,
      isSOS:         request.isSOS,
      isGuest:       request.isGuest,
      category:      request.category,
      title:         request.title,
      description:   request.description,
      urgency:       request.urgency,
      isEnhanced:    request.isEnhanced,
      media:         request.media,
      // Cancellation
      cancelledBy:        request.cancelledBy,
      cancellationReason: request.cancellationReason,
      cancelledAt:        request.cancelledAt,
      // ✅ NEW — Activity feed: returned so the 8-second poll seeds the UI
      // when the page is refreshed after helpers were already notified
      notifiedCount:         request.notifiedCount         ?? 0,
      nearestHelperDistance: request.nearestHelperDistance ?? null,
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

router.post(
  '/',
  authorizeRoles('user'),
  attachEmergencyProfile,
  upload.array('images', 3),
  createRequestValidation,
  validateRequest,
  createRequest
);

router.get('/nearby',      getNearbyRequests);
router.get('/my-requests', getMyRequests);
router.get('/my-accepted', getMyAcceptedRequests);

router.get('/admin/all',          isAdmin, getAllRequests);
router.patch('/admin/:id/delete', isAdmin, deleteRequestAdmin);

router.patch('/:id/accept',   acceptRequest);
router.patch('/:id/complete', completeRequest);
router.post('/:id/rate',      rateHelper);

router.post('/aftercare/profile', sendMedicalProfile);

router.put('/:id', upload.array('images', 3), updateRequestValidation, validateRequest, updateRequest);

module.exports = router;