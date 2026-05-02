const Request = require('../models/Request');
const User = require('../models/User');
const { getSocketIO, getUserSocketId } = require('../socket');
const { calculateDistance, calculateETA } = require('../utils/distance');

// ✅ NEW — sequential ID generator (only imported, never replaces existing logic)
const { generateRequestId, generateGuestId } = require('../utils/idGenerator');
const axios = require('axios');

// ── SOS COOLDOWN ─────────────────────────────────────────────────────────────
const SOS_COOLDOWN = 60 * 1000; // 60 seconds

// ── GUIDANCE MAP ─────────────────────────────────────────────────────────────
const guidanceMap = {
  medical: [
    'Stay conscious and keep breathing slowly',
    'Apply firm pressure to any bleeding wound',
    'Do not move if you suspect a spinal injury',
    'Loosen tight clothing around neck and chest',
    'Keep the person warm and calm until help arrives',
  ],
  accident: [
    'Move to a safe area away from traffic',
    'Turn on hazard lights if in a vehicle',
    'Check yourself and others for injuries',
    'Do not move an injured person unless in immediate danger',
    'Stay on the line with emergency services',
  ],
  danger: [
    'Move to a crowded, well-lit public place immediately',
    'Avoid confrontation — your safety is priority',
    'Call emergency services when it is safe to do so',
    'Attract attention by making noise if threatened',
    'Lock yourself in a secure location if possible',
  ],
  critical: [
    'Stay calm — panicking increases risk',
    'Help is on the way — keep your phone active',
    'Stay in your current location unless unsafe',
    'Signal your location (wave, flashlight, noise)',
    'Keep airways clear and breathe steadily',
  ],
  emergency: [
    'Call emergency services immediately if not done',
    'Keep bystanders at a safe distance',
    'Stay with the affected person and monitor breathing',
    'Do not give food or water to an unconscious person',
    'Help is dispatched — stay visible and accessible',
  ],
  default: [
    'Stay calm and assess your surroundings',
    'Keep your phone charged and accessible',
    'Help has been notified — stay put',
    'Signal your location clearly',
    'Contact a trusted person nearby',
  ],
};

// ── SAFE COOLDOWN HELPER ──────────────────────────────────────────────────────
const buildCooldownQuery = (req) => {
  if (req.user?._id) {
    return { isSOS: true, createdBy: req.user._id };
  }
  const guestId = req.body?.guestId;
  if (guestId && typeof guestId === 'string' && guestId.trim() !== '') {
    return { isSOS: true, guestId: guestId.trim() };
  }
  return null;
};

