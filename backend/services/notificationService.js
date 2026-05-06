// services/notificationService.js
// All socket.io emission logic and nearby-user detection.
// Extracted from createRequest and other handlers — existing logic is UNCHANGED.
// ✅ NEW: emitNewRequestEvents now also fires sos_activity_update back to the
//         guest's SOS room so the frontend activity feed shows real data.

const mongoose = require('mongoose');
const User    = require('../models/User');
const Request = require('../models/Request');
const { getSocketIO, getUserSocketId } = require('../socket');
const { calculateDistance, calculateETA } = require('../utils/distance');

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper: compute activity stats from a list of nearbyUsers
// and the request's coordinates, then persist + emit to guest room.
//
// @param {object}   request     - Mongoose doc (will be mutated + saved)
// @param {object[]} nearbyUsers - lean user docs with location.coordinates
// @param {number[]} coordinates - [lng, lat] of the request
// @param {object}   io          - socket.io server instance
// ─────────────────────────────────────────────────────────────────────────────
const _persistAndEmitActivityUpdate = async (request, nearbyUsers, coordinates, io) => {
  try {
    const count = nearbyUsers.length;

    // Find the nearest helper distance (km) among this wave's users
    let nearestKm = null;
    if (count > 0) {
      const [rLng, rLat] = coordinates;
      let minDist = Infinity;
      nearbyUsers.forEach(u => {
        if (u.location?.coordinates) {
          const [uLng, uLat] = u.location.coordinates;
          const d = calculateDistance(uLat, uLng, rLat, rLng); // returns km
          if (d < minDist) minDist = d;
        }
      });
      nearestKm = minDist === Infinity ? null : Math.round(minDist * 10) / 10;
    }

    // ── Persist to DB atomically ──────────────────────────────────────────
    // Use $inc for notifiedCount so concurrent rebroadcast cycles don't
    // overwrite each other; set nearestHelperDistance only when we have a
    // value (keeps the last known distance if the new wave found nobody).
    const updateOp = {
      $inc: { notifiedCount: count },
    };
    if (nearestKm !== null) {
      updateOp.$set = { nearestHelperDistance: nearestKm };
    }

    const updated = await Request.findByIdAndUpdate(
      request._id,
      updateOp,
      { returnDocument: 'after', select: 'notifiedCount nearestHelperDistance guestId' }
    );

    if (!updated) return; // request was deleted in the meantime

    // ── Emit sos_activity_update to the guest's room ──────────────────────
    // The guest socket auto-joins sos_<guestId> on connect, so this lands
    // immediately without any extra plumbing.
    if (updated.guestId) {
      io.to(`sos_${updated.guestId}`).emit('sos_activity_update', {
        requestId:             String(request._id),
        notifiedCount:         updated.notifiedCount,
        nearestHelperDistance: updated.nearestHelperDistance, // km or null
      });
    }

    // Also emit to request room (helpers' TrackingPage, admin dashboard, etc.)
    io.to(`request_${request._id}`).emit('sos_activity_update', {
      requestId:             String(request._id),
      notifiedCount:         updated.notifiedCount,
      nearestHelperDistance: updated.nearestHelperDistance,
    });

  } catch (err) {
    // Non-fatal — activity feed is cosmetic; don't crash the main flow
    console.warn('_persistAndEmitActivityUpdate (non-fatal):', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emit all socket events after a new request is created.
 * ✅ NEW: also fires sos_activity_update after the initial nearby-user wave.
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

    // ── Existing broadcasts — UNCHANGED ──────────────────────────────────
    io.emit('admin_new_request', {
      request: socketPayload,
      message: isSOS
        ? `🚨 SOS received — ${requestDoc.category.toUpperCase()}`
        : `🚨 New request created: ${requestDoc.title}`,
    });

    if (isSOS) {
      io.emit('new_sos', { requestId: request._id, message: '🆘 New SOS triggered' });
    }

    // ── Nearby-user detection (existing logic — UNCHANGED) ────────────────
    // Only for logged-in users with a valid ObjectId; skip guests entirely.
    const isValidObjectId = userId && mongoose.Types.ObjectId.isValid(userId);

    let nearbyUsers = [];

    if (isValidObjectId) {
      nearbyUsers = await User.find({
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
    } else {
      // Guest SOS — query nearby users without the $ne userId constraint
      // so we still get a count for the activity feed, but we DON'T block
      // on this because the guest flow is latency-sensitive.
      // We do this in a separate, non-blocking path so the HTTP response
      // is not delayed waiting for the DB query.
      if (coordinates && coordinates.length === 2 && request.isSOS) {
        // Fire-and-forget — errors are caught inside the helper
        (async () => {
          try {
            const guestNearby = await User.find({
              isAvailable: true,
              location: {
                $near: {
                  $geometry: { type: 'Point', coordinates },
                  $maxDistance: request.radius || 5000,
                },
              },
            }).select('_id location').lean();

            // Notify helpers of the new SOS just like the user path does
            guestNearby.forEach(nearUser => {
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
                  message: `🚨 New ${requestDoc.urgency} urgency SOS nearby`,
                });
              }
            });

            // ✅ NEW — update activity feed for the guest
            await _persistAndEmitActivityUpdate(request, guestNearby, coordinates, io);
          } catch (e) {
            console.warn('Guest SOS nearby query (non-fatal):', e.message);
          }
        })();

        // Return early — activity update is handled above asynchronously
        return;
      }
    }

    // ✅ NEW — update activity feed (user SOS / normal request path)
    // Only meaningful for SOS requests that have a guest room to emit to,
    // but we always persist the count so the poll fallback also works.
    if (isSOS || request.isSOS) {
      await _persistAndEmitActivityUpdate(request, nearbyUsers, coordinates, io);
    }

  } catch (socketError) {
    console.error('Socket error (non-fatal):', socketError.message);
  }
};

/**
 * Emit socket events when a request is accepted.
 * UNCHANGED from original.
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
 * UNCHANGED from original.
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
 * UNCHANGED from original.
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
  // ✅ exported so rebroadcastService can reuse the same helper
  _persistAndEmitActivityUpdate,
};