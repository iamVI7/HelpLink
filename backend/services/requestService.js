// services/requestService.js
// Orchestrates all request-related business logic.
// Does NOT depend on Express (no req/res). Controllers call this.

const mongoose = require('mongoose');
const axios    = require('axios');

const Request          = require('../models/Request');
const User             = require('../models/User');
const { parseLocationFromBody, resolveCoordinates } = require('./locationService');
const { buildMediaData }   = require('./mediaService');
const { generateIds }      = require('./idService');
const { buildRequestDoc }  = require('./requestBuilder');
const {
  findActiveSOSRequest,
  findRecentSOSRequest,
  checkSOSCooldown,
  getGuidance,
} = require('./sosService');
const {
  emitNewRequestEvents,
  emitRequestAcceptedEvents,
  emitRequestCompletedEvents,
  emitRequestUpdatedEvents,
} = require('./notificationService');

// ─────────────────────────────────────────────────────────────────────────────
// CREATE REQUEST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core logic for creating a new request (unified — guests + users + SOS).
 * Returns the JSON response payload; throws on error.
 *
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const createRequest = async (req) => {
  // ✅ FIX 6 — parse location string → object
  req.body.location = parseLocationFromBody(req.body);

  const userId  = req.user?._id || null;
  const guestId = req.body.guestId || null;
  const isSOS   = req.body.isSOS === 'true' || req.body.isSOS === true;

  // Non-SOS requests still require auth
  if (!isSOS && !userId) {
    return {
      status: 401,
      body: { success: false, message: 'Authentication required for non-SOS requests' },
    };
  }

  // ✅ FIX 5 — active request guard (return existing open/accepted SOS)
  if (isSOS) {
    const existing = await findActiveSOSRequest(userId, guestId);
    if (existing) {
      return {
        status: 200,
        body: {
          success: true,
          request: existing,
          requestId: existing._id,
          publicId: existing.publicId || null,
          guidance: getGuidance(existing.category),
          message: 'Existing active SOS returned',
        },
      };
    }
  }

  // ✅ Duplicate SOS guard (within 15 seconds)
  if (isSOS) {
    const recent = await findRecentSOSRequest(userId, guestId);
    if (recent) {
      return {
        status: 200,
        body: {
          success: true,
          request: recent,
          requestId: recent._id,
          publicId: recent.publicId || null,
          guidance: getGuidance(recent.category),
        },
      };
    }
  }

  // ── SOS cooldown (60 s) ───────────────────────────────────────────────────
  if (isSOS) {
    const cooldown = await checkSOSCooldown(userId, req.body.guestId);
    if (cooldown.blocked) {
      return {
        status: 429,
        body: {
          success: false,
          message: `Please wait ${cooldown.remaining}s before sending another SOS`,
        },
      };
    }
  }

  // ── Location ──────────────────────────────────────────────────────────────
  const { location } = req.body;
  const coordinates  = resolveCoordinates(isSOS, location);
  if (!coordinates) {
    return { status: 400, body: { success: false, message: 'Valid location is required' } };
  }

  // ── Media ─────────────────────────────────────────────────────────────────
  const mediaData = buildMediaData(req.files, isSOS, userId);

  // ── IDs ───────────────────────────────────────────────────────────────────
  const { publicId, resolvedGuestId, actorType } = await generateIds(userId, guestId);

  // ── Build and persist document ────────────────────────────────────────────
  const requestDoc = buildRequestDoc({
    body: req.body,
    userId,
    isSOS,
    coordinates,
    mediaData,
    publicId,
    actorType,
    resolvedGuestId,
    emergencyProfileSnapshot: req.emergencyProfileSnapshot ?? null,
  });

  const request = await Request.create(requestDoc);

  let populatedRequest = request;
  if (userId) {
    populatedRequest = await Request.findById(request._id).populate({
      path: 'createdBy',
      select: 'name email phoneNumber rating location address isVerified',
      strictPopulate: false,
    });
  }

  const guidance = getGuidance(requestDoc.category);

  // ── Response payload ──────────────────────────────────────────────────────
  const responseBody = {
    success: true,
    request: populatedRequest,
    requestId: request._id,
    // ✅ always include publicId in response
    publicId: request.publicId,
    guidance,
    message: isSOS
      ? (userId
          ? 'Your emergency SOS has been sent'
          : 'SOS sent successfully. Help is on the way')
      : 'Alert sent. Notifying nearby helpers...',
  };

  // ── Socket notifications (fire-and-forget after response) ────────────────
  emitNewRequestEvents({
    request,
    populatedRequest,
    requestDoc,
    isSOS,
    userId,
    coordinates,
  });

  return { status: 201, body: responseBody };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET NEARBY REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const getNearbyRequests = async (req) => {
  const { lng, lat, radius = 5000 } = req.query;

  if (!lng || !lat) {
    return {
      status: 400,
      body: { success: false, message: 'Coordinates (lng, lat) are required' },
    };
  }

  const requests = await Request.find({
    status: 'open',
    isDeleted: false,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: parseInt(radius),
      },
    },
    createdBy: { $ne: req.user._id },
  }).populate({
    path: 'createdBy',
    select: 'name email phoneNumber rating location address isVerified',
    strictPopulate: false,
  });

  const sortedRequests = requests.sort((a, b) => {
    const urgencyWeight = { high: 3, medium: 2, low: 1 };
    const weightDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
    if (weightDiff !== 0) return weightDiff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const userId = req.user?._id?.toString();

  const filteredRequests = sortedRequests.map((request) => {
    const acceptedById = request.acceptedBy?._id?.toString?.() || request.acceptedBy?.toString?.();
    const createdById  = request.createdBy?._id?.toString?.() || request.createdBy?.toString?.();
    const isHelper = userId && acceptedById === userId;
    const isOwner  = userId && createdById === userId;

    if (!isHelper && !isOwner) {
      if (request.media?.images?.length > 0) {
        request.media.images = request.media.images.map(() => ({ url: null }));
      }
    }
    return request;
  });

  return {
    status: 200,
    body: { success: true, count: sortedRequests.length, requests: filteredRequests },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET MY REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const getMyRequests = async (req) => {
  const requests = await Request.find({ createdBy: req.user._id, isDeleted: false })
    .populate('createdBy', 'name email isVerified')
    .populate('acceptedBy', 'name email phoneNumber rating location')
    .sort({ createdAt: -1 });

  return { status: 200, body: { success: true, count: requests.length, requests } };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET MY ACCEPTED REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const getMyAcceptedRequests = async (req) => {
  if (!req.user || !req.user._id) {
    return { status: 401, body: { success: false, message: 'User not authenticated' } };
  }

  // req.user._id is always a real ObjectId here (route is auth-protected),
  // but guard defensively to be consistent and prevent any future regression.
  if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
    return { status: 400, body: { success: false, message: 'Invalid user ID' } };
  }

  const requests = await Request.find({
    status: { $in: ['accepted', 'completed'] },
    acceptedBy: new mongoose.Types.ObjectId(req.user._id),
    isDeleted: false,
  })
    .populate({ path: 'createdBy', select: 'name email phoneNumber rating location address isVerified', strictPopulate: false })
    .populate({ path: 'acceptedBy', select: 'name email phoneNumber location', strictPopulate: false })
    .sort({ createdAt: -1 });

  return { status: 200, body: { success: true, count: requests.length, requests } };
};

// ─────────────────────────────────────────────────────────────────────────────
// ACCEPT REQUEST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const acceptRequest = async (req) => {
  const request = await Request.findOneAndUpdate(
    { _id: req.params.id, status: 'open', createdBy: { $ne: req.user._id } },
    { status: 'accepted', acceptedBy: req.user._id },
    { returnDocument: 'after' }
  );

  if (!request) {
    return { status: 400, body: { success: false, message: 'Request already accepted' } };
  }

  if (request.createdBy && request.createdBy.toString() === req.user._id.toString()) {
    return { status: 400, body: { success: false, message: 'You cannot accept your own request' } };
  }

  if (req.body.location && req.body.location.coordinates) {
    await User.findByIdAndUpdate(req.user._id, {
      location: { type: 'Point', coordinates: req.body.location.coordinates },
    });
  }

  const updatedRequest = await Request.findById(request._id)
    .populate('createdBy', 'name email phoneNumber location address isVerified')
    .populate('acceptedBy', 'name email phoneNumber location');

  await User.findByIdAndUpdate(req.user._id, { isAvailable: false });

  // Socket notifications
  emitRequestAcceptedEvents({ request, updatedRequest, user: req.user });

  return { status: 200, body: { success: true, request: updatedRequest } };
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE REQUEST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const completeRequest = async (req) => {
  if (!req.user) {
    return { status: 401, body: { success: false, message: 'Login required to complete a request' } };
  }

  const request = await Request.findById(req.params.id);
  if (!request) return { status: 404, body: { success: false, message: 'Request not found' } };

  if (request.status !== 'accepted') {
    return { status: 400, body: { success: false, message: 'Only accepted requests can be marked as completed' } };
  }

  if (!request.acceptedBy) {
    return { status: 400, body: { success: false, message: 'No one has accepted this request yet' } };
  }

  const isAdmin        = req.user.role === 'admin';
  const isAssignedUser = request.acceptedBy.toString() === req.user._id.toString();

  if (!isAdmin && !isAssignedUser) {
    return { status: 403, body: { success: false, message: 'You can only complete requests that you have accepted' } };
  }

  request.status      = 'completed';
  request.completedAt = new Date();
  await request.save();

  await User.findByIdAndUpdate(req.user._id, { $inc: { totalHelpGiven: 1 }, isAvailable: true });

  const updatedRequest = await Request.findById(req.params.id)
    .populate('createdBy', 'name email phoneNumber isVerified')
    .populate('acceptedBy', 'name email phoneNumber location');

  // ── UniCare Integration Prep ──────────────────────────────────────────────
  // When a request is completed, log the UniCare payload.
  // No API call yet — just log as per spec.
  try {
    const unicarePayload = {
      requestId:  request.publicId || String(request._id),
      type:       request.category || 'unknown',
      severity:   request.urgency  || 'medium',
      actorType:  request.actorType || request.requesterType || 'user',
    };
    console.log('UniCare Payload:', unicarePayload);
  } catch (logErr) {
    // Non-fatal — never block the response
    console.error('UniCare log error (non-fatal):', logErr.message);
  }
  // ── END UniCare Integration Prep ─────────────────────────────────────────

  // Socket notifications
  emitRequestCompletedEvents({ request, updatedRequest, user: req.user });

  return { status: 200, body: { success: true, request: updatedRequest } };
};

// ─────────────────────────────────────────────────────────────────────────────
// RATE HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const rateHelper = async (req) => {
  const { rating } = req.body;
  const request = await Request.findById(req.params.id);

  if (!request) return { status: 404, body: { success: false, message: 'Request not found' } };
  if (request.createdBy.toString() !== req.user._id.toString()) {
    return { status: 403, body: { success: false, message: 'Only request creator can rate' } };
  }
  if (request.status !== 'completed') {
    return { status: 400, body: { success: false, message: 'Request must be completed to rate' } };
  }
  if (request.rated) {
    return { status: 400, body: { success: false, message: 'Already rated' } };
  }

  const helper       = await User.findById(request.acceptedBy);
  const totalRatings = helper.totalRatings || 0;
  const newRating    = (helper.rating * totalRatings + rating) / (totalRatings + 1);
  helper.rating       = Math.round(newRating * 10) / 10;
  helper.totalRatings = totalRatings + 1;
  await helper.save();

  request.rated = true;
  await request.save();

  return { status: 200, body: { success: true, message: 'Rating submitted successfully' } };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL REQUESTS (Admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @returns {Promise<{ status: number, body: object }>}
 */
const getAllRequests = async () => {
  const rawRequests = await Request.find({ isDeleted: false })
    .populate('createdBy', 'name email isVerified')
    .populate('acceptedBy', 'name email isVerified')
    .lean();

  const requests = rawRequests.map(r => ({
    ...r,
    type: r.isSOS
      ? (r.requesterType === 'guest' ? 'GUEST_SOS' : 'USER_SOS')
      : 'REQUEST',
  }));

  requests.sort((a, b) => {
    const aIsSOS = a.isSOS ? 1 : 0;
    const bIsSOS = b.isSOS ? 1 : 0;
    if (bIsSOS !== aIsSOS) return bIsSOS - aIsSOS;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return { status: 200, body: { success: true, count: requests.length, requests } };
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE REQUEST (Admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const deleteRequestAdmin = async (req) => {
  const request = await Request.findById(req.params.id);
  if (!request) return { status: 404, body: { success: false, message: 'Request not found' } };
  request.isDeleted = true;
  request.deletedAt = new Date();
  await request.save();
  return { status: 200, body: { success: true, message: 'Request deleted successfully' } };
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE REQUEST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ✅ updateRequest — authenticated users only, open requests only.
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const updateRequest = async (req) => {
  const request = await Request.findById(req.params.id);
  if (!request) return { status: 404, body: { success: false, message: 'Not found' } };

  if (!req.user) {
    return { status: 403, body: { success: false, message: 'Only users can edit fully' } };
  }

  if (request.createdBy && request.createdBy.toString() !== req.user._id.toString()) {
    return { status: 403, body: { success: false, message: 'You can only edit your own requests' } };
  }

  if (request.status !== 'open') {
    return { status: 400, body: { success: false, message: 'Cannot edit — request is no longer pending' } };
  }

  // FIX 7 — all fields optional in update
  const allowed = ['title', 'description', 'category', 'urgency'];
  allowed.forEach(field => {
    if (req.body[field] !== undefined && req.body[field] !== '') {
      request[field] = req.body[field];
    }
  });

  if (req.files && req.files.length > 0) {
    const newImages = req.files.map(file => ({ url: file.path }));
    request.media = {
      images: [...(request.media?.images || []), ...newImages],
      uploadedBy: 'user',
    };
  }

  request.isEnhanced = true;
  await request.save();

  const updated = await Request.findById(request._id)
    .populate('createdBy', 'name email phoneNumber isVerified');

  // Socket notifications
  emitRequestUpdatedEvents({ updated, user: req.user });

  return { status: 200, body: { success: true, request: updated } };
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD GUEST IMAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ✅ ADDED (FIX 4) — guest-image upload.
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const addGuestImage = async (req) => {
  const request = await Request.findById(req.params.id);
  if (!request) return { status: 404, body: { success: false, message: 'Request not found' } };

  const isGuestRequest = request.isGuest || request.requesterType === 'guest';
  if (!isGuestRequest) {
    return { status: 403, body: { success: false, message: 'Only guest SOS requests can use this endpoint' } };
  }

  const existingImages = (request.media?.images || []).filter(img => img?.url);
  if (existingImages.length >= 1) {
    return { status: 400, body: { success: false, message: 'Only one image allowed for guest SOS' } };
  }

  if (!req.file) {
    return { status: 400, body: { success: false, message: 'No image provided' } };
  }

  request.media = {
    images: [{ url: req.file.path }],
    uploadedBy: 'guest',
  };

  await request.save();
  return { status: 200, body: { success: true, request } };
};

// ─────────────────────────────────────────────────────────────────────────────
// TRACK BY PUBLIC ID
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ✅ NEW — Get request by publicId (e.g. HL-REQ-000123).
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const trackByPublicId = async (req) => {
  const { publicId } = req.params;

  if (!publicId || !publicId.startsWith('HL-REQ-')) {
    return {
      status: 400,
      body: { success: false, message: 'Invalid public ID format. Expected HL-REQ-XXXXXX' },
    };
  }

  const request = await Request
    .findOne({ publicId })
    .populate('acceptedBy', 'name phoneNumber location');

  if (!request) {
    return { status: 404, body: { success: false, message: 'No request found with this ID' } };
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

  return {
    status: 200,
    body: {
      success: true,
      _id:           request._id,
      publicId:      request.publicId,
      status:        request.status,
      location:      request.location,
      requesterType: request.requesterType,
      actorType:     request.actorType,
      isSOS:         request.isSOS,
      isGuest:       request.isGuest,
      category:      request.category,
      title:         request.title,
      description:   request.description,
      urgency:       request.urgency,
      isEnhanced:    request.isEnhanced,
      media:         request.media,
      createdAt:     request.createdAt,
      helper: request.acceptedBy
        ? {
            name:     request.acceptedBy.name,
            phone:    request.acceptedBy.phoneNumber,
            location: request.acceptedBy.location,
          }
        : null,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND TO AFTERCARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send basic incident data to UniCare aftercare endpoint.
 * Reads consent + userNote from req.body and forwards them to UniCare.
 *
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const sendToAftercare = async (req) => {
  const request = await Request.findById(req.params.id);
  if (!request) {
    return { status: 404, body: { success: false, message: 'Request not found' } };
  }

  const unicareBase = process.env.UNICARE_API;
  if (!unicareBase) {
    console.error('sendToAftercare: UNICARE_API is not set in .env');
    return {
      status: 503,
      body: { success: false, message: 'Aftercare service is not configured on this server.' },
    };
  }

  // ── Read consent + userNote forwarded from the frontend ───────────────────
  const consentFromBody  = req.body?.consent  || null;
  const userNoteFromBody = req.body?.userNote  || '';
  const isAnonymous      = req.body?.anonymous || false;

  // ── Build payload ─────────────────────────────────────────────────────────
  let payload;

  if (req.user) {
    const EmergencyProfile = require('../models/EmergencyProfile');
    const profile = await EmergencyProfile.findOne({ user: req.user._id });

    payload = {
      requestId:           String(request._id),
      userId:              isAnonymous ? null : String(req.user._id),
      guestId:             null,
      name:                (consentFromBody?.contact === false || isAnonymous)
                             ? 'Anonymous'
                             : req.user.name,
      incidentType:        request.category    || 'unknown',
      notes:               request.description || '',
      location:            consentFromBody?.location === false
                             ? null
                             : (request.location || null),
      time:                request.createdAt,
      hasEmergencyProfile: !!profile,
      source:              'helplink',
      // ✅ Forward consent + userNote to UniCare
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
      location:     consentFromBody?.location === false
                      ? null
                      : (request.location || null),
      time:         request.createdAt,
      source:       'helplink',
      // ✅ Forward consent + userNote to UniCare
      consent:      consentFromBody,
      userNote:     userNoteFromBody,
    };
  }

  // NOTE: axios errors (error.response / error.request) are intentionally
  // NOT caught here — they bubble up to the controller which handles 502 cases.
  const unicareRes = await axios.post(
    `${unicareBase}/aftercare`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    process.env.AFTERCARE_SECRET || '',
      },
      timeout: 8000,
    }
  );

  return {
    status: 200,
    body: {
      success:   true,
      message:   'Aftercare data sent successfully',
      data:      unicareRes.data,
      isGuest:   !req.user,
      requestId: String(request._id),
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND MEDICAL PROFILE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send full medical profile to UniCare (ONLY on explicit user consent).
 * @param {import('express').Request} req
 * @returns {Promise<{ status: number, body: object }>}
 */
const sendMedicalProfile = async (req) => {
  const EmergencyProfile = require('../models/EmergencyProfile');
  const profile = await EmergencyProfile.findOne({ user: req.user._id });

  if (!profile) {
    return { status: 404, body: { success: false, message: 'No emergency profile found for this user' } };
  }

  const payload = {
    userId:            req.user._id,
    bloodGroup:        profile.bloodGroup        || null,
    allergies:         profile.allergies         || [],
    medicalConditions: profile.medicalConditions || [],
    medications:       profile.medications       || [],
    emergencyContacts: profile.emergencyContacts || [],
  };

  const unicareBase = process.env.UNICARE_API;
  if (!unicareBase) {
    console.error('sendMedicalProfile: UNICARE_API is not set in .env');
    return {
      status: 503,
      body: { success: false, message: 'Aftercare service is not configured on this server.' },
    };
  }

  // NOTE: axios errors bubble up to the controller for 502 handling.
  const unicareRes = await axios.post(
    `${unicareBase}/aftercare/profile`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    process.env.AFTERCARE_SECRET || '',
      },
      timeout: 8000,
    }
  );

  return {
    status: 200,
    body: {
      success: true,
      message: 'Medical profile sent to UniCare successfully',
      data:    unicareRes.data,
    },
  };
};

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
  updateRequest,
  addGuestImage,
  trackByPublicId,
  sendToAftercare,
  sendMedicalProfile,
};