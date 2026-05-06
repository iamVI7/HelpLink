import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useRequests } from '../context/RequestContext';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../services/api';
// ✅ Aftercare Bridge
import AftercareButton from '../components/AftercareButton';
// ✅ Cancel Request Modal
import CancelRequestModal from '../components/CancelRequestModal';

// Image source of truth helper
const getImages = (req) => {
  if (!req) return [];
  if (req.media?.images) return req.media.images.filter(img => img?.url);
  if (req.images) return req.images.filter(img => img?.url);
  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
// PublicIdLookup
// ─────────────────────────────────────────────────────────────────────────────
const PublicIdLookup = () => {
  const navigate = useNavigate();
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleLookup = async (e) => {
    e.preventDefault();
    const trimmed = input.trim().toUpperCase();
    if (!trimmed.startsWith('HL-REQ-')) {
      setError('Please enter a valid ID starting with HL-REQ-');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const guestId = localStorage.getItem('guestId') || '';
      const res = await api.get(`/requests/track/${trimmed}`, {
        params: guestId ? { guestId } : {},
      });
      if (!res.data || !res.data._id) {
        setError('No request found with that ID.');
        return;
      }
      navigate(`/tracking/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'No request found with that ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem', background: '#f9f9f9',
      fontFamily: "'Outfit', 'Helvetica Neue', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .lookup-card { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .lookup-input {
          width: 100%; padding: 0.75rem 1rem;
          border: 1.5px solid #e5e7eb; border-radius: 0.75rem;
          background: #fff; color: #111827;
          font-size: 0.9rem; font-family: monospace; letter-spacing: 0.08em;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .lookup-input:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
        .lookup-input::placeholder { color: #9ca3af; }
        .lookup-btn {
          width: 100%; padding: 0.8rem 1.5rem;
          background: #dc2626; color: #fff; border: none; border-radius: 0.75rem;
          font-size: 0.8rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.12em; cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s, transform 0.12s;
        }
        .lookup-btn:hover:not(:disabled) { background: #b91c1c; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(220,38,38,0.28); }
        .lookup-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="lookup-card" style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.4rem, 4vw, 1.75rem)', color: '#111827', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Track your <span style={{ color: '#dc2626', fontStyle: 'italic' }}>request.</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
            Enter your HelpLink request ID to check its status.
          </p>
        </div>
        <div style={{ background: '#fff', borderRadius: '1.25rem', padding: '1.75rem', border: '1px solid #f0f0f0', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleLookup} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9ca3af', marginBottom: '0.5rem' }}>Request ID</label>
              <input type="text" className="lookup-input" placeholder="HL-REQ-000001" value={input}
                onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
                autoComplete="off" spellCheck={false} maxLength={16} />
            </div>
            {error && (
              <div style={{ padding: '0.625rem 0.875rem', background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '0.625rem', fontSize: '0.78rem', color: '#b91c1c', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚠️</span><span>{error}</span>
              </div>
            )}
            <button type="submit" disabled={loading || !input.trim()} className="lookup-btn">
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.85s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                  </svg>
                  Looking up…
                </span>
              ) : 'Track Request →'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.7rem', color: '#9ca3af', lineHeight: 1.5 }}>
            Your ID looks like <span style={{ fontFamily: 'monospace', color: '#57534e' }}>HL-REQ-000001</span><br />
            It was shown when you first sent your SOS.
          </p>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '6px 14px', borderRadius: 999, background: '#fef2f2', border: '1px solid rgba(220,38,38,0.18)', fontSize: '0.68rem', color: '#b91c1c', fontWeight: 500 }}>
            <span>⚠️</span><span>Life-threatening?</span>
            <a href="tel:112" style={{ fontWeight: 800, color: '#dc2626', textDecoration: 'none' }}>Call 112</a>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ActivityItem
// ─────────────────────────────────────────────────────────────────────────────
const ActivityItem = ({ icon, iconBg, iconColor, label, sublabel, time, isFirst }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', position: 'relative' }}>
    <div style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1, boxShadow: isFirst ? '0 0 0 4px rgba(220,38,38,0.08)' : 'none',
    }}>
      {typeof icon === 'string' ? (
        <span style={{ fontSize: '1rem' }}>{icon}</span>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      )}
    </div>
    <div style={{ flex: 1, paddingTop: '0.45rem' }}>
      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{label}</p>
      {sublabel && <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>{sublabel}</p>}
    </div>
    {time && (
      <div style={{ paddingTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500, flexShrink: 0 }}>{time}</div>
    )}
    {isFirst && (
      <div style={{
        paddingTop: '0.45rem', display: 'inline-flex', alignItems: 'center',
        background: '#dc2626', borderRadius: 4, padding: '2px 7px',
        fontSize: '0.6rem', fontWeight: 800, color: '#fff',
        letterSpacing: '0.1em', textTransform: 'uppercase',
        height: 'fit-content', flexShrink: 0,
      }}>LIVE</div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// GuestTracking
// ─────────────────────────────────────────────────────────────────────────────
const GuestTracking = () => {
  const { requestId } = useParams();
  if (!requestId) return <PublicIdLookup />;

  const location        = useLocation();
  const navigate        = useNavigate();
  const guidanceFromNav = location.state?.guidance || null;

  const { requestStatus, setRequestStatus } = useRequests();
  const socketRef = useRef(null);

  const [helper,         setHelper]         = useState(() => {
    const saved = localStorage.getItem('helper');
    return saved ? JSON.parse(saved) : null;
  });
  const [requestData,    setRequestData]    = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [isCompleted,    setIsCompleted]    = useState(false);
  const [isCancelled,    setIsCancelled]    = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading,   setCancelLoading]   = useState(false);

  const photoInputRef = useRef(null);
  const pollRef       = useRef(null);

  // ── ✅ Real activity feed state ───────────────────────────────────────────
  // notifiedCount        — real count from backend (0 until first broadcast wave)
  // nearestHelperDistance — km string e.g. "1.2" or null
  // activityTimestamp    — seconds-since-page-load when the data first arrived
  //                        (used for the "00:08" style timestamp in the feed row)
  const pageLoadRef = useRef(Date.now());
  const [notifiedCount,         setNotifiedCount]         = useState(0);
  const [nearestHelperDistance, setNearestHelperDistance] = useState(null);
  const [notifiedTimestamp,     setNotifiedTimestamp]     = useState(null); // seconds
  const [nearbyTimestamp,       setNearbyTimestamp]       = useState(null); // seconds
  // ─────────────────────────────────────────────────────────────────────────

  const images   = getImages(requestData);
  const hasImage = images.length > 0;

  // Format seconds → MM:SS for the activity feed timestamps
  const fmtSec = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Current elapsed seconds since page load (for new timestamps)
  const elapsedSec = () => Math.floor((Date.now() - pageLoadRef.current) / 1000);

  // ── ✅ Apply an activity update (from socket OR from poll) ────────────────
  // Accepts { notifiedCount, nearestHelperDistance } and merges into state.
  // Both paths use this so there's a single source of truth.
  const applyActivityUpdate = useCallback(({ notifiedCount: nc, nearestHelperDistance: nhd }) => {
    if (nc != null && nc > 0) {
      setNotifiedCount(prev => {
        const next = Math.max(prev, nc); // never go backwards
        if (prev === 0 && next > 0) {
          // Record when we first got a notified count
          setNotifiedTimestamp(elapsedSec());
        }
        return next;
      });
    }
    if (nhd != null) {
      setNearestHelperDistance(prev => {
        if (prev === null) {
          // Record when we first found a nearby helper
          setNearbyTimestamp(elapsedSec());
        }
        return nhd;
      });
    }
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let guestId = localStorage.getItem('guestId');
    if (!guestId) {
      guestId = `guest_${Date.now()}`;
      localStorage.setItem('guestId', guestId);
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { guestId },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🆘 Guest socket connected');
      if (requestId) socket.emit('join_request_room', requestId);
      if (guestId)   socket.emit('join_sos_room', guestId);
    });

    socket.on('requestAccepted', (data) => {
      if (data?.requestId === requestId) {
        setRequestStatus('accepted');
        if (data.helper) {
          setHelper(data.helper);
          localStorage.setItem('helper', JSON.stringify(data.helper));
        }
      }
    });

    socket.on('request_accepted', (data) => {
      const acceptedId = data?.request?._id;
      if (acceptedId === requestId) setRequestStatus('accepted');
    });

    socket.on('sos_completed', (data) => {
      if (data?.requestId === requestId || data?.requestId?.toString() === requestId) {
        setIsCompleted(true);
      }
    });

    socket.on('request_cancelled', (data) => {
      if (data?.requestId === requestId || data?.requestId?.toString() === requestId) {
        setIsCancelled(true);
      }
    });

    // ── ✅ NEW: Real activity feed listener ───────────────────────────────
    // Fired by notificationService and rebroadcastService after each
    // broadcast wave. Replaces the old fake setTimeout entirely.
    socket.on('sos_activity_update', (data) => {
      if (data?.requestId !== requestId && data?.requestId?.toString() !== requestId) return;
      applyActivityUpdate({
        notifiedCount:         data.notifiedCount,
        nearestHelperDistance: data.nearestHelperDistance,
      });
    });
    // ── END: Activity feed listener ───────────────────────────────────────

    socket.on('connect_error', (err) => console.error('Guest socket error:', err));

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [requestId, setRequestStatus, applyActivityUpdate]);

  // ── Poll ──────────────────────────────────────────────────────────────────
  const fetchRequest = useCallback(async () => {
    try {
      const guestId = localStorage.getItem('guestId') || '';
      const res = await api.get(`/requests/${requestId}`, {
        params: guestId ? { guestId } : {},
      });
      if (!res.data) return;
      const data = res.data;
      setRequestData(data);

      // ── ✅ Seed activity feed from poll response ───────────────────────
      // This handles the case where the user reloads the page after helpers
      // were already notified — the socket event was missed but the DB has
      // the persisted counts which the GET route now returns.
      applyActivityUpdate({
        notifiedCount:         data.notifiedCount         ?? 0,
        nearestHelperDistance: data.nearestHelperDistance ?? null,
      });
      // ─────────────────────────────────────────────────────────────────────

      if (data.status === 'cancelled') {
        setIsCancelled(true);
      } else if (data.status === 'completed') {
        setIsCompleted(true);
        setRequestStatus('accepted');
      } else if (data.status === 'accepted') {
        setRequestStatus('accepted');
      } else {
        setRequestStatus('searching');
      }

      if (data.helper) {
        setHelper(data.helper);
        localStorage.setItem('helper', JSON.stringify(data.helper));
      }
    } catch (err) {
      console.error('Failed to fetch request:', err);
    }
  }, [requestId, setRequestStatus, applyActivityUpdate]);

  useEffect(() => {
    if (!requestId) return;
    fetchRequest();
    pollRef.current = setInterval(fetchRequest, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchRequest, requestId]);

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handleGuestPhotoUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (hasImage) { toast.error('You can only add one photo as a guest.'); return; }
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('images', file);
      await api.put(`/requests/${requestId}/guest-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchRequest();
      toast.success('Photo added to your SOS request!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add photo.');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }, [requestId, hasImage, fetchRequest]);

  // ── Cancel handler ────────────────────────────────────────────────────────
  const handleCancelConfirm = useCallback(async (reason) => {
    setCancelLoading(true);
    try {
      const guestId = localStorage.getItem('guestId') || '';
      await api.patch(
        `/requests/${requestId}/cancel`,
        { reason },
        { params: guestId ? { guestId } : {} }
      );
      setShowCancelModal(false);
      setIsCancelled(true);
      if (pollRef.current) clearInterval(pollRef.current);
      toast.success('Your request has been cancelled.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel request. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  }, [requestId]);

  const isSearching = requestStatus === 'searching' && !isCancelled;
  const isAccepted  = requestStatus === 'accepted'  && !isCancelled && !isCompleted;
  const publicId    = requestData?.publicId || null;

  return (
    <>
      <CancelRequestModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelConfirm}
        isLoading={cancelLoading}
      />

      <div style={{
        minHeight: '100vh', width: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', background: '#f9f9f9',
        fontFamily: "'Outfit', 'Helvetica Neue', sans-serif",
        padding: '0 0 2rem',
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
          @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
          @keyframes ripple { 0%{transform:scale(0.8);opacity:0.5} 100%{transform:scale(2.6);opacity:0} }
          @keyframes checkPop { 0%{transform:scale(0)} 65%{transform:scale(1.25)} 100%{transform:scale(1)} }
          @keyframes spin { to{transform:rotate(360deg)} }
          @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
          .fade-up   { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
          .fade-up-1 { animation: fadeUp 0.5s 0.1s cubic-bezier(0.22,1,0.36,1) both; }
          .fade-up-2 { animation: fadeUp 0.5s 0.2s cubic-bezier(0.22,1,0.36,1) both; }
          .fade-up-3 { animation: fadeUp 0.5s 0.3s cubic-bezier(0.22,1,0.36,1) both; }
          .fade-up-4 { animation: fadeUp 0.5s 0.4s cubic-bezier(0.22,1,0.36,1) both; }
          .ripple-ring   { position:absolute;inset:0;border-radius:50%;border:2px solid rgba(220,38,38,0.25);animation:ripple 2.4s ease-out infinite; }
          .ripple-ring-2 { animation-delay: 0.8s; }
          .ripple-ring-3 { animation-delay: 1.6s; }
          .shimmer-text {
            background: linear-gradient(90deg, #dc2626 0%, #f87171 40%, #dc2626 80%, #b91c1c 100%);
            background-size: 200% auto;
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            background-clip: text; animation: shimmer 3s linear infinite;
          }
          .cta-call {
            width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.75rem;
            padding: 1rem; border-radius: 1rem;
            background: #dc2626; color: #fff; text-decoration: none;
            font-size: 1rem; font-weight: 700; border: none; cursor: pointer;
            transition: background 0.15s, box-shadow 0.15s, transform 0.12s;
            box-shadow: 0 4px 16px rgba(220,38,38,0.3);
          }
          .cta-call:hover { background: #b91c1c; transform: translateY(-1px); box-shadow: 0 6px 24px rgba(220,38,38,0.4); }
          .cta-cancel {
            width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            padding: 0.95rem; border-radius: 1rem;
            background: #fff; color: #dc2626;
            font-size: 0.9rem; font-weight: 600; border: 1.5px solid #e5e7eb; cursor: pointer;
            transition: border-color 0.15s, background 0.15s;
          }
          .cta-cancel:hover { border-color: rgba(220,38,38,0.4); background: #fef2f2; }
          .cta-cancel-disabled {
            width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            padding: 0.95rem; border-radius: 1rem;
            background: #f9fafb; color: #9ca3af;
            font-size: 0.9rem; font-weight: 500; border: 1.5px solid #e5e7eb;
            cursor: not-allowed; opacity: 0.6;
          }
        `}</style>

        <div style={{ width: '100%', maxWidth: 480, padding: '2rem 1.25rem 1rem' }}>

          {/* ── Bell / status icon ── */}
          <div className="fade-up" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
            <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isSearching && (<><div className="ripple-ring"/><div className="ripple-ring ripple-ring-2"/><div className="ripple-ring ripple-ring-3"/></>)}
              <div style={{
                width: 70, height: 70, borderRadius: '50%', zIndex: 2, position: 'relative',
                background: isCancelled
                  ? 'radial-gradient(circle at 35% 35%, #fde8e8, #fff7f7)'
                  : isCompleted || isAccepted
                  ? 'radial-gradient(circle at 35% 35%, #bbf7d0, #f0fdf4)'
                  : 'radial-gradient(circle at 35% 35%, #fecaca, #fff7f7)',
                border: `1.5px solid ${isCancelled ? 'rgba(220,38,38,0.4)' : isCompleted || isAccepted ? 'rgba(74,222,128,0.5)' : 'rgba(220,38,38,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isCompleted || isAccepted
                  ? '0 0 0 8px rgba(21,128,61,0.07), 0 6px 24px rgba(21,128,61,0.18)'
                  : '0 0 0 8px rgba(220,38,68,0.04), 0 6px 24px rgba(220,38,38,0.12)',
                transition: 'all 0.6s ease',
              }}>
                {isCancelled ? (
                  <span style={{ fontSize: '1.75rem', animation: 'checkPop 0.4s ease both' }}>🚫</span>
                ) : isCompleted || isAccepted ? (
                  <span style={{ fontSize: '1.75rem', animation: 'checkPop 0.4s ease both' }}>✅</span>
                ) : (
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="#dc2626" stroke="none">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* ── Heading ── */}
          <div className="fade-up-1" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(1.6rem, 5vw, 2rem)', lineHeight: 1.15, letterSpacing: '-0.025em', color: '#111827', marginBottom: '0.625rem' }}>
              {isCancelled ? (
                <span style={{ color: '#dc2626' }}>Request cancelled.</span>
              ) : isCompleted ? (
                <span style={{ color: '#15803d' }}>Help has arrived.</span>
              ) : isAccepted ? (
                <span style={{ color: '#15803d' }}>Helper found.</span>
              ) : (
                <>Alerting <span className="shimmer-text" style={{ fontStyle: 'italic' }}>nearby</span><br />helpers…</>
              )}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.7, margin: 0, maxWidth: 320, marginInline: 'auto' }}>
              {isCancelled
                ? 'Your request has been cancelled. No helpers will be alerted.'
                : isCompleted
                ? 'Your SOS has been resolved. Thank you for using HelpLink.'
                : isAccepted
                ? "They're on the way. Stay visible and keep your phone available."
                : "Stay in a safe location. You'll be notified the moment a helper accepts."}
            </p>
          </div>

          {/* ── Public ID badge ── */}
          {publicId && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '4px 12px', borderRadius: 999, background: '#f3f4f6', border: '1px solid #e5e7eb', fontSize: '0.62rem', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.1em', color: '#6b7280' }}>
                <span style={{ opacity: 0.5 }}>ID</span>
                <span style={{ color: '#111827' }}>{publicId}</span>
              </div>
            </div>
          )}

          {/* ── Aftercare button ── */}
          {isCompleted && (
            <div className="fade-up-2" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <AftercareButton requestId={requestId} />
            </div>
          )}

          {/* ── Cancelled reason card ── */}
          {isCancelled && requestData?.cancellationReason && (
            <div className="fade-up-2" style={{ background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '1.25rem', padding: '1.125rem 1.25rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#dc2626', marginBottom: '0.375rem' }}>
                Cancellation Reason
              </p>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                {requestData.cancellationReason}
              </p>
            </div>
          )}

          {/* ── ✅ Activity Feed Card — now driven by REAL data ── */}
          {isSearching && (
            <div className="fade-up-2" style={{
              background: '#fff', borderRadius: '1.25rem',
              border: '1px solid #f0f0f0',
              boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
              padding: '1.25rem', marginBottom: '1rem',
              display: 'flex', flexDirection: 'column', gap: '0.875rem',
            }}>
              {/* Row 1 — always shown; LIVE badge while open */}
              <ActivityItem
                isFirst
                icon={<path d="M1.5 8.5c2.9-3.8 7.1-6 10.5-6s7.6 2.2 10.5 6M5 12c1.9-2.3 4.3-3.5 7-3.5s5.1 1.2 7 3.5M8.5 15.5c1-1.2 2.2-1.8 3.5-1.8s2.5.6 3.5 1.8M12 19h.01"/>}
                iconBg="rgba(220,38,38,0.1)" iconColor="#dc2626"
                label="Searching for nearby helpers..."
              />

              {/* Row 2 — appears once notifiedCount > 0 (real data from backend) */}
              {notifiedCount > 0 && (
                <>
                  <div style={{ width: 1, height: 16, background: 'repeating-linear-gradient(to bottom, #d1d5db 0, #d1d5db 4px, transparent 4px, transparent 8px)', marginLeft: 19 }} />
                  <ActivityItem
                    icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>}
                    iconBg="#f3f4f6" iconColor="#6b7280"
                    label={`${notifiedCount} ${notifiedCount === 1 ? 'person' : 'people'} notified`}
                    time={notifiedTimestamp !== null ? fmtSec(notifiedTimestamp) : null}
                  />
                </>
              )}

              {/* Row 3 — appears once nearestHelperDistance is set (real data) */}
              {nearestHelperDistance !== null && (
                <>
                  <div style={{ width: 1, height: 16, background: 'repeating-linear-gradient(to bottom, #d1d5db 0, #d1d5db 4px, transparent 4px, transparent 8px)', marginLeft: 19 }} />
                  <ActivityItem
                    icon={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>}
                    iconBg="rgba(34,197,94,0.12)" iconColor="#16a34a"
                    label="1 helper nearby"
                    sublabel={`${nearestHelperDistance} km away`}
                    time={nearbyTimestamp !== null ? fmtSec(nearbyTimestamp) : null}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Helper card (accepted) ── */}
          {isAccepted && helper && (
            <div className="fade-up-2" style={{ background: '#f0fdf4', border: '1px solid rgba(74,222,128,0.35)', borderRadius: '1.25rem', padding: '1.25rem', boxShadow: '0 4px 16px rgba(21,128,61,0.08)', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#15803d', marginBottom: '0.75rem' }}>
                Assigned Helper
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #166534, #22c55e)', border: '2px solid rgba(74,222,128,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(21,128,61,0.3)' }}>
                  {helper.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem', margin: 0 }}>{helper.name}</p>
                  {helper.phone && <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '3px 0 0' }}>📞 {helper.phone}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── Quick Guidance Card ── */}
          {!isCompleted && !isCancelled && (
            <div className="fade-up-3" style={{ background: '#fff', borderRadius: '1.25rem', border: '1px solid #f0f0f0', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', padding: '1.125rem 1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(220,38,38,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#dc2626' }}>Quick guidance</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {(guidanceFromNav && guidanceFromNav.length > 0
                  ? guidanceFromNav.slice(0, 3)
                  : ["Stay where you are if it's safe.", 'Keep your phone active.']
                ).map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                      {i === 0 ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.58 3.44 2 2 0 0 1 3.55 1.25h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/>
                        </svg>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151', lineHeight: 1.5 }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Photo upload button ── */}
          {!isAccepted && !isCompleted && !isCancelled && !hasImage && (
            <div className="fade-up-3" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <button type="button" disabled={photoUploading} onClick={() => photoInputRef.current?.click()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '8px 20px', borderRadius: 999, background: '#fff', border: '1.5px dashed rgba(220,38,38,0.35)', color: '#9ca3af', fontSize: '0.78rem', fontWeight: 600, cursor: photoUploading ? 'default' : 'pointer', opacity: photoUploading ? 0.6 : 1, transition: 'all 0.2s' }}>
                {photoUploading ? (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.85s linear infinite' }}><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>Uploading…</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>+ Add photo <span style={{ fontWeight: 400, fontSize: '0.7rem', opacity: 0.7 }}>(optional)</span></>
                )}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleGuestPhotoUpload} />
            </div>
          )}

          {/* ── Photo preview ── */}
          {!isAccepted && !isCompleted && !isCancelled && hasImage && (
            <div className="fade-up-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                <img src={images[0].url} alt="SOS photo" style={{ width: 120, height: 84, objectFit: 'cover', display: 'block' }} />
              </div>
              <p style={{ fontSize: '0.68rem', color: '#22c55e', margin: 0, fontWeight: 600 }}>✓ Photo visible to responders</p>
            </div>
          )}

          {/* ── CTA Buttons ── */}
          <div className="fade-up-4" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <a href="tel:112" className="cta-call">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.58 3.44 2 2 0 0 1 3.55 1.25h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/>
              </svg>
              <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em' }}>CALL 112</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 400, opacity: 0.85 }}>Life-threatening?</div>
              </div>
            </a>

            {isSearching && (
              <button type="button" className="cta-cancel" onClick={() => setShowCancelModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Cancel Request
              </button>
            )}
            {isAccepted && !isCompleted && !isCancelled && (
              <div className="cta-cancel-disabled" title="Cannot cancel — a helper has already accepted.">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Cannot cancel — helper assigned
              </div>
            )}
            {isCompleted && (
              <div className="cta-cancel-disabled">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Request completed
              </div>
            )}
            {isCancelled && (
              <div className="cta-cancel-disabled">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Request cancelled
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="fade-up-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <p style={{ margin: 0, fontSize: '0.68rem', color: '#9ca3af', fontWeight: 400 }}>
              Your location is secure and shared only with responders.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuestTracking;