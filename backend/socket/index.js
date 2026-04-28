const socketIO = require('socket.io');

let io;
const userSocketMap = new Map(); // userId → socketId
const onlineUsers   = new Set(); // userId set for fast lookup

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // 🔐 ADD THIS BLOCK (AUTH MIDDLEWARE)
io.use((socket, next) => {
  const userId = socket.handshake.auth?.userId;
  const role   = socket.handshake.auth?.role;
  const guestId = socket.handshake.auth?.guestId;

  // ❌ Block if neither present
  if (!userId && !guestId) {
    console.log('⚠️ Unauthorized socket attempt');
    return next(new Error('Unauthorized'));
  }

  // ✅ Guest flow
  if (guestId) {
    socket.userId = null;
    socket.role = 'guest';
    socket.guestId = guestId;
    return next(); // ⚠️ IMPORTANT: stop execution here
  }

  // ✅ User flow
  socket.userId = userId;
  socket.role   = role || 'user';
  return next(); // ⚠️ IMPORTANT: single exit
});

  io.on('connection', (socket) => {
    // ✅ Auto join guest room
if (socket.role === 'guest' && socket.guestId) {
  socket.join(`sos_${socket.guestId}`);
  console.log(`🆘 Guest auto-joined room: sos_${socket.guestId}`);
}
    console.log('🔌 New client connected:', socket.id);

    const userId = socket.userId;

// ✅ Handle authenticated users
if (userId) {
  userSocketMap.set(userId, socket.id);
  onlineUsers.add(String(userId));

  // 🔥 ADD THIS
  const User = require('../models/User');
  User.findByIdAndUpdate(userId, {
    isActive: true,
    lastSeen: new Date()
  }).exec();
}

// 🔥 HEARTBEAT — keep user active
const interval = setInterval(() => {
  const User = require('../models/User');
  User.findByIdAndUpdate(userId, {
    lastSeen: new Date()
  }).exec();
}, 5000); // every 5 sec

socket.on('disconnect', () => {
  clearInterval(interval);
});

// ✅ Handle guests (NEW)
if (socket.role === 'guest' && socket.guestId) {
  onlineUsers.add(`guest_${socket.guestId}`);
  console.log(`👤 Guest ${socket.guestId} marked online`);
}
    // Register user (existing — untouched)
    

    // Update user location (existing — untouched)
    socket.on('update_location', (data) => {
  const userId = socket.userId;
  const { location } = data;
      if (userId && location) {
        socket.userLocation = location;
        socket.broadcast.emit('helper_location', {
  userId: socket.userId,
  lat: location[1],
  lng: location[0],
  role: socket.role // 🔥 ADD THIS
});
        console.log(`📍 User ${userId} location updated: [${location[0]}, ${location[1]}]`);
      }
    });

    // Join request room (existing — untouched)
    socket.on('join_request_room', (requestId) => {
      if (requestId) {
        socket.join(`request_${requestId}`);
        console.log(`📢 Socket ${socket.id} joined room request_${requestId}`);
      }
    });

    // Leave request room (existing — untouched)
    socket.on('leave_request_room', (requestId) => {
      if (requestId) {
        socket.leave(`request_${requestId}`);
        console.log(`👋 Socket ${socket.id} left room request_${requestId}`);
      }
    });

    // Guest SOS join room (existing — untouched)
    socket.on('join_sos_room', (guestId) => {
      if (guestId) {
        socket.join(`sos_${guestId}`);
        console.log(`🆘 Guest ${guestId} joined SOS room`);
      }
    });

    // ── Feature 4: join_request ───────────────────────────────────────────────
    // Client emits this when a RequestCard is rendered.
    // Socket joins a viewer room, backend counts members and broadcasts back.
    socket.on('join_request', (requestId) => {
  if (!requestId) return;

  const room = `viewers_${requestId}`;

  socket.join(room);

  // Track rooms per socket (for efficient cleanup)
  if (!socket.viewerRooms) socket.viewerRooms = new Set();
  socket.viewerRooms.add(room);

  const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;

  console.log(`👀 Socket ${socket.id} viewing request ${requestId} — ${roomSize} viewer(s)`);

  io.to(room).emit('viewer_count', { requestId, count: roomSize });
});
    // ─────────────────────────────────────────────────────────────────────────

    // ── Feature 4: leave_request (FIX: prevent memory leaks) ───────────────────
socket.on('leave_request', (requestId) => {
  if (!requestId) return;

  const room = `viewers_${requestId}`;
  socket.leave(room);

  const count = io.sockets.adapter.rooms.get(room)?.size || 0;

  console.log(`👋 Socket ${socket.id} left request ${requestId} — ${count} viewer(s)`);

  io.to(room).emit('viewer_count', { requestId, count });
});

    // Disconnect — cleanup both maps (existing logic + online set cleanup)
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

// ✅ 🔥 ADD EXACTLY HERE (AFTER LOOP)
if (socket.role === 'guest' && socket.guestId) {
  onlineUsers.delete(`guest_${socket.guestId}`);
  console.log(`👤 Guest ${socket.guestId} disconnected`);
}
      if (disconnectedUserId) {
        console.log(`❌ User ${disconnectedUserId} disconnected`);
      }
      
if (disconnectedUserId) {
  const User = require('../models/User');
  User.findByIdAndUpdate(disconnectedUserId, {
    lastSeen: new Date()
  }).exec();
}

      console.log('🔌 Client disconnected:', socket.id);
      console.log('👥 Active users:', Array.from(userSocketMap.keys()));

      // Feature 4: after disconnect, update viewer counts for any viewer rooms
      // this socket was part of. Socket.IO auto-removes from rooms on disconnect,
      // so we read the updated size after the next tick.
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

// Existing exports — untouched
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