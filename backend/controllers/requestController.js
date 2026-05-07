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
// ─────────────────────────────────────────────────────────────────────────────
// REPLACE only sendToAftercare in helplink/backend/controllers/requestController.js
// ─────────────────────────────────────────────────────────────────────────────

const sendToAftercare = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const unicareBase = process.env.UNICARE_API;
    if (!unicareBase) {
      console.error('sendToAftercare: UNICARE_API is not set in .env');
      return res.status(503).json({
        success: false,
        message: 'Aftercare service is not configured on this server.',
      });
    }

    const consentFromBody  = req.body?.consent  || null;
    const userNoteFromBody = req.body?.userNote  || '';
    const isAnonymous      = req.body?.anonymous || false;

    let payload;
    if (req.user) {
      const EmergencyProfile = require('../models/EmergencyProfile');
      const profile = await EmergencyProfile.findOne({ user: req.user._id });
      payload = {
        requestId:           String(request._id),
        userId:              isAnonymous ? null : String(req.user._id),
        guestId:             null,
        name:                (consentFromBody?.contact === false || isAnonymous) ? 'Anonymous' : req.user.name,
        incidentType:        request.category    || 'unknown',
        notes:               request.description || '',
        location:            consentFromBody?.location === false ? null : (request.location || null),
        time:                request.createdAt,
        hasEmergencyProfile: !!profile,
        source:              'helplink',
        consent:             consentFromBody,
        userNote:            userNoteFromBody,
      };
    } else {
      payload = {
        requestId:    String(request._id),
        userId:       null,
        guestId:      request.guestId || null,
        name:         isAnonymous ? 'Anonymous' : 'Guest User',
        incidentType: request.category    || 'unknown',
        notes:        request.description || '',
        location:     consentFromBody?.location === false ? null : (request.location || null),
        time:         request.createdAt,
        source:       'helplink',
        consent:      consentFromBody,
        userNote:     userNoteFromBody,
      };
    }

    const sharedHeaders = {
      'Content-Type': 'application/json',
      'x-api-key':    process.env.AFTERCARE_SECRET || '',
    };

    // ── Step 1: Store AftercareCase (existing — unchanged) ────────────────
    const aftercareRes = await axios.post(
      `${unicareBase}/aftercare`,
      payload,
      { headers: sharedHeaders, timeout: 8000 }
    );

    const aftercareCaseId = aftercareRes.data?.caseId || null;

    // ── Step 2: Create Temporary Recovery Session (NEW — non-fatal) ───────
    let sessionToken = null;
    try {
      const recoveryRes = await axios.post(
        `${unicareBase}/recovery/create`,
        {
          aftercareCaseId,
          userId:  req.user ? String(req.user._id) : null,
          guestId: !req.user ? (request.guestId || null) : null,
          isGuest: !req.user,
        },
        { headers: sharedHeaders, timeout: 8000 }
      );
      sessionToken = recoveryRes.data?.sessionToken || null;
    } catch (recoveryErr) {
      console.error('sendToAftercare: recovery session creation failed (non-fatal):', recoveryErr.message);
    }

    return res.json({
      success:      true,
      message:      'Aftercare data sent successfully',
      data:         aftercareRes.data,
      isGuest:      !req.user,
      requestId:    String(request._id),
      sessionToken, // ✅ NEW — used by AftercareButton for snapshot page redirect
    });

  } catch (error) {
    if (error.response) {
      console.error('sendToAftercare: UniCare returned', error.response.status, error.response.data);
      return res.status(502).json({ success: false, message: `UniCare service returned ${error.response.status}` });
    }
    if (error.request) {
      console.error('sendToAftercare: No response from UniCare —', error.message);
      return res.status(502).json({ success: false, message: 'UniCare service is unreachable.' });
    }
    console.error('sendToAftercare error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
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

// ── Cancel Request ─────────────────────────────────────────────────────────────
// @desc    Cancel a request (guest or registered user)
//
// Cancellation rules by actor:
//   Guest      — only allowed when status is 'open'. Blocked on 'accepted'.
//   Registered — allowed on both 'open' and 'accepted'.
//                'open'     → no reason required (stored as "No reason provided")
//                'accepted' → reason required by frontend; helper notified via socket
//   Admin      — allowed on both 'open' and 'accepted'.
//
// @route   PATCH /api/requests/:id/cancel
// @access  Public (guests via guestId query param) + Private (authenticated users)
// ─────────────────────────────────────────────────────────────────────────────
const cancelRequest = async (req, res) => {
  try {
    const Request = require('../models/Request');
    const { getSocketIO, getUserSocketId } = require('../socket');

    const { id }     = req.params;
    const { reason } = req.body;

    // ── 1. Find the request ───────────────────────────────────────────────
    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // ── 2. Ownership check ────────────────────────────────────────────────
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

    // ── 3. Status guard — rules differ by actor ───────────────────────────
    if (request.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been cancelled.',
      });
    }

    if (request.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been completed and cannot be cancelled.',
      });
    }

    if (request.status === 'accepted' && isGuestOwner) {
      // Guests cannot cancel once a helper is assigned
      return res.status(400).json({
        success: false,
        message: 'This request has already been accepted by a helper and cannot be cancelled.',
      });
    }

    // Registered users and admins may cancel 'open' or 'accepted' — fall through

    // ── 4. Determine who is cancelling ───────────────────────────────────
    let cancelledBy = 'guest';
    if (isAdmin)      cancelledBy = 'admin';
    else if (isUserOwner) cancelledBy = 'user';

    // ── 5. Persist cancellation ───────────────────────────────────────────
    request.status             = 'cancelled';
    request.cancelledBy        = cancelledBy;
    request.cancellationReason = reason?.trim() || 'No reason provided';
    request.cancelledAt        = new Date();
    await request.save();

    // ── 6. Emit real-time events ──────────────────────────────────────────
    try {
      const io = getSocketIO();

      const payload = {
        requestId: id,
        reason:    request.cancellationReason,
      };

      // Everyone watching this request's detail page
      io.to(`request_${id}`).emit('request_cancelled', payload);

      // Helpers browsing the nearby feed (viewers room)
      io.to(`viewers_${id}`).emit('request_cancelled', payload);

      // Guest SOS room if applicable
      if (request.guestId) {
        io.to(`sos_${request.guestId}`).emit('request_cancelled', payload);
      }

      // ── Direct notification to the assigned helper ─────────────────────
      // Uses userSocketMap (userId → socketId) so the helper receives it
      // regardless of which page they're currently on — no personal room needed.
      if (request.acceptedBy) {
        const helperSocketId = getUserSocketId(request.acceptedBy.toString());
        if (helperSocketId) {
          io.to(helperSocketId).emit('request_cancelled', payload);
          console.log(`🚫 Notified helper ${request.acceptedBy} directly via socket ${helperSocketId}`);
        }
      }

    } catch (socketErr) {
      // Socket failure must never block the HTTP response
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
  // ✅ Cancel Request
  cancelRequest,
};