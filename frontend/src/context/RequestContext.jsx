import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const RequestContext = createContext();

export const useRequests = () => {
  const context = useContext(RequestContext);
  if (!context) {
    throw new Error('useRequests must be used within RequestProvider');
  }
  return context;
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure merge/dedupe helpers
// ─────────────────────────────────────────────────────────────────────────────

const mergeRequests = (existing, incoming) => {
  const map = new Map(existing.map(r => [r._id, r]));
  incoming.forEach(r => map.set(r._id, r));
  return Array.from(map.values());
};

const addIfMissing = (existing, newRequest) => {
  if (!newRequest?._id) return existing;
  if (existing.some(r => r._id === newRequest._id)) return existing;
  return [newRequest, ...existing];
};

const replaceById = (arr, updated) =>
  arr.map(r => r._id === updated._id ? { ...r, ...updated } : r);

// ─────────────────────────────────────────────────────────────────────────────
// Debounce helper
// ─────────────────────────────────────────────────────────────────────────────
const debounce = (fn, delay) => {
  let timer = null;
  const debounced = (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced;
};

// ─────────────────────────────────────────────────────────────────────────────

export const RequestProvider = ({ children }) => {
  const [requests,           setRequests]           = useState([]);
  const [allRequests,        setAllRequests]        = useState([]);
  const [myRequests,         setMyRequests]         = useState([]);
  const [myAcceptedRequests, setMyAcceptedRequests] = useState([]);
  const [loading,            setLoading]            = useState(false);

  const [activePublicId, setActivePublicId] = useState(
    () => localStorage.getItem('activePublicId') || null
  );

  const [requestStatus, setRequestStatus] = useState('idle');

  const fetchingNearbyRef = useRef(false);
  const lastCoordsRef     = useRef(null);
  const COOLDOWN_MS       = 15_000;
  const lastFetchTimeRef  = useRef(0);

  // ─────────────────────────────────────────────────────────────────────────
  // Admin helper
  // ─────────────────────────────────────────────────────────────────────────
  const setAdminRequests = useCallback((data) => {
    const sorted = [...data].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    setAllRequests(sorted);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // fetchNearbyRequests
  // ─────────────────────────────────────────────────────────────────────────
  const fetchNearbyRequests = useCallback(async (lng, lat, radius = 5000) => {
    const now = Date.now();
    if (now - lastFetchTimeRef.current < COOLDOWN_MS) {
      console.log('⏳ fetchNearbyRequests skipped — cooldown active');
      return [];
    }
    if (fetchingNearbyRef.current) {
      console.log('⏳ fetchNearbyRequests skipped — already in flight');
      return [];
    }

    fetchingNearbyRef.current = true;
    lastFetchTimeRef.current  = now;

    if (lng != null && lat != null) {
      lastCoordsRef.current = { lng, lat };
    }

    setLoading(true);
    try {
      const response = await api.get('/requests/nearby', {
        params: { lng, lat, radius },
      });
      const data = response.data.requests || [];
      setRequests(prev => mergeRequests(prev, data));
      return data;
    } catch (error) {
      console.error('fetchNearbyRequests error:', error);
      if (error.response?.status === 429) {
        console.warn('⚠️ 429 received — holding off for cooldown period');
      } else if (error.response?.status !== 401) {
        toast.error('Failed to fetch nearby requests');
      }
      return [];
    } finally {
      setLoading(false);
      fetchingNearbyRef.current = false;
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // triggerSafetyRefetch
  // ─────────────────────────────────────────────────────────────────────────
  const debouncedRefetchRef = useRef(null);

  useEffect(() => {
    debouncedRefetchRef.current = debounce(async () => {
      const coords = lastCoordsRef.current;
      if (!coords) return;
      console.log('🔄 Safety refetch triggered');
      await fetchNearbyRequests(coords.lng, coords.lat);
    }, 10_000);

    return () => {
      debouncedRefetchRef.current?.cancel();
    };
  }, [fetchNearbyRequests]);

  const triggerSafetyRefetch = useCallback(() => {
    debouncedRefetchRef.current?.();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  const fetchMyRequests = useCallback(async () => {
    try {
      const response = await api.get('/requests/my-requests');
      const data = response.data.requests || [];
      setMyRequests(data);
      return data;
    } catch (error) {
      console.error('fetchMyRequests error:', error);
      if (error.response?.status !== 401) {
        toast.error('Failed to fetch your requests');
      }
      return [];
    }
  }, []);

  const fetchMyAcceptedRequests = useCallback(async () => {
    try {
      const response = await api.get('/requests/my-accepted');
      const data = response.data.requests || [];
      setMyAcceptedRequests(data);
      return data;
    } catch (error) {
      console.error('fetchMyAcceptedRequests error:', error);
      if (error.response?.status !== 401) {
        toast.error('Failed to fetch accepted requests');
      }
      return [];
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // createRequest
  // ─────────────────────────────────────────────────────────────────────────
  const createRequest = useCallback(async (formData) => {
    const isSOS = formData instanceof FormData
      ? (formData.get('isSOS') === 'true' || formData.get('isSOS') === true)
      : formData?.isSOS;

    if (isSOS) {
      try {
        if (formData instanceof FormData && !formData.get('guestId')) {
          const guestId = crypto.randomUUID ? crypto.randomUUID() : `guest_${Date.now()}`;
          localStorage.setItem('guestId', guestId);
          formData.append('guestId', guestId);
        }

        const response = await api.post('/requests/sos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const requestId =
          response.data.requestId ||
          response.data.request?._id ||
          null;

        const publicId = response.data.publicId || response.data.request?.publicId || null;
        const guidance = response.data.guidance || [];

        if (requestId) localStorage.setItem('activeRequestId', String(requestId));

        if (publicId) {
          localStorage.setItem('activePublicId', publicId);
          setActivePublicId(publicId);
        }

        const savedGuestId = response.data.request?.guestId;
        if (savedGuestId) localStorage.setItem('guestId', savedGuestId);

        setRequestStatus('searching');
        return { success: true, guidance, requestId, publicId, request: response.data.request };

      } catch (error) {
        const message =
          error.response?.data?.message ||
          error.message ||
          'SOS failed. Please try again.';
        return { success: false, error: message };
      }

    } else {
      try {
        const response = await api.post('/requests', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Alert sent. Notifying nearby helpers...');
        setRequestStatus('searching');

        const rid      = response.data.request?._id;
        const publicId = response.data.publicId || response.data.request?.publicId || null;

        if (rid) localStorage.setItem('activeRequestId', String(rid));

        if (publicId) {
          localStorage.setItem('activePublicId', publicId);
          setActivePublicId(publicId);
        }

        return { success: true, request: response.data.request, publicId };
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to create request');
        return { success: false };
      }
    }
  }, []);

  // updateRequest for EnhanceRequest flow (authenticated users)
  const updateRequest_fn = useCallback(async (requestId, formData) => {
    try {
      const response = await api.put(`/requests/${requestId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Request updated successfully');
      return { success: true, request: response.data.request };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update request');
      return { success: false };
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // acceptRequest
  // ─────────────────────────────────────────────────────────────────────────
  const acceptRequest = async (requestId) => {
    // Coerce to plain string — ObjectId objects stringify to "[object Object]"
    const id = requestId?._id
      ? String(requestId._id)
      : String(requestId);

    if (!id || id === 'undefined' || id === 'null' || id === '[object Object]') {
      console.error('acceptRequest: invalid requestId →', requestId);
      toast.error('Invalid request ID. Please refresh and try again.');
      return { success: false };
    }

    try {
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      const response = await api.patch(`/requests/${id}/accept`, {
        location: { coordinates: [longitude, latitude] },
      });

      const acceptedRequest = response.data.request;

      // ✅ Remove from nearby list immediately
      setRequests(prev => prev.filter(r => String(r._id) !== id));

      // ✅ Add to myAcceptedRequests immediately — no reload needed
      // addIfMissing prevents duplicates if socket also fires
      setMyAcceptedRequests(prev => addIfMissing(prev, acceptedRequest));

      // ✅ Success toast
      toast.success('Request accepted! You are now the helper.', {
        duration: 4000,
        icon: '🤝',
      });

      return { success: true, request: acceptedRequest };

    } catch (error) {
      console.error('Accept error:', error);

      // GeolocationPositionError has a numeric .code; server errors do not
      if (error.code !== undefined) {
        toast.error('Location access is required to accept a request.', {
          duration: 4000,
          icon: '📍',
        });
      } else {
        const msg = error.response?.data?.message || 'Failed to accept request. Please try again.';
        toast.error(msg, { duration: 4000 });
      }

      return { success: false };
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // completeRequest
  // ─────────────────────────────────────────────────────────────────────────
  const completeRequest = async (requestId) => {
    try {
      const response = await api.patch(`/requests/${requestId}/complete`);
      const updated  = response.data.request;
      setMyAcceptedRequests(prev => replaceById(prev, updated));
      localStorage.removeItem('activeRequestId');
      localStorage.removeItem('activePublicId');
      setActivePublicId(null);
      return { success: true, request: updated };
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to complete request');
      return { success: false };
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Socket-driven state updaters
  // ─────────────────────────────────────────────────────────────────────────
  const addRequest = useCallback((newRequest, currentUserId) => {
    if (!newRequest?._id) return;

    if (currentUserId) {
      const creatorId = newRequest.createdBy?._id || newRequest.createdBy;
      if (creatorId && String(creatorId) === String(currentUserId)) {
        console.log('⏭️ Skipping own request in nearby list:', newRequest._id);
        return;
      }
    }

    setRequests(prev => addIfMissing(prev, newRequest));
  }, []);

  const addAdminRequest = useCallback((newRequest) => {
    if (!newRequest?._id) return;
    setAllRequests(prev => {
      const updated = addIfMissing(prev, newRequest);
      return updated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });
  }, []);

  const updateRequestState = useCallback((updated) => {
    if (!updated?._id) return;

    setAllRequests(prev => replaceById(prev, updated));
    setMyRequests(prev => replaceById(prev, updated));

    // ✅ For myAcceptedRequests: replace if exists, or add if this user just
    // accepted it via another device/tab (socket fires after API resolves)
    setMyAcceptedRequests(prev => {
      const exists = prev.some(r => String(r._id) === String(updated._id));
      if (exists) return replaceById(prev, updated);
      // Only add if status is accepted/completed — don't add open requests here
      if (updated.status === 'accepted' || updated.status === 'completed') {
        return addIfMissing(prev, updated);
      }
      return prev;
    });

    setRequests(prev => {
      if (updated.status === 'accepted' || updated.status === 'completed') {
        return prev.filter(r => r._id !== updated._id);
      }
      return replaceById(prev, updated);
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  const value = {
    requests,
    allRequests,
    setAdminRequests,
    myRequests,
    myAcceptedRequests,
    loading,
    fetchNearbyRequests,
    fetchMyRequests,
    fetchMyAcceptedRequests,
    createRequest,
    updateRequest: updateRequest_fn,
    acceptRequest,
    completeRequest,
    addRequest,
    addAdminRequest,
    updateRequestState,
    requestStatus,
    setRequestStatus,
    triggerSafetyRefetch,
    activePublicId,
    setActivePublicId,
  };

  return (
    <RequestContext.Provider value={value}>
      {children}
    </RequestContext.Provider>
  );
};