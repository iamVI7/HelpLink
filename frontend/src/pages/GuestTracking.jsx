import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useRequests } from '../context/RequestContext';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../services/api';
// ✅ NEW — Aftercare Bridge
import AftercareButton from '../components/AftercareButton';

// Image source of truth helper
const getImages = (req) => {
  if (!req) return [];
  if (req.media?.images) return req.media.images.filter(img => img?.url);
  if (req.images) return req.images.filter(img => img?.url);
  return [];
};

// ─────────────────────────────────────────────────────────────────────────────
// ✅ NEW — PublicIdLookup
// Standalone search bar that lets a guest enter an HL-REQ-XXXXXX code and
// fetch the corresponding request. Rendered only when no requestId is in the
// URL (i.e. the user navigated directly to /tracking without an ID).
// Does NOT affect any existing tracking logic.
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

      // Redirect to the existing guest tracking page using the Mongo _id
      // so ALL existing socket / polling / photo-upload logic continues to work.
      navigate(`/tracking/${res.data._id}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'No request found with that ID.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12"
      style={{
        background: 'linear-gradient(145deg, #fff7f7 0%, #ffffff 40%, #f0fdf4 100%)',
        fontFamily: "'Outfit', 'Helvetica Neue', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        @keyframes gt_fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gt_pulse  { 0%,100%{opacity:1} 50%{opacity:0.22} }
        @keyframes gt_borderGlow { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0)} 50%{box-shadow:0 0 0 5px rgba(220,38,38,0.08)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .lookup-card { animation: gt_fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .lookup-input {
          width: 100%; padding: 0.75rem 1rem;
          border: 1.5px solid rgba(0,0,0,0.1); border-radius: 0.625rem;
          background: #ffffff; color: #1a1714;
          font-size: 0.9rem; font-family: monospace; letter-spacing: 0.08em;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .lookup-input:focus {
          border-color: rgba(220,38,38,0.5);
          box-shadow: 0 0 0 3px rgba(220,38,38,0.08);
        }
        .lookup-input::placeholder { color: #a8a29e; font-family: monospace; letter-spacing: 0.06em; }
        .lookup-btn {
          width: 100%; padding: 0.75rem 1.5rem;
          background: #dc2626; color: #fff; border: none; border-radius: 0.625rem;
          font-size: 0.72rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.14em; cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s, transform 0.12s;
        }
        .lookup-btn:hover:not(:disabled) {
          background: #b91c1c;
          box-shadow: 0 4px 16px rgba(220,38,38,0.28);
          transform: translateY(-1px);
        }
        .lookup-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      {/* Brand strip */}
      <div className="lookup-card flex justify-center mb-8">
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
          padding: '6px 18px 6px 12px',
          background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.18)',
          borderRadius: '999px', animation: 'gt_borderGlow 2.5s ease-in-out infinite',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', animation: 'gt_pulse 1.3s ease-in-out infinite', flexShrink: 0, boxShadow: '0 0 6px rgba(239,68,68,0.5)' }} />
          <span style={{ fontSize: '0.58rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#dc2626' }}>
            HelpLink · Track Request
          </span>
        </div>
      </div>

      {/* Card */}
      <div
        className="lookup-card w-full"
        style={{
          maxWidth: 420,
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(255,255,255,0.9)',
          borderRadius: '1.5rem',
          padding: '2rem 2rem 1.75rem',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.03), 0 16px 48px rgba(0,0,0,0.07), 0 32px 80px rgba(220,38,38,0.04)',
        }}
      >
        <div className="text-center mb-6">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.4rem, 4vw, 1.7rem)',
            color: '#111827', lineHeight: 1.2,
            marginBottom: '0.5rem', letterSpacing: '-0.02em',
          }}>
            Track your <span style={{ color: '#dc2626', fontStyle: 'italic' }}>request.</span>
          </h1>
          <p style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
            Enter your HelpLink request ID to check its status and see assigned helper details.
          </p>
        </div>

        <form onSubmit={handleLookup} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{
              display: 'block', fontSize: '0.6rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.16em',
              color: '#78716c', marginBottom: '0.5rem',
            }}>
              Request ID
            </label>
            <input
              type="text"
              className="lookup-input"
              placeholder="HL-REQ-000001"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError(null);
              }}
              autoComplete="off"
              spellCheck={false}
              maxLength={16}
            />
          </div>

          {error && (
            <div style={{
              padding: '0.625rem 0.875rem',
              background: 'rgba(254,242,242,0.9)',
              border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              color: '#b91c1c',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading || !input.trim()} className="lookup-btn">
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: 'spin 0.85s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                Looking up…
              </span>
            ) : 'Track Request →'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: '1.25rem',
          fontSize: '0.65rem', color: '#9ca3af', lineHeight: 1.5,
        }}>
          Your ID looks like <span style={{ fontFamily: 'monospace', color: '#57534e' }}>HL-REQ-000001</span>
          <br />It was shown when you first sent your SOS or request.
        </p>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.62rem', color: '#d1d5db', textAlign: 'center' }}>
        Life-threatening?{' '}
        <strong style={{ color: '#dc2626' }}>Call 112 immediately.</strong>
      </p>
    </div>
  );
};
// ── END: PublicIdLookup ────────────────────────────────────────────────────────

// ── GuestTracking ─────────────────────────────────────────────────────────────
const GuestTracking = () => {
  const { requestId } = useParams();

  // ✅ NEW — if no requestId in URL, show the public ID lookup UI instead
  if (!requestId) {
    return <PublicIdLookup />;
  }

  // ✅ Read guidance passed via navigation state (set by LandingPage after SOS)
  const location = useLocation();
  const guidanceFromNav = location.state?.guidance || null;

  const { requestStatus, setRequestStatus } = useRequests();
  const socketRef = useRef(null);

  const [helper, setHelper] = useState(() => {
    const saved = localStorage.getItem('helper');
    return saved ? JSON.parse(saved) : null;
  });

  // Request data fetched from backend — single source of truth for image state
  const [requestData, setRequestData] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);

  // ✅ NEW — track whether the SOS has been completed (for aftercare button)
  const [isCompleted, setIsCompleted] = useState(false);

  // Derive image state from backend response
  const images   = getImages(requestData);
  const hasImage = images.length > 0;

  useEffect(() => {
    let guestId = localStorage.getItem('guestId');
    if (!guestId) {
      guestId = `guest_${Date.now()}`;
      localStorage.setItem('guestId', guestId);
    }

    const socket = io('http://localhost:5000', {
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

    // ✅ NEW — listen for completion so we can show the aftercare button
    socket.on('sos_completed', (data) => {
      if (data?.requestId === requestId || data?.requestId?.toString() === requestId) {
        setIsCompleted(true);
      }
    });

    socket.on('connect_error', (err) => console.error('Guest socket error:', err));

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [requestId, setRequestStatus]);

  // ✅ fetchRequest: passes guestId so backend returns real image URLs for guest owner
  const fetchRequest = useCallback(async () => {
    try {
      const guestId = localStorage.getItem('guestId') || '';
      const res = await api.get(`/requests/${requestId}`, {
        params: guestId ? { guestId } : {},
      });
      if (!res.data) return;
      const data = res.data;

      setRequestData(data);

      if (data.status === 'completed') {
        // ✅ NEW — also set completed state from polling (handles page refresh)
        setIsCompleted(true);
        setRequestStatus('accepted'); // keep pill green
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
  }, [requestId, setRequestStatus]);

  // Initial fetch + polling every 8s to keep status and image in sync
  const pollRef = useRef(null);
  useEffect(() => {
    if (!requestId) return;
    fetchRequest();
    pollRef.current = setInterval(fetchRequest, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchRequest, requestId]);

  // Guest photo upload — uses /guest-image endpoint (no auth required)
  const handleGuestPhotoUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (hasImage) {
      toast.error('You can only add one photo as a guest.');
      return;
    }

    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('images', file);

      await api.put(`/requests/${requestId}/guest-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Re-fetch from backend with guestId so image URLs are not stripped
      await fetchRequest();

      toast.success('Photo added to your SOS request!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add photo.';
      toast.error(msg);
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }, [requestId, hasImage, fetchRequest]);

  const isSearching = requestStatus === 'searching';
  const isAccepted  = requestStatus === 'accepted';

  // ✅ NEW — publicId from fetched request data (shown as watermark)
  const publicId = requestData?.publicId || null;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 sm:px-6 py-8 relative overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #fff7f7 0%, #ffffff 40%, #f0fdf4 100%)',
        fontFamily: "'Outfit', 'Helvetica Neue', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
        @keyframes gt_fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes gt_ripple  { 0%{transform:scale(0.85);opacity:0.55} 100%{transform:scale(2.8);opacity:0} }
        @keyframes gt_checkPop { 0%{transform:scale(0);opacity:0} 65%{transform:scale(1.2);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes gt_pulse   { 0%,100%{opacity:1} 50%{opacity:0.22} }
        @keyframes gt_borderGlow { 0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0)} 50%{box-shadow:0 0 0 5px rgba(220,38,38,0.08)} }
        @keyframes gt_scan    { 0%{transform:translateY(-100%);opacity:0.55} 50%{opacity:0.15} 100%{transform:translateY(400%);opacity:0} }
        @keyframes gt_cardIn  { from{opacity:0;transform:translateY(28px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes gt_shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes gt_float   { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-5px)} }
        @keyframes gt_bgMove  { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(40px,40px) rotate(3deg)} }
        @keyframes gt_bgMoveAlt { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(-30px,-30px) rotate(-2deg)} }
        .gt-card   { animation: gt_cardIn 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .gt-card-1 { animation: gt_cardIn 0.5s 0.1s cubic-bezier(0.22,1,0.36,1) both; }
        .gt-card-2 { animation: gt_cardIn 0.5s 0.2s cubic-bezier(0.22,1,0.36,1) both; }
        .gt-ripple { position:absolute;inset:0;border-radius:50%;border:1.5px solid rgba(220,38,38,0.3);animation:gt_ripple 2.2s ease-out infinite; }
        .gt-ripple-2 { animation-delay:0.73s; }
        .gt-ripple-3 { animation-delay:1.46s; }
        .gt-icon-float { animation:gt_float 3s ease-in-out infinite; }
        .gt-shimmer-text {
          background:linear-gradient(90deg,#dc2626 0%,#f87171 40%,#dc2626 80%,#b91c1c 100%);
          background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          background-clip:text; animation:gt_shimmer 3s linear infinite;
        }
        .gt-divider-line { height:1px; background:linear-gradient(90deg,transparent,rgba(0,0,0,0.07),transparent); }
        .gt-card-shadow {
          box-shadow: 0 1px 0 rgba(255,255,255,0.9) inset, 0 -1px 0 rgba(0,0,0,0.04) inset,
            0 4px 6px rgba(0,0,0,0.03), 0 16px 48px rgba(0,0,0,0.07), 0 32px 80px rgba(220,38,38,0.05);
        }
      `}</style>

      {/* Atmospheric background */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)',backgroundSize:'28px 28px' }} />
        <div style={{ position:'absolute',top:'-20%',left:'-12%',width:'60vw',height:'60vw',borderRadius:'50%',background:'radial-gradient(circle, rgba(254,202,202,0.55) 0%, transparent 65%)',animation:'gt_bgMove 14s ease-in-out infinite alternate' }} />
        <div style={{ position:'absolute',bottom:'-15%',right:'-12%',width:'50vw',height:'50vw',borderRadius:'50%',background:'radial-gradient(circle, rgba(187,247,208,0.45) 0%, transparent 65%)',animation:'gt_bgMoveAlt 17s ease-in-out infinite alternate-reverse' }} />
        <div style={{ position:'absolute',top:'-5%',right:'-8%',width:'35vw',height:'35vw',borderRadius:'50%',background:'radial-gradient(circle, rgba(254,240,138,0.25) 0%, transparent 65%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm sm:max-w-md">

        {/* Brand strip */}
        <div className="gt-card flex justify-center mb-6 sm:mb-7">
          <div style={{
            display:'inline-flex',alignItems:'center',gap:'0.6rem',padding:'6px 18px 6px 12px',
            background:'rgba(220,38,38,0.07)',border:'1px solid rgba(220,38,38,0.18)',borderRadius:'999px',
            animation:'gt_borderGlow 2.5s ease-in-out infinite',backdropFilter:'blur(6px)',
          }}>
            <div style={{ width:7,height:7,borderRadius:'50%',background:'#ef4444',animation:'gt_pulse 1.3s ease-in-out infinite',flexShrink:0,boxShadow:'0 0 6px rgba(239,68,68,0.5)' }} />
            <span style={{ fontSize:'0.58rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.2em',color:'#dc2626' }}>
              HelpLink · SOS Active
            </span>
          </div>
        </div>

        {/* Main card */}
        <div className="gt-card-1 gt-card-shadow rounded-3xl overflow-hidden"
          style={{ background:'rgba(255,255,255,0.85)',border:'1px solid rgba(255,255,255,0.9)',backdropFilter:'blur(20px)' }}>

          <div className="px-6 sm:px-9 pt-8 sm:pt-10 pb-6 sm:pb-8">

            {/* Status icon */}
            <div className="flex justify-center mb-8 sm:mb-9">
              <div className="gt-icon-float relative" style={{ width:100,height:100 }}>
                {isSearching && (<><div className="gt-ripple"/><div className="gt-ripple gt-ripple-2"/><div className="gt-ripple gt-ripple-3"/></>)}
                {isSearching && (
                  <div style={{ position:'absolute',inset:0,borderRadius:'50%',overflow:'hidden',zIndex:1 }}>
                    <div style={{ position:'absolute',left:0,right:0,height:'28%',background:'linear-gradient(180deg,transparent,rgba(220,38,38,0.18),transparent)',animation:'gt_scan 2.4s ease-in-out infinite' }} />
                  </div>
                )}
                <div style={{
                  position:'relative',zIndex:2,width:100,height:100,borderRadius:'50%',
                  background: isCompleted
                    ? 'radial-gradient(circle at 35% 35%, rgba(74,222,128,0.25), rgba(240,253,244,0.9))'
                    : isAccepted
                    ?'radial-gradient(circle at 35% 35%, rgba(74,222,128,0.25), rgba(240,253,244,0.9))'
                    :'radial-gradient(circle at 35% 35%, rgba(254,202,202,0.6), rgba(255,247,247,0.9))',
                  border:`1.5px solid ${isAccepted||isCompleted?'rgba(74,222,128,0.45)':'rgba(220,38,38,0.25)'}`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:38,transition:'all 0.6s ease',
                  boxShadow: isAccepted||isCompleted
                    ?'0 0 0 12px rgba(21,128,61,0.06), 0 8px 32px rgba(21,128,61,0.18)'
                    :'0 0 0 12px rgba(220,38,68,0.04), 0 8px 32px rgba(220,38,38,0.12)',
                }}>
                  <span style={{ animation:isAccepted||isCompleted?'gt_checkPop 0.45s ease both':'none' }}>
                    {isCompleted ? '✅' : isAccepted ? '✅' : '🔍'}
                  </span>
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="text-center mb-6 sm:mb-7">
              <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontSize:'clamp(1.6rem,5vw,2rem)',lineHeight:1.15,letterSpacing:'-0.025em',color:'#111827',marginBottom:'0.75rem' }}>
                {isCompleted ? (
                  <span style={{ color:'#15803d' }}>Help has arrived.</span>
                ) : isAccepted ? (
                  <span style={{ color:'#15803d' }}>Helper found.</span>
                ) : (
                  <>Alerting{' '}<span className="gt-shimmer-text" style={{ fontStyle:'italic' }}>nearby</span><br />helpers…</>
                )}
              </h1>
              <p style={{ fontSize:'clamp(0.78rem,2.5vw,0.85rem)',color:'#6b7280',lineHeight:1.7,maxWidth:300,margin:'0 auto' }}>
                {isCompleted
                  ? 'Your SOS has been resolved. Thank you for using HelpLink.'
                  : isAccepted
                  ? "They're on the way. Stay visible and keep your phone available."
                  : "Stay in a safe location. You'll be notified the moment a helper accepts."}
              </p>
            </div>

            {/* Status pill */}
            <div className="flex justify-center mb-5">
              <div style={{
                display:'inline-flex',alignItems:'center',gap:8,padding:'8px 20px',borderRadius:999,
                background:isAccepted||isCompleted?'rgba(21,128,61,0.08)':'rgba(220,38,38,0.07)',
                border:`1px solid ${isAccepted||isCompleted?'rgba(74,222,128,0.35)':'rgba(220,38,38,0.2)'}`,
                fontSize:'0.6rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.18em',
                color:isAccepted||isCompleted?'#15803d':'#dc2626',
              }}>
                <span style={{
                  width:6,height:6,borderRadius:'50%',background:isAccepted||isCompleted?'#22c55e':'#ef4444',flexShrink:0,
                  boxShadow:isAccepted||isCompleted?'0 0 5px rgba(34,197,94,0.6)':'0 0 5px rgba(239,68,68,0.6)',
                  animation:isAccepted||isCompleted?'none':'gt_pulse 1.2s ease-in-out infinite',
                }} />
                {isCompleted ? 'Completed' : isAccepted ? 'Helper Confirmed' : 'Scanning area…'}
              </div>
            </div>

            {/* ✅ NEW — Public ID badge so guests can note down their request ID */}
            {publicId && (
              <div
                className="flex justify-center mb-4"
                style={{ animation: 'gt_fadeUp 0.4s 0.1s ease both' }}
              >
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  color: '#78716c',
                }}>
                  <span style={{ opacity: 0.5 }}>ID</span>
                  <span style={{ color: '#1a1714' }}>{publicId}</span>
                </div>
              </div>
            )}

            {/* ✅ NEW — Aftercare button: shown when SOS is completed (guests CAN use aftercare) */}
            {isCompleted && (
              <div
                className="flex justify-center mb-5"
                style={{ animation: 'gt_fadeUp 0.4s 0.18s ease both' }}
              >
                <AftercareButton requestId={requestId} />
              </div>
            )}

            {/* ✅ Photo section — show image if already uploaded, else show upload button only when searching */}
            {!isAccepted && !isCompleted && (
              <div className="flex justify-center mb-5" style={{ animation:'gt_fadeUp 0.4s 0.2s ease both' }}>
                {hasImage ? (
                  // Image was sent with SOS or uploaded after — show it
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-2xl overflow-hidden border border-stone-100" style={{ boxShadow:'0 2px 12px rgba(0,0,0,0.07)' }}>
                      <img
                        src={`http://localhost:5000${images[0].url}`}
                        alt="SOS photo"
                        style={{ width: 140, height: 100, objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                    <p style={{ fontSize:'0.62rem',color:'#22c55e',margin:0,fontWeight:600 }}>✓ Photo visible to responders</p>
                  </div>
                ) : (
                  // No image yet — show upload button
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      disabled={photoUploading}
                      onClick={() => photoInputRef.current?.click()}
                      style={{
                        display:'inline-flex',alignItems:'center',gap:'0.5rem',padding:'8px 18px',
                        borderRadius:999,background:'rgba(255,255,255,0.9)',
                        border:'1px dashed rgba(220,38,38,0.3)',color:'#78716c',
                        fontSize:'0.72rem',fontWeight:600,
                        cursor:photoUploading?'default':'pointer',
                        opacity:photoUploading?0.6:1,transition:'all 0.2s ease',
                      }}
                    >
                      {photoUploading ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            style={{ animation:'gt_pulse 1s ease infinite' }}>
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                          </svg>
                          Uploading…
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                          </svg>
                          + Add photo{' '}
                          <span style={{ fontWeight:400,fontSize:'0.65rem',opacity:0.7 }}>(optional)</span>
                        </>
                      )}
                    </button>
                    <p style={{ fontSize:'0.6rem',color:'#9ca3af',margin:0,textAlign:'center' }}>
                      Helps responders find you faster
                    </p>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display:'none' }}
                      onChange={handleGuestPhotoUpload}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Guidance — from navigation state (passed by LandingPage after SOS) */}
            {guidanceFromNav && guidanceFromNav.length > 0 && (
              <div className="mt-4 px-5 py-4 rounded-2xl"
                style={{
                  background:'rgba(255,255,255,0.75)',border:'1px solid rgba(220,38,38,0.12)',
                  backdropFilter:'blur(10px)',animation:'gt_fadeUp 0.4s ease',
                }}>
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-red-500 mb-3">🚨 Immediate Guidance</div>
                <ul className="m-0 p-0 list-none text-[0.8rem] text-stone-600 space-y-2">
                  {guidanceFromNav.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-400 mt-[2px]">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Helper card */}
            {isAccepted && helper && (
              <div style={{
                padding:'1.25rem',background:'rgba(240,253,244,0.8)',border:'1px solid rgba(74,222,128,0.3)',
                borderRadius:'1.25rem',animation:'gt_fadeUp 0.4s ease both',
                boxShadow:'0 4px 16px rgba(21,128,61,0.08)',marginTop:'1rem',
              }}>
                <p style={{ fontSize:'0.56rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.2em',color:'#15803d',marginBottom:'0.875rem' }}>
                  Assigned Helper
                </p>
                <div className="flex items-center gap-4">
                  <div style={{
                    width:46,height:46,borderRadius:'50%',background:'linear-gradient(135deg, #166534, #22c55e)',
                    border:'1.5px solid rgba(74,222,128,0.4)',display:'flex',alignItems:'center',justifyContent:'center',
                    color:'#fff',fontWeight:700,fontSize:'1.1rem',flexShrink:0,boxShadow:'0 4px 16px rgba(21,128,61,0.28)',
                  }}>
                    {helper.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p style={{ fontWeight:600,color:'#111827',fontSize:'0.95rem',margin:0 }}>{helper.name}</p>
                    {helper.phone && <p style={{ fontSize:'0.77rem',color:'#6b7280',margin:'3px 0 0' }}>📞 {helper.phone}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Pulse dots when searching */}
            {isSearching && (
              <div className="gt-card-2 flex items-center justify-center gap-1.5 mt-4">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div key={i} style={{
                    width:5,height:5,borderRadius:'50%',background:'rgba(220,38,38,0.35)',
                    animation:`gt_pulse 1.4s ${delay}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="gt-divider-line" />
          <div className="px-6 sm:px-9 py-4 flex items-center justify-center gap-2" style={{ background:'rgba(255,255,255,0.5)' }}>
            <div style={{ width:5,height:5,borderRadius:'50%',background:'#ef4444',flexShrink:0,boxShadow:'0 0 5px rgba(239,68,68,0.5)',animation:'gt_pulse 1.5s ease-in-out infinite' }} />
            <p style={{ fontSize:'0.63rem',color:'#9ca3af',margin:0 }}>
              Life-threatening?{' '}<strong style={{ color:'#dc2626',fontWeight:700 }}>Call 112 immediately.</strong>
            </p>
          </div>
        </div>

        {/* ✅ EXTENDED — show publicId watermark if available, else Mongo _id */}
        {(publicId || requestId) && (
          <p style={{ textAlign:'center',marginTop:'1.25rem',fontSize:'0.55rem',color:'#d1d5db',fontFamily:'monospace',letterSpacing:'0.08em',animation:'gt_fadeUp 0.5s 0.35s ease both' }}>
            {publicId || requestId}
          </p>
        )}
      </div>
    </div>
  );
};

export default GuestTracking;