// @desc    Create new request (unified — guests + users + SOS)
// @route   POST /api/requests  (normal) | POST /api/requests/sos (SOS)
// @access  Public (SOS) | Private (normal)
const createRequest = async (req, res) => {
  try {
    // ✅ FIX 6 — parse location string → object
    if (typeof req.body.location === 'string') {
      req.body.location = JSON.parse(req.body.location);
    }

    const userId  = req.user?._id || null;
    const guestId = req.body.guestId || null;
    const isSOS   = req.body.isSOS === 'true' || req.body.isSOS === true;

    // Non-SOS requests still require auth
    if (!isSOS && !userId) {
      return res.status(401).json({ success: false, message: 'Authentication required for non-SOS requests' });
    }

    // ✅ FIX 5 — active request guard (return existing open/accepted SOS)
    if (isSOS) {
      const existing = await Request.findOne({
        ...(userId ? { createdBy: userId } : { guestId }),
        status: { $in: ['open', 'accepted'] },
        isSOS: true,
        isDeleted: false,
      });
      if (existing) {
        return res.json({
          success: true,
          request: existing,
          requestId: existing._id,
          publicId: existing.publicId || null,
          guidance: guidanceMap[existing.category] || guidanceMap.default,
          message: 'Existing active SOS returned',
        });
      }
    }

    // ✅ Duplicate SOS guard (within 15 seconds)
    if (isSOS) {
      const recent = await Request.findOne({
        ...(userId ? { createdBy: userId } : { guestId }),
        isSOS: true,
        createdAt: { $gte: new Date(Date.now() - 15000) },
      });
      if (recent) {
        return res.json({
          success: true,
          request: recent,
          requestId: recent._id,
          publicId: recent.publicId || null,
          guidance: guidanceMap[recent.category] || guidanceMap.default,
        });
      }
    }

    // ── SOS cooldown (60 s) ───────────────────────────────────────────────
    if (isSOS) {
      const cooldownQuery = buildCooldownQuery(req);
      if (cooldownQuery) {
        const lastSOS = await Request.findOne(cooldownQuery).sort({ createdAt: -1 });
        if (lastSOS) {
          const diff = Date.now() - new Date(lastSOS.createdAt).getTime();
          if (diff < SOS_COOLDOWN) {
            const remaining = Math.ceil((SOS_COOLDOWN - diff) / 1000);
            return res.status(429).json({
              success: false,
              message: `Please wait ${remaining}s before sending another SOS`,
            });
          }
        }
      }
    }

    const { title, description, category, urgency, location, address } = req.body;

    // ── MEDIA HANDLING ────────────────────────────────────────────────────
    let mediaData = { images: [], uploadedBy: userId ? 'user' : 'guest' };
    if (req.files && req.files.length > 0) {
      const limit = isSOS ? 1 : req.files.length;
      mediaData.images = req.files.slice(0, limit).map(file => ({
        url: file.path,
      }));
    }

    // ✅ FIX 6 — standardize location: always store as GeoJSON Point [lng, lat]
    const locationStatus = req.body.locationStatus || 'available';
    let coordinates;

    if (isSOS && location && typeof location.lat === 'number' && typeof location.lng === 'number') {
      coordinates = [location.lng, location.lat];
    } else if (location && location.coordinates && location.coordinates.length === 2) {
      coordinates = location.coordinates;
    } else {
      return res.status(400).json({ success: false, message: 'Valid location is required' });
    }

    // ── NEW: Generate public sequential ID ────────────────────────────────
    // Always generate a publicId for every new request.
    // For guest SOS: also generate a structured HL-GUEST-XXXXXX ID if no
    // human-readable guestId was supplied by the client.
    let publicId;
    let resolvedGuestId = null;
    let actorType;

    if (userId) {
      actorType      = 'user';
      publicId       = await generateRequestId();
    } else {
      actorType      = 'guest';
      publicId       = await generateRequestId();
      // Use an HL-GUEST ID as the canonical guest identifier when the client
      // sent a raw UUID or nothing useful — keeps guest IDs human-readable too.
      const rawGuestId = (guestId && guestId.trim()) ? guestId.trim() : null;
      const isAlreadyStructured = rawGuestId && rawGuestId.startsWith('HL-GUEST-');
      resolvedGuestId = isAlreadyStructured
        ? rawGuestId
        : await generateGuestId();
    }
    // ── END: Generate public sequential ID ───────────────────────────────

    // ── Build request document ────────────────────────────────────────────
    const requestDoc = {
      title: title || (isSOS ? `🚨 SOS — ${(category || 'critical').toUpperCase()}` : undefined),
      description: description || (isSOS
        ? (userId ? `Emergency SOS triggered by user` : `Automated SOS by guest (${resolvedGuestId || guestId})`)
        : undefined),
      category: category || (isSOS ? 'critical' : 'other'),
      urgency: urgency || (isSOS ? 'critical' : 'medium'),
      location: { type: 'Point', coordinates },
      address: address || (isSOS ? 'Location captured via GPS' : undefined),
      isSOS,
      isGuest: !userId,
      locationStatus,
      radius: 5000,
      rebroadcastCount: 0,
      lastBroadcastedAt: new Date(),
      media: mediaData,
      emergencyProfileSnapshot: req.emergencyProfileSnapshot ?? null,
      // ✅ NEW — sequential ID fields
      publicId,
      actorType,
    };

    if (userId) {
      requestDoc.createdBy     = userId;
      requestDoc.requesterType = 'user';
    } else {
      requestDoc.guestId       = resolvedGuestId;
      requestDoc.requesterType = 'guest';
      requestDoc.createdBy     = null;
    }

    const request = await Request.create(requestDoc);

    let populatedRequest = request;
    if (userId) {
      populatedRequest = await Request.findById(request._id).populate({
        path: 'createdBy',
        select: 'name email phoneNumber rating location address isVerified',
        strictPopulate: false,
      });
    }

    const guidance = guidanceMap[requestDoc.category] || guidanceMap.default;

    // ── UniCare readiness: log payload when status becomes "completed" ────
    // This block fires on the CREATION response — the actual completion hook
    // is in completeRequest below. Kept here for initial payload logging.
    // (No API call yet — only console.log as per spec)
    // ─────────────────────────────────────────────────────────────────────

    res.status(201).json({
      success: true,
      request: populatedRequest,
      requestId: request._id,
      // ✅ NEW — always include publicId in response
      publicId: request.publicId,
      guidance,
      message: isSOS
        ? (userId ? 'Your emergency SOS has been sent' : 'SOS sent successfully. Help is on the way')
        : 'Alert sent. Notifying nearby helpers...',
    });

    // ── SOCKET NOTIFICATIONS ──────────────────────────────────────────────
    try {
      const io = getSocketIO();
      if (io) {
        const socketPayload = {
          ...(populatedRequest.toObject ? populatedRequest.toObject() : populatedRequest),
          type: isSOS
            ? (request.requesterType === 'guest' ? 'GUEST_SOS' : 'USER_SOS')
            : 'REQUEST',
        };

        io.emit('admin_new_request', {
          request: socketPayload,
          message: isSOS
            ? `🚨 SOS received — ${requestDoc.category.toUpperCase()}`
            : `🚨 New request created: ${requestDoc.title}`,
        });

        if (isSOS) {
          io.emit('new_sos', { requestId: request._id, message: '🆘 New SOS triggered' });
        }

        if (userId) {
          const nearbyUsers = await User.find({
            _id: { $ne: userId },
            isAvailable: true,
            location: {
              $near: {
                $geometry: { type: 'Point', coordinates },
                $maxDistance: request.radius || 5000,
              },
            },
          }).select('_id location').lean();

          nearbyUsers.forEach(nearUser => {
            const socketId = getUserSocketId(nearUser._id.toString());
            if (socketId && nearUser.location?.coordinates) {
              const [uLng, uLat] = nearUser.location.coordinates;
              const [rLng, rLat] = coordinates;
              const distance = calculateDistance(uLat, uLng, rLat, rLng);
              const eta      = calculateETA(distance);
              io.to(socketId).emit('new_request', {
                request: {
                  ...(populatedRequest.toObject ? populatedRequest.toObject() : populatedRequest),
                  distance,
                  eta,
                },
                message: `🚨 New ${requestDoc.urgency} urgency request nearby`,
              });
            }
          });
        }
      }
    } catch (socketError) {
      console.error('Socket error (non-fatal):', socketError.message);
    }

  } catch (error) {
    console.error('createRequest error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get nearby requests
// @route   GET /api/requests/nearby
// @access  Private
const getNearbyRequests = async (req, res) => {
  try {
    const { lng, lat, radius = 5000 } = req.query;

    if (!lng || !lat) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates (lng, lat) are required',
      });
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

    res.json({ success: true, count: sortedRequests.length, requests: filteredRequests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get user's requests
// @route   GET /api/requests/my-requests
// @access  Private
const getMyRequests = async (req, res) => {
  try {
    const requests = await Request.find({ createdBy: req.user._id, isDeleted: false })
      .populate('createdBy', 'name email isVerified')
      .populate('acceptedBy', 'name email phoneNumber rating location')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get requests accepted by user
// @route   GET /api/requests/my-accepted
// @access  Private
const getMyAcceptedRequests = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const mongoose = require('mongoose');

    const requests = await Request.find({
      status: { $in: ['accepted', 'completed'] },
      acceptedBy: new mongoose.Types.ObjectId(req.user._id),
      isDeleted: false,
    })
      .populate({ path: 'createdBy', select: 'name email phoneNumber rating location address isVerified', strictPopulate: false })
      .populate({ path: 'acceptedBy', select: 'name email phoneNumber location', strictPopulate: false })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error('❌ getMyAcceptedRequests error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Accept request
// @route   PATCH /api/requests/:id/accept
// @access  Private
const acceptRequest = async (req, res) => {
  try {
    const request = await Request.findOneAndUpdate(
      { _id: req.params.id, status: 'open', createdBy: { $ne: req.user._id } },
      { status: 'accepted', acceptedBy: req.user._id },
      { returnDocument: 'after' }
    );

    if (!request) {
      return res.status(400).json({ success: false, message: 'Request already accepted' });
    }

    if (request.createdBy && request.createdBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot accept your own request' });
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

    res.json({ success: true, request: updatedRequest });

    const io = getSocketIO();
    if (io) {
      if (request.createdBy) {
        const creatorSocketId = getUserSocketId(request.createdBy.toString());
        if (creatorSocketId) {
          io.to(creatorSocketId).emit('request_accepted', {
            request: updatedRequest,
            message: `✅ Your request "${request.title}" has been accepted`,
          });
        }
      }

      if (request.requesterType === 'guest' && request.guestId) {
        io.to(`sos_${request.guestId}`).emit('requestAccepted', {
          requestId: request._id,
          helper: { name: req.user.name, phone: req.user.phoneNumber },
        });
      }

      io.emit('request_updated', { request: updatedRequest });
      io.emit('request_taken', { requestId: request._id });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Complete request
// @route   PATCH /api/requests/:id/complete
// @access  Private
const completeRequest = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Login required to complete a request' });
    }

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (request.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Only accepted requests can be marked as completed' });
    }

    if (!request.acceptedBy) {
      return res.status(400).json({ success: false, message: 'No one has accepted this request yet' });
    }

    const isAdmin        = req.user.role === 'admin';
    const isAssignedUser = request.acceptedBy.toString() === req.user._id.toString();

    if (!isAdmin && !isAssignedUser) {
      return res.status(403).json({ success: false, message: 'You can only complete requests that you have accepted' });
    }

    request.status      = 'completed';
    request.completedAt = new Date();
    await request.save();

    await User.findByIdAndUpdate(req.user._id, { $inc: { totalHelpGiven: 1 }, isAvailable: true });

    const updatedRequest = await Request.findById(req.params.id)
      .populate('createdBy', 'name email phoneNumber isVerified')
      .populate('acceptedBy', 'name email phoneNumber location');

    res.json({ success: true, request: updatedRequest });

    // ── UniCare Integration Prep ──────────────────────────────────────────
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
    // ── END UniCare Integration Prep ──────────────────────────────────────

    try {
      const io = getSocketIO();
      if (io) {
        if (request.requesterType !== 'guest' && request.createdBy) {
          const creatorSocketId = getUserSocketId(request.createdBy.toString());
          if (creatorSocketId) {
            io.to(creatorSocketId).emit('request_completed', {
              request: updatedRequest,
              message: `🎉 Your request "${request.title}" has been completed`,
            });
          }
        } else if (request.requesterType === 'guest' && request.guestId) {
          io.to(`sos_${request.guestId}`).emit('sos_completed', {
            requestId: request._id,
            message: '✅ Help has arrived and your SOS is now resolved.',
          });
        }

        io.emit('admin_request_completed', {
          request: updatedRequest,
          message: `✔ Request "${request.title}" marked completed by ${req.user.name}`,
        });
      }
    } catch (socketError) {
      console.error('Socket emit error (non-fatal):', socketError.message);
    }

  } catch (error) {
    console.error('completeRequest error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Rate helper after completion
// @route   POST /api/requests/:id/rate
// @access  Private
const rateHelper = async (req, res) => {
  try {
    const { rating } = req.body;
    const request = await Request.findById(req.params.id);

    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only request creator can rate' });
    }
    if (request.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Request must be completed to rate' });
    }
    if (request.rated) {
      return res.status(400).json({ success: false, message: 'Already rated' });
    }

    const helper       = await User.findById(request.acceptedBy);
    const totalRatings = helper.totalRatings || 0;
    const newRating    = (helper.rating * totalRatings + rating) / (totalRatings + 1);
    helper.rating       = Math.round(newRating * 10) / 10;
    helper.totalRatings = totalRatings + 1;
    await helper.save();

    request.rated = true;
    await request.save();

    res.json({ success: true, message: 'Rating submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Get ALL requests for admin
// @route   GET /api/requests/admin/all
// @access  Admin
const getAllRequests = async (req, res) => {
  try {
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

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error('getAllRequests error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete request (Admin)
// @route   PATCH /api/requests/admin/:id/delete
// @access  Admin
const deleteRequestAdmin = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    request.isDeleted = true;
    request.deletedAt = new Date();
    await request.save();
    res.json({ success: true, message: 'Request deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ updateRequest — authenticated users only, open requests only
// @desc    Update / enhance a request
// @route   PUT /api/requests/:id
// @access  Private
const updateRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });

    if (!req.user) {
      return res.status(403).json({ success: false, message: 'Only users can edit fully' });
    }

    if (request.createdBy && request.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own requests' });
    }

    if (request.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Cannot edit — request is no longer pending' });
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

    res.json({ success: true, request: updated });

    try {
      const io = getSocketIO();
      if (io) {
        io.emit('request_updated', { request: updated });
        io.emit('admin_request_updated', {
          request: updated,
          message: `✏️ Request "${updated.title}" was enhanced by ${req.user.name}`,
        });
      }
    } catch (socketError) {
      console.error('Socket emit error (non-fatal):', socketError.message);
    }

  } catch (error) {
    console.error('updateRequest error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ✅ ADDED (FIX 4) — guest-image upload: guests can add ONE photo to their own SOS
// @desc    Guest adds photo to their SOS request
// @route   PUT /api/requests/:id/guest-image
// @access  Public (no auth — validated by isGuest flag)
const addGuestImage = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    // Only allow on guest requests (check both isGuest flag and requesterType for compatibility)
    const isGuestRequest = request.isGuest || request.requesterType === 'guest';
    if (!isGuestRequest) {
      return res.status(403).json({ success: false, message: 'Only guest SOS requests can use this endpoint' });
    }

    // One image limit for guests — check for real images (not null placeholders)
    const existingImages = (request.media?.images || []).filter(img => img?.url);
    if (existingImages.length >= 1) {
      return res.status(400).json({ success: false, message: 'Only one image allowed for guest SOS' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image provided' });
    }

    request.media = {
      images: [{ url: req.file.path }],
      uploadedBy: 'guest',
    };

    await request.save();
    res.json({ success: true, request });

  } catch (error) {
    console.error('addGuestImage error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Kept for backward compat — delegates to unified createRequest
const createGuestSOS = createRequest;

// ─────────────────────────────────────────────────────────────────────────────
// ✅ NEW — TRACK BY PUBLIC ID
// @desc    Get request by publicId (e.g. HL-REQ-000123)
// @route   GET /api/requests/track/:publicId
// @access  Public (optionalAuth)
// ─────────────────────────────────────────────────────────────────────────────
const trackByPublicId = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId || !publicId.startsWith('HL-REQ-')) {
      return res.status(400).json({ success: false, message: 'Invalid public ID format. Expected HL-REQ-XXXXXX' });
    }

    const request = await Request
      .findOne({ publicId })
      .populate('acceptedBy', 'name phoneNumber location');

    if (!request) {
      return res.status(404).json({ success: false, message: 'No request found with this ID' });
    }

    // Apply same media-visibility rules as the /:id route
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
    });

  } catch (error) {
    console.error('trackByPublicId error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
// ── END: TRACK BY PUBLIC ID ───────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ✅ NEW — AFTERCARE BRIDGE (does NOT modify any existing logic above)
// ─────────────────────────────────────────────────────────────────────────────

// @desc    Send basic incident data to UniCare aftercare endpoint
// @route   POST /api/requests/:id/aftercare
// @access  Public (guests + logged-in users)
// ─────────────────────────────────────────────────────────────────────────────
// REPLACE only the sendToAftercare function in:
// helplink/backend/controllers/requestController.js
//
// FIX: Now reads consent + userNote from req.body and forwards them
// to UniCare so they get saved on the AftercareCase document.
// Previously the function built its own payload and ignored req.body fields.
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

    // ── Read consent + userNote forwarded from the frontend ───────────────
    // These come from AftercareButton.buildPayload via the POST body.
    const consentFromBody  = req.body?.consent  || null;
    const userNoteFromBody = req.body?.userNote  || '';
    const isAnonymous      = req.body?.anonymous || false;

    // ── Build payload ─────────────────────────────────────────────────────
    let payload;

    if (req.user) {
      const EmergencyProfile = require('../models/EmergencyProfile');
      const profile = await EmergencyProfile.findOne({ user: req.user._id });

      payload = {
        requestId:           String(request._id),
        userId:              isAnonymous ? null : String(req.user._id),
        guestId:             null,
        // Respect contact consent: if contact=false don't send real name
        name:                (consentFromBody?.contact === false || isAnonymous)
                               ? 'Anonymous'
                               : req.user.name,
        incidentType:        request.category    || 'unknown',
        notes:               request.description || '',
        // Respect location consent: if location=false send null
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

    return res.json({
      success:   true,
      message:   'Aftercare data sent successfully',
      data:      unicareRes.data,
      isGuest:   !req.user,
      requestId: String(request._id),
    });

  } catch (error) {
    if (error.response) {
      console.error('sendToAftercare: UniCare returned', error.response.status, error.response.data);
      return res.status(502).json({ success: false, message: `UniCare service returned ${error.response.status}` });
    }
    if (error.request) {
      console.error('sendToAftercare: No response from UniCare —', error.message);
      return res.status(502).json({ success: false, message: 'UniCare service is unreachable. Please make sure it is running.' });
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
    // req.user is guaranteed here because the route uses `protect` middleware
    const EmergencyProfile = require('../models/EmergencyProfile');
    const profile = await EmergencyProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'No emergency profile found for this user' });
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
      return res.status(503).json({
        success: false,
        message: 'Aftercare service is not configured on this server.',
      });
    }

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

    return res.json({
      success: true,
      message: 'Medical profile sent to UniCare successfully',
      data:    unicareRes.data,
    });

  } catch (error) {
    if (error.response) {
      console.error('sendMedicalProfile: UniCare returned', error.response.status, error.response.data);
      return res.status(502).json({ success: false, message: `UniCare service returned ${error.response.status}` });
    }
    if (error.request) {
      console.error('sendMedicalProfile: No response from UniCare —', error.message);
      return res.status(502).json({ success: false, message: 'UniCare service is unreachable. Please make sure it is running.' });
    }
    console.error('sendMedicalProfile error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
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
  createGuestSOS,
  updateRequest,
  addGuestImage,   // ✅ ADDED (FIX 4)
  // ✅ NEW — Aftercare Bridge
  sendToAftercare,
  sendMedicalProfile,
  // ✅ NEW — Public ID tracking
  trackByPublicId,
};