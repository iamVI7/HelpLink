import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useRequests } from './RequestContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket,      setSocket]      = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Feature 4: viewer counts keyed by requestId
  const [viewerCounts, setViewerCounts] = useState({});

  const { user } = useAuth();

  const {
    addRequest,
    addAdminRequest,
    updateRequestState,   // ✅ FIX — was incorrectly imported as `updateRequest`
    setRequestStatus,
    fetchMyRequests,
    fetchMyAcceptedRequests,
    triggerSafetyRefetch,
  } = useRequests();

  const socketRef = useRef(null);

  // ✅ Stable refs — event handlers never go stale without re-registration
  const cbRef = useRef({});
  useEffect(() => {
    cbRef.current = {
      addRequest,
      addAdminRequest,
      updateRequestState,   // ✅ FIX — was `updateRequest` (the PUT/edit fn)
      setRequestStatus,
      fetchMyRequests,
      fetchMyAcceptedRequests,
      triggerSafetyRefetch,
      user,
      mode: 'browse',
    };
  }, [
    addRequest,
    addAdminRequest,
    updateRequestState,   // ✅ FIX
    setRequestStatus,
    fetchMyRequests,
    fetchMyAcceptedRequests,
    triggerSafetyRefetch,
    user,
  ]);

  const [guestId, setGuestId] = useState(() => localStorage.getItem('guestId'));
  useEffect(() => {
    const interval = setInterval(() => {
      const current = localStorage.getItem('guestId');
      if (current !== guestId) {
        setGuestId(current);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [guestId]);

  useEffect(() => {

    if (!user && !guestId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      return;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const SOCKET_URL =
      typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_URL
        ? import.meta.env.VITE_SOCKET_URL
        : 'http://localhost:5000';

    const authPayload = user
      ? { userId: user._id, role: user.role }
      : { guestId };

    const newSocket = io(SOCKET_URL, {
      auth: authPayload,
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // ── CONNECT ──────────────────────────────────────────────────────────────
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
      cbRef.current.triggerSafetyRefetch();
    });

    // ── RECONNECT ─────────────────────────────────────────────────────────────
    newSocket.on('reconnect', () => {
      console.log('🔄 Socket reconnected — re-registering');
      cbRef.current.triggerSafetyRefetch();
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket error:', error.message);
      setIsConnected(false);
    });

    // ── NEW REQUEST ───────────────────────────────────────────────────────────
    newSocket.on('new_request', (data) => {
      if (!data.request?._id) return;

      const currentUser = cbRef.current.user;
      console.log('📢 new_request received:', data.request._id);

      cbRef.current.addRequest(data.request, currentUser?._id);

      const creatorId = data.request.createdBy?._id || data.request.createdBy;
      const isOwn = creatorId && String(creatorId) === String(currentUser?._id);
      if (!isOwn) {
        toast.success(data.message || 'New request nearby!', {
          duration: 4000,
          icon: '🚨',
        });
      }

      cbRef.current.triggerSafetyRefetch();
    });

    // ── ADMIN NEW REQUEST ─────────────────────────────────────────────────────
    newSocket.on('admin_new_request', (data) => {
      if (!data.request?._id) return;
      const currentUser = cbRef.current.user;
      if (currentUser?.role === 'admin') {
        cbRef.current.addAdminRequest(data.request);
        toast.success('🚨 New request received', { duration: 4000 });
      }
    });

    // ── REQUEST ACCEPTED ──────────────────────────────────────────────────────
    newSocket.on('request_accepted', (data) => {
      if (cbRef.current.mode === 'browse') return;

      if (!data.request) return;
      console.log('✅ request_accepted:', data.request._id);
      cbRef.current.updateRequestState(data.request);   // ✅ FIX
      toast.success(data.message || 'Your request was accepted!', {
        duration: 5000,
        icon: '🤝',
      });
      cbRef.current.fetchMyRequests();
      cbRef.current.triggerSafetyRefetch();
    });

    // ── REQUEST UPDATED ───────────────────────────────────────────────────────
    newSocket.on('request_updated', (data) => {
      if (!data.request) return;
      console.log('🔄 request_updated:', data.request._id, data.request.status);
      cbRef.current.updateRequestState(data.request);   // ✅ FIX — was updateRequest (PUT fn)
      cbRef.current.triggerSafetyRefetch();
    });

    newSocket.on('request_taken', ({ requestId }) => {
      console.log('❌ Request taken:', requestId);
      cbRef.current.triggerSafetyRefetch();
    });

    // ── REQUEST COMPLETED ─────────────────────────────────────────────────────
    newSocket.on('request_completed', (data) => {
      if (cbRef.current.mode === 'browse') return;

      if (!data.request) return;
      console.log('🎉 request_completed:', data.request._id);
      cbRef.current.updateRequestState(data.request);   // ✅ FIX
      toast.success(data.message || 'Request completed!', {
        duration: 4000,
        icon: '🎉',
      });
      cbRef.current.fetchMyRequests();
      cbRef.current.fetchMyAcceptedRequests();
    });

    // ── ADMIN REQUEST COMPLETED ───────────────────────────────────────────────
    newSocket.on('admin_request_completed', (data) => {
      if (!data.request) return;
      const currentUser = cbRef.current.user;
      if (currentUser?.role === 'admin') {
        cbRef.current.updateRequestState(data.request);   // ✅ FIX
      }
    });

    // ── SOS ACCEPTED ──────────────────────────────────────────────────────────
    newSocket.on('requestAccepted', (data) => {
      if (cbRef.current.mode === 'browse') return;
      console.log('✅ Your SOS/request was accepted:', data);
      cbRef.current.setRequestStatus('accepted');
    });

    // ── Feature 4: viewer_count ───────────────────────────────────────────────
    newSocket.on('viewer_count', ({ requestId, count }) => {
      if (!requestId) return;
      setViewerCounts((prev) => {
        const updated = { ...prev, [requestId]: count };
        if (count === 0) {
          delete updated[requestId];
        }
        return updated;
      });
    });

    // ── CLEANUP ───────────────────────────────────────────────────────────────
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, guestId]);

  // ── Existing utility functions ─────────────────────────────────────────────
  const joinRequestRoom = useCallback((requestId) => {
    if (socketRef.current && requestId) {
      socketRef.current.emit('join_request_room', requestId);
    }
  }, []);

  const leaveRequestRoom = useCallback((requestId) => {
    if (socketRef.current && requestId) {
      socketRef.current.emit('leave_request_room', requestId);
    }
  }, []);

  const updateLocation = useCallback((coordinates) => {
    if (socketRef.current && cbRef.current.user) {
      socketRef.current.emit('update_location', { location: coordinates });
    }
  }, []);

  // Feature 4: emit join_request so backend counts viewers per request
  const joinedRef = useRef(new Set());

  const joinRequest = useCallback((requestId) => {
    if (!socketRef.current || !requestId) return;
    if (joinedRef.current.has(requestId)) return;
    joinedRef.current.add(requestId);
    socketRef.current.emit('join_request', requestId);
  }, []);

  const leaveRequest = useCallback((requestId) => {
    if (!socketRef.current || !requestId) return;
    joinedRef.current.delete(requestId);
    socketRef.current.emit('leave_request', requestId);
  }, []);

  const value = {
    socket,
    isConnected,
    joinRequestRoom,
    leaveRequestRoom,
    updateLocation,
    joinRequest,
    leaveRequest,
    viewerCounts,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};