// controllers/requestController.js
// THIN CONTROLLER — receive req, call service, return response.
// All business logic lives in services/requestService.js and its dependencies.

const requestService = require('../services/requestService');

// ── HELPER ────────────────────────────────────────────────────────────────────
const handleError = (res, error, label = 'requestController') => {
  console.error(`${label} error:`, error);
  res.status(500).json({ success: false, message: 'Server error', error: error.message });
};

// ── SEND ──────────────────────────────────────────────────────────────────────
const send = (res, { status, body }) => res.status(status).json(body);

// ─────────────────────────────────────────────────────────────────────────────

// @desc    Create new request (unified — guests + users + SOS)
// @route   POST /api/requests  (normal) | POST /api/requests/sos (SOS)
// @access  Public (SOS) | Private (normal)
const createRequest = async (req, res) => {
  try {
    send(res, await requestService.createRequest(req));
  } catch (error) {
    handleError(res, error, 'createRequest');
  }
};

// @desc    Get nearby requests
// @route   GET /api/requests/nearby
// @access  Private
const getNearbyRequests = async (req, res) => {
  try {
    send(res, await requestService.getNearbyRequests(req));
  } catch (error) {
    handleError(res, error, 'getNearbyRequests');
  }
};

// @desc    Get user's requests
// @route   GET /api/requests/my-requests
// @access  Private
const getMyRequests = async (req, res) => {
  try {
    send(res, await requestService.getMyRequests(req));
  } catch (error) {
    handleError(res, error, 'getMyRequests');
  }
};

// @desc    Get requests accepted by user
// @route   GET /api/requests/my-accepted
// @access  Private
const getMyAcceptedRequests = async (req, res) => {
  try {
    send(res, await requestService.getMyAcceptedRequests(req));
  } catch (error) {
    console.error('❌ getMyAcceptedRequests error:', error);
    handleError(res, error, 'getMyAcceptedRequests');
  }
};

// @desc    Accept request
// @route   PATCH /api/requests/:id/accept
// @access  Private
const acceptRequest = async (req, res) => {
  try {
    send(res, await requestService.acceptRequest(req));
  } catch (error) {
    handleError(res, error, 'acceptRequest');
  }
};

// @desc    Complete request
// @route   PATCH /api/requests/:id/complete
// @access  Private
const completeRequest = async (req, res) => {
  try {
    send(res, await requestService.completeRequest(req));
  } catch (error) {
    handleError(res, error, 'completeRequest');
  }
};

// @desc    Rate helper after completion
// @route   POST /api/requests/:id/rate
// @access  Private
const rateHelper = async (req, res) => {
  try {
    send(res, await requestService.rateHelper(req));
  } catch (error) {
    handleError(res, error, 'rateHelper');
  }
};

// @desc    Get ALL requests for admin
// @route   GET /api/requests/admin/all
// @access  Admin
const getAllRequests = async (req, res) => {
  try {
    send(res, await requestService.getAllRequests());
  } catch (error) {
    console.error('getAllRequests error:', error);
    handleError(res, error, 'getAllRequests');
  }
};

// @desc    Delete request (Admin)
// @route   PATCH /api/requests/admin/:id/delete
// @access  Admin
const deleteRequestAdmin = async (req, res) => {
  try {
    send(res, await requestService.deleteRequestAdmin(req));
  } catch (error) {
    handleError(res, error, 'deleteRequestAdmin');
  }
};

// @desc    Update / enhance a request
// @route   PUT /api/requests/:id
// @access  Private
const updateRequest = async (req, res) => {
  try {
    send(res, await requestService.updateRequest(req));
  } catch (error) {
    handleError(res, error, 'updateRequest');
  }
};

// @desc    Guest adds photo to their SOS request
// @route   PUT /api/requests/:id/guest-image
// @access  Public (no auth — validated by isGuest flag)
const addGuestImage = async (req, res) => {
  try {
    send(res, await requestService.addGuestImage(req));
  } catch (error) {
    handleError(res, error, 'addGuestImage');
  }
};

// @desc    Get request by publicId (e.g. HL-REQ-000123)
// @route   GET /api/requests/track/:publicId
// @access  Public (optionalAuth)
const trackByPublicId = async (req, res) => {
  try {
    send(res, await requestService.trackByPublicId(req));
  } catch (error) {
    handleError(res, error, 'trackByPublicId');
  }
};

// @desc    Send basic incident data to UniCare aftercare endpoint
// @route   POST /api/requests/:id/aftercare
// @access  Public (guests + logged-in users)
const sendToAftercare = async (req, res) => {
  try {
    send(res, await requestService.sendToAftercare(req));
  } catch (error) {
    if (error.response) {
      console.error('sendToAftercare: UniCare returned', error.response.status, error.response.data);
      return res.status(502).json({
        success: false,
        message: `UniCare service returned ${error.response.status}`,
      });
    }
    if (error.request) {
      console.error('sendToAftercare: No response from UniCare —', error.message);
      return res.status(502).json({
        success: false,
        message: 'UniCare service is unreachable. Please make sure it is running.',
      });
    }
    handleError(res, error, 'sendToAftercare');
  }
};

