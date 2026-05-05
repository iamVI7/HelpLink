const socketIO = require('socket.io');
const mongoose = require('mongoose');

let io;
const userSocketMap = new Map(); // userId → socketId
const onlineUsers   = new Set(); // userId set — ONLY real ObjectId strings go here

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.use((socket, next) => {
    const userId  = socket.handshake.auth?.userId;
    const role    = socket.handshake.auth?.role;
    const guestId = socket.handshake.auth?.guestId;

    if (!userId && !guestId) {
      console.log('⚠️ Unauthorized socket attempt');
      return next(new Error('Unauthorized'));
    }

    if (guestId) {
      socket.userId  = null;
      socket.role    = 'guest';
      socket.guestId = guestId;
      return next();
    }

    socket.userId = userId;
    socket.role   = role || 'user';
    return next();
  });

  io.on('connection', (socket) => {
    // ✅ Auto join guest room
    if (socket.role === 'guest' && socket.guestId) {
      socket.join(`sos_${socket.guestId}`);
      console.log(`🆘 Guest auto-joined room: sos_${socket.guestId}`);
    }

    console.log('🔌 New client connected:', socket.id);

    const userId = socket.userId;

    if (userId) {
      userSocketMap.set(userId, socket.id);
      onlineUsers.add(String(userId));

      const User = require('../models/User');
      User.findByIdAndUpdate(userId, {
        isActive: true,
        lastSeen: new Date()
      }).exec();
    }

    // 🔥 HEARTBEAT — keep user active
    const interval = setInterval(() => {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return;
      const User = require('../models/User');
      User.findByIdAndUpdate(userId, { lastSeen: new Date() }).exec();
    }, 5000);

    socket.on('disconnect', () => {
      clearInterval(interval);
    });

    if (socket.role === 'guest' && socket.guestId) {
      console.log(`👤 Guest ${socket.guestId} connected`);
    }

    // Update user location
    socket.on('update_location', (data) => {
      const userId = socket.userId;
      const { location } = data;
      if (userId && location) {
        socket.userLocation = location;
        socket.broadcast.emit('helper_location', {
          userId: socket.userId,
          lat: location[1],
          lng: location[0],
          role: socket.role
        });
        console.log(`📍 User ${userId} location updated: [${location[0]}, ${location[1]}]`);
      }
    });

    // Join request room
    socket.on('join_request_room', (requestId) => {
      if (requestId) {
        socket.join(`request_${requestId}`);
        console.log(`📢 Socket ${socket.id} joined room request_${requestId}`);
      }
    });

    // Leave request room
    socket.on('leave_request_room', (requestId) => {
      if (requestId) {
        socket.leave(`request_${requestId}`);
        console.log(`👋 Socket ${socket.id} left room request_${requestId}`);
      }
    });

    // Guest SOS join room
    socket.on('join_sos_room', (guestId) => {
      if (guestId) {
        socket.join(`sos_${guestId}`);
        console.log(`🆘 Guest ${guestId} joined SOS room`);
      }
    });

    // ── Feature 4: join_request ───────────────────────────────────────────────
    socket.on('join_request', (requestId) => {
      if (!requestId) return;

      const room = `viewers_${requestId}`;
      socket.join(room);

      if (!socket.viewerRooms) socket.viewerRooms = new Set();
      socket.viewerRooms.add(room);

      const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      console.log(`👀 Socket ${socket.id} viewing request ${requestId} — ${roomSize} viewer(s)`);
      io.to(room).emit('viewer_count', { requestId, count: roomSize });
    });

    // ── Feature 4: leave_request ─────────────────────────────────────────────
    socket.on('leave_request', (requestId) => {
      if (!requestId) return;

      const room = `viewers_${requestId}`;
      socket.leave(room);

      const count = io.sockets.adapter.rooms.get(room)?.size || 0;
      console.log(`👋 Socket ${socket.id} left request ${requestId} — ${count} viewer(s)`);
      io.to(room).emit('viewer_count', { requestId, count });
    });

    // ── ✅ NEW: request_cancelled relay ───────────────────────────────────────
    // When the cancelRequest controller emits to request_<id> and sos_<guestId>,
    // this handler ensures helpers who are watching via join_request also get
    // notified through the viewers_ room so they can remove the card from
    // their feed without a page refresh.
    socket.on('request_cancelled', ({ requestId, reason }) => {
      if (!requestId) return;

      // Relay to the viewers room (helpers browsing nearby requests)
      const viewersRoom = `viewers_${requestId}`;
      io.to(viewersRoom).emit('request_cancelled', { requestId, reason });

      console.log(`🚫 Relayed request_cancelled for ${requestId} to viewers room`);
    });
    // ── END: request_cancelled relay ──────────────────────────────────────────

    // Disconnect — cleanup
    socket.on('disconnect', () => {
      let disconnectedUserId = null;

      for (let [userId, socketId] of userSocketMap.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          userSocketMap.delete(userId);
          onlineUsers.delete(userId);
          break;
        }
      }

      if (socket.role === 'guest' && socket.guestId) {
        console.log(`👤 Guest ${socket.guestId} disconnected`);
      }

      if (disconnectedUserId) {
        console.log(`❌ User ${disconnectedUserId} disconnected`);
        const User = require('../models/User');
        User.findByIdAndUpdate(disconnectedUserId, { lastSeen: new Date() }).exec();
      }

      console.log('🔌 Client disconnected:', socket.id);
      console.log('👥 Active users:', Array.from(userSocketMap.keys()));

      // Feature 4: after disconnect, update viewer counts
      setImmediate(() => {
        if (!socket.viewerRooms) return;
        for (const room of socket.viewerRooms) {
          const requestId = room.replace('viewers_', '');
          const count = io.sockets.adapter.rooms.get(room)?.size || 0;
          io.to(room).emit('viewer_count', { requestId, count });
        }
      });
    });
  });

  return io;
};

const getSocketIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const getUserSocketId = (userId) => {
  return userSocketMap.get(userId);
};

const getOnlineUserIds = () => Array.from(onlineUsers);

module.exports = {
  initSocket,
  getSocketIO,
  getUserSocketId,
  getOnlineUserIds,
};