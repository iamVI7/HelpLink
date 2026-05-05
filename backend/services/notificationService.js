// services/notificationService.js
// All socket.io emission logic and nearby-user detection.
// Extracted from createRequest and other handlers — logic is UNCHANGED.

const mongoose = require('mongoose');
const User    = require('../models/User');
const { getSocketIO, getUserSocketId } = require('../socket');
const { calculateDistance, calculateETA } = require('../utils/distance');

/**
 * Emit all socket events after a new request is created.
 *
 * @param {object} params
 * @param {object}      params.request           - raw saved Request doc
 * @param {object}      params.populatedRequest  - populated version (or same as request)
 * @param {object}      params.requestDoc        - plain doc used for creation
 * @param {boolean}     params.isSOS
 * @param {string|null} params.userId
 * @param {number[]}    params.coordinates       - [lng, lat]
 */
const emitNewRequestEvents = async ({
  request,
  populatedRequest,
  requestDoc,
  isSOS,
  userId,
  coordinates,
}) => {
  try {
    const io = getSocketIO();
    if (!io) return;

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

    // Only run nearby-user detection for logged-in users with a valid ObjectId.
    // Guest IDs (e.g. "HL-GUEST-000043") are strings — Mongoose cannot cast them
    // to ObjectId for _id queries, which causes a CastError. Skip entirely for guests.
    const isValidObjectId = userId && mongoose.Types.ObjectId.isValid(userId);
    if (isValidObjectId) {
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
  } catch (socketError) {
    console.error('Socket error (non-fatal):', socketError.message);
  }
};

/**
 * Emit socket events when a request is accepted.
 *
 * @param {object} params
 * @param {object} params.request         - original (pre-update) request
 * @param {object} params.updatedRequest  - populated updated request
 * @param {object} params.user            - req.user
 */
const emitRequestAcceptedEvents = ({ request, updatedRequest, user }) => {
  try {
    const io = getSocketIO();
    if (!io) return;

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
        helper: { name: user.name, phone: user.phoneNumber },
      });
    }

    io.emit('request_updated', { request: updatedRequest });
    io.emit('request_taken', { requestId: request._id });
  } catch (socketError) {
    console.error('Socket emit error (non-fatal):', socketError.message);
  }
};

/**
 * Emit socket events when a request is completed.
 *
 * @param {object} params
 * @param {object} params.request         - original request doc
 * @param {object} params.updatedRequest  - populated updated request
 * @param {object} params.user            - req.user
 */
const emitRequestCompletedEvents = ({ request, updatedRequest, user }) => {
  try {
    const io = getSocketIO();
    if (!io) return;

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
      message: `✔ Request "${request.title}" marked completed by ${user.name}`,
    });
  } catch (socketError) {
    console.error('Socket emit error (non-fatal):', socketError.message);
  }
};

/**
 * Emit socket events when a request is updated/enhanced.
 *
 * @param {object} params
 * @param {object} params.updated - populated updated request
 * @param {object} params.user    - req.user
 */
const emitRequestUpdatedEvents = ({ updated, user }) => {
  try {
    const io = getSocketIO();
    if (!io) return;
    io.emit('request_updated', { request: updated });
    io.emit('admin_request_updated', {
      request: updated,
      message: `✏️ Request "${updated.title}" was enhanced by ${user.name}`,
    });
  } catch (socketError) {
    console.error('Socket emit error (non-fatal):', socketError.message);
  }
};

module.exports = {
  emitNewRequestEvents,
  emitRequestAcceptedEvents,
  emitRequestCompletedEvents,
  emitRequestUpdatedEvents,
};