// @desc    Send full medical profile to UniCare (ONLY on explicit user consent)
// @route   POST /api/requests/aftercare/profile
// @access  Private (logged-in users only)
const sendMedicalProfile = async (req, res) => {
  try {
    send(res, await requestService.sendMedicalProfile(req));
  } catch (error) {
    if (error.response) {
      console.error('sendMedicalProfile: UniCare returned', error.response.status, error.response.data);
      return res.status(502).json({
        success: false,
        message: `UniCare service returned ${error.response.status}`,
      });
    }
    if (error.request) {
      console.error('sendMedicalProfile: No response from UniCare —', error.message);
      return res.status(502).json({
        success: false,
        message: 'UniCare service is unreachable. Please make sure it is running.',
      });
    }
    handleError(res, error, 'sendMedicalProfile');
  }
};

// ── ✅ NEW: Cancel Request ─────────────────────────────────────────────────────
// @desc    Cancel a request (guest or user) — only allowed when status is 'open'
//          Accepted or completed requests cannot be cancelled.
// @route   PATCH /api/requests/:id/cancel
// @access  Public (guests via guestId query param) + Private (authenticated users)
// ─────────────────────────────────────────────────────────────────────────────
const cancelRequest = async (req, res) => {
  try {
    const Request = require('../models/Request');
    const { getSocketIO } = require('../socket');

    const { id } = req.params;
    // reason comes from request body as a plain string
    const { reason } = req.body;

    // ── 1. Find the request ───────────────────────────────────────────────
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // ── 2. Guard: only 'open' requests can be cancelled ──────────────────
    // 'accepted'  → a helper is already on the way, cannot cancel
    // 'completed' → already resolved, cannot cancel
    // 'cancelled' → already cancelled, idempotent but block double-cancel
    if (request.status !== 'open') {
      const msgs = {
        accepted:  'This request has already been accepted by a helper and cannot be cancelled.',
        completed: 'This request has already been completed and cannot be cancelled.',
        cancelled: 'This request has already been cancelled.',
      };
      return res.status(400).json({
        success: false,
        message: msgs[request.status] || 'This request cannot be cancelled in its current state.',
      });
    }

    // ── 3. Ownership check ────────────────────────────────────────────────
    // Guests: must provide matching guestId in query or body
    // Logged-in users: must own the request OR be admin
    const guestIdParam = req.query.guestId || req.body.guestId;
    const isGuestOwner =
      (request.isGuest || request.requesterType === 'guest') &&
      request.guestId &&
      guestIdParam &&
      request.guestId === String(guestIdParam).trim();

    const isUserOwner =
      req.user &&
      request.createdBy &&
      request.createdBy.toString() === req.user._id.toString();

    const isAdmin = req.user?.role === 'admin';

    if (!isGuestOwner && !isUserOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorised to cancel this request.',
      });
    }

    // ── 4. Determine who is cancelling ───────────────────────────────────
    let cancelledBy = 'guest';
    if (isAdmin) cancelledBy = 'admin';
    else if (isUserOwner) cancelledBy = 'user';

    // ── 5. Persist cancellation ───────────────────────────────────────────
    request.status             = 'cancelled';
    request.cancelledBy        = cancelledBy;
    request.cancellationReason = reason || 'No reason provided';
    request.cancelledAt        = new Date();
    await request.save();

    // ── 6. Emit real-time event so helpers remove it from their feed ──────
    try {
      const io = getSocketIO();
      // Notify everyone in this request's room (helpers watching it)
      io.to(`request_${id}`).emit('request_cancelled', {
        requestId: id,
        reason:    request.cancellationReason,
      });
      // Also notify the SOS guest room if applicable
      if (request.guestId) {
        io.to(`sos_${request.guestId}`).emit('request_cancelled', {
          requestId: id,
          reason:    request.cancellationReason,
        });
      }
    } catch (socketErr) {
      // Socket failure should NOT block the HTTP response
      console.warn('cancelRequest: socket emit failed —', socketErr.message);
    }

    console.log(`🚫 Request ${id} cancelled by ${cancelledBy}. Reason: "${request.cancellationReason}"`);

    return res.status(200).json({
      success: true,
      message: 'Request cancelled successfully.',
      data: {
        requestId:          id,
        status:             'cancelled',
        cancelledBy,
        cancellationReason: request.cancellationReason,
        cancelledAt:        request.cancelledAt,
      },
    });
  } catch (error) {
    handleError(res, error, 'cancelRequest');
  }
};
// ── END: Cancel Request ───────────────────────────────────────────────────────

// Kept for backward compat — delegates to unified createRequest
const createGuestSOS = createRequest;

module.exports = {
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
};