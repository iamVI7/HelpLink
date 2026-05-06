import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import MapPreview from '../components/MapPreview';
import AftercareButton from '../components/AftercareButton';
// ✅ Cancel Request Modal — shared with GuestTracking, already has reason input
import CancelRequestModal from '../components/CancelRequestModal';
import toast from 'react-hot-toast';

// ─── Haversine distance ───────────────────────────────────────────────────────
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─── Image source-of-truth helper (mirrors GuestTracking) ────────────────────
const getImages = (req) => {
  if (!req) return [];
  if (req.media?.images) return req.media.images;
  if (req.images) return req.images;
  return [];
};

const GUIDANCE = {
  critical: [
    'Stay calm and ensure your safety first',
    'Move to a visible or safe location',
    'Keep your phone accessible',
  ],
  medical: [
    'Apply pressure if there is bleeding',
    'Do not move if injury is severe',
    'Check breathing and stay conscious',
  ],
  accident: [
    'Do not move injured persons unnecessarily',
    'Turn on hazard lights if possible',
    'Stay away from traffic',
  ],
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
  @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes ripple { 0%{transform:scale(0.88);opacity:0.6} 100%{transform:scale(2.4);opacity:0} }
  @keyframes checkPop { 0%{transform:scale(0);opacity:0} 60%{transform:scale(1.18);opacity:1} 100%{transform:scale(1);opacity:1} }
  @keyframes dotPulse { 0%,100%{opacity:1} 50%{opacity:0.22} }
  @keyframes gt_shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes gt_pulse { 0%,100%{opacity:1} 50%{opacity:0.22} }
  @keyframes spin { to{transform:rotate(360deg)} }
  .tp-card   { animation:fadeUp 0.5s ease both; }
  .tp-card-1 { animation:fadeUp 0.5s 0.07s ease both; }
  .tp-card-2 { animation:fadeUp 0.5s 0.14s ease both; }
  .ripple-ring { position:absolute;inset:0;border-radius:50%;border:1.5px solid currentColor;animation:ripple 1.9s ease-out infinite; }
  .ripple-ring-2 { animation-delay:0.63s; }
  .ripple-ring-3 { animation-delay:1.26s; }
  .gt-shimmer-text {
    background:linear-gradient(90deg,#dc2626 0%,#f87171 40%,#dc2626 80%,#b91c1c 100%);
    background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent;
    background-clip:text; animation:gt_shimmer 3s linear infinite;
  }
  .tp-map-btn { transition:box-shadow 0.18s,transform 0.15s; cursor:pointer; }
  .tp-map-btn:hover { box-shadow:0 6px 24px rgba(220,38,38,0.14)!important; transform:translateY(-1px); }
  .tp-map-btn:active { transform:translateY(0); }
  .tp-sec-btn { transition:background 0.15s,border-color 0.15s; cursor:pointer; }
  .tp-sec-btn:hover { background:#f9fafb!important; border-color:rgba(0,0,0,0.15)!important; }
  .gt-card-shadow {
    box-shadow: 0 1px 0 rgba(255,255,255,0.95) inset, 0 -1px 0 rgba(0,0,0,0.03) inset,
      0 4px 6px rgba(0,0,0,0.03), 0 16px 48px rgba(0,0,0,0.07), 0 32px 80px rgba(220,38,38,0.04);
  }
  .gt-divider-line { height:1px; background:linear-gradient(90deg,transparent,rgba(0,0,0,0.07),transparent); }
  .enhance-btn { transition:background 0.15s,box-shadow 0.15s,transform 0.12s; cursor:pointer; }
  .enhance-btn:hover { background:rgba(245,158,11,0.15)!important; box-shadow:0 4px 16px rgba(245,158,11,0.18)!important; transform:translateY(-1px); }
  .enhance-btn:active { transform:translateY(0); }

  /* ── Cancel button variants ── */
  .tp-cancel-btn {
    display:inline-flex; align-items:center; justify-content:center; gap:0.5rem;
    padding:10px 22px; border-radius:999px;
    background:rgba(220,38,38,0.07); border:1.5px solid rgba(220,38,38,0.3);
    color:#dc2626; font-size:0.72rem; font-weight:700;
    text-transform:uppercase; letter-spacing:0.1em;
    transition:background 0.15s,box-shadow 0.15s,transform 0.12s; cursor:pointer;
    font-family:'Outfit',sans-serif;
  }
  .tp-cancel-btn:hover {
    background:rgba(220,38,38,0.13)!important;
    box-shadow:0 4px 16px rgba(220,38,38,0.18)!important;
    transform:translateY(-1px);
  }
  .tp-cancel-btn:active { transform:translateY(0); }

  /* When accepted — amber warning tone */
  .tp-cancel-btn.accepted-cancel {
    background:rgba(245,158,11,0.07); border-color:rgba(245,158,11,0.4);
    color:#b45309;
  }
  .tp-cancel-btn.accepted-cancel:hover {
    background:rgba(245,158,11,0.14)!important;
    box-shadow:0 4px 16px rgba(245,158,11,0.18)!important;
  }

  /* Disabled state — completed or already cancelled */
  .tp-cancel-disabled {
    display:inline-flex; align-items:center; justify-content:center; gap:0.5rem;
    padding:10px 22px; border-radius:999px;
    background:#f9fafb; border:1.5px solid #e5e7eb;
    color:#9ca3af; font-size:0.72rem; font-weight:500;
    text-transform:uppercase; letter-spacing:0.1em;
    cursor:not-allowed; opacity:0.6;
    font-family:'Outfit',sans-serif;
  }
`;

// ─── TrackingPage ─────────────────────────────────────────────────────────────
const TrackingPage = () => {
  const { requestId } = useParams();
  const navigate      = useNavigate();
  const location      = useLocation();
  const { user }      = useAuth();

  // Guidance passed by LandingPage after SOS
  const guidanceFromNav = location.state?.guidance || null;

  const [request,         setRequest]         = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  // ── Cancel state (registered-user only) ──────────────────────────────────
  const [isCancelled,     setIsCancelled]     = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading,   setCancelLoading]   = useState(false);

  const pollRef = useRef(null);

  // ── Redirect guests away ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) navigate(`/`, { replace: true });
  }, [user, navigate]);

  // ── Fetch request data ────────────────────────────────────────────────────
  const fetchRequest = useCallback(async () => {
    try {
      const res = await api.get(`/requests/${requestId}`);
      if (!res.data) return;
      setRequest(res.data);
      setError(null);
      // Sync cancellation state from server (handles page-reload after cancel)
      if (res.data.status === 'cancelled') setIsCancelled(true);
    } catch (err) {
      setError('Unable to load request. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (!requestId) return;
    fetchRequest();
    pollRef.current = setInterval(() => { fetchRequest(); }, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchRequest, requestId]);

  // Stop polling once a helper is assigned (accepted) OR request is resolved
  useEffect(() => {
    if (request?.helper || isCancelled || request?.status === 'completed') {
      clearInterval(pollRef.current);
    }
  }, [request, isCancelled]);

  // ── Cancel handler ────────────────────────────────────────────────────────
  // No guestId needed — the JWT token identifies the user; the backend
  // validates ownership via req.user._id === request.createdBy
  const handleCancelConfirm = useCallback(async (reason) => {
    setCancelLoading(true);
    try {
      await api.patch(`/requests/${requestId}/cancel`, { reason });
      setShowCancelModal(false);
      setIsCancelled(true);
      clearInterval(pollRef.current);
      // Refresh request data so cancellationReason renders immediately
      await fetchRequest();
      toast.success('Your request has been cancelled.');
    } catch (err) {
      // Backend returns 400 with a human-readable message for invalid states
      toast.error(err.response?.data?.message || 'Could not cancel request. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  }, [requestId, fetchRequest]);

  // ── Loading / error screens ───────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background:'#f9f9f9', fontFamily:"'Outfit',sans-serif" }}>
      <style>{css}</style>
      <div className="text-center">
        <div style={{ width:44,height:44,borderRadius:'50%',border:'2.5px solid #fecaca',borderTopColor:'#dc2626',animation:'spin 0.9s linear infinite',margin:'0 auto 1rem' }} />
        <p style={{ fontSize:'0.72rem',color:'#9ca3af',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.16em' }}>Loading request…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-8"
      style={{ background:'#f9f9f9', fontFamily:"'Outfit',sans-serif" }}>
      <style>{css}</style>
      <div className="text-center" style={{ maxWidth:340 }}>
        <div style={{ fontSize:'2.5rem',marginBottom:'1rem' }}>⚠️</div>
        <p style={{ color:'#dc2626',fontWeight:600,marginBottom:'1.5rem' }}>{error}</p>
        <button onClick={fetchRequest}
          style={{ padding:'0.6rem 1.5rem',background:'#dc2626',color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.12em',cursor:'pointer' }}>
          Retry
        </button>
      </div>
    </div>
  );

  if (!request) return null;

  // ── Derived state ─────────────────────────────────────────────────────────
  const isSOS       = request.isSOS;
  const hasHelper   = !!request.helper;
  const status      = request.status;
  const category    = request.category;

  // Use local isCancelled state (updated optimistically on cancel) OR server value
  const cancelled   = isCancelled || status === 'cancelled';
  const isPending   = !cancelled && status === 'open';
  const isAccepted  = !cancelled && (status === 'accepted' || status === 'in-progress');
  const isCompleted = !cancelled && status === 'completed';

  const images   = getImages(request);
  const hasImage = images.length > 0 && images[0].url;

  // Guidance: prefer nav state, fall back to category map, limit to 3 tips
  const guidance = (guidanceFromNav || GUIDANCE[category] || []).slice(0, 3);

  const userCoords = request.location?.coordinates
    ? { lat: request.location.coordinates[1], lng: request.location.coordinates[0] }
    : null;

  const helperCoords = request.helper?.location?.coordinates
    ? { lat: request.helper.location.coordinates[1], lng: request.helper.location.coordinates[0] }
    : null;

  const canShowMap = hasHelper && userCoords && helperCoords;

  const distance = userCoords && helperCoords
    ? haversineKm(userCoords.lat, userCoords.lng, helperCoords.lat, helperCoords.lng).toFixed(2)
    : null;

  // ── Status config ─────────────────────────────────────────────────────────
  const statusConfig = cancelled
    ? { icon:'🚫', color:'#dc2626', bg:'rgba(254,242,242,0.85)', border:'rgba(220,38,38,0.2)', label:'Cancelled',
        desc:'Your request has been cancelled. No helpers will be alerted.' }
    : isCompleted
    ? { icon:'✅', color:'#15803d', bg:'rgba(240,253,244,0.85)', border:'rgba(74,222,128,0.35)', label:'Completed',
        desc:'This request has been completed. Thank you for using HelpLink!' }
    : isAccepted
    ? { icon:isSOS?'🚨':'🙌', color:'#15803d', bg:'rgba(240,253,244,0.85)', border:'rgba(74,222,128,0.35)', label:'Helper Assigned',
        desc:isSOS?'HELP IS ON THE WAY. Stay where you are and keep your phone available.':'A helper has accepted your request and is on the way.' }
    : { icon:isSOS?'🆘':'🔍', color:'#dc2626', bg:'rgba(254,242,242,0.85)', border:'rgba(220,38,38,0.2)',
        label:isSOS?'SOS Active':'Searching…',
        desc:isSOS?'HELP IS ON THE WAY — alerting nearby responders.':'Your request has been posted. Searching for nearby helpers.' };

  // ── Cancel button rendering logic ─────────────────────────────────────────
  // Rule 1 — OPEN:      Show active red cancel button (no reason required? No — modal still shows for UX consistency)
  // Rule 2 — ACCEPTED:  Show amber cancel button with extra warning; modal still collects reason
  //                     NOTE: backend currently blocks cancel on 'accepted' status.
  //                     The button is shown with an explanatory tooltip so users understand the constraint.
  //                     If you later allow accepted-cancel on the backend, it will work automatically.
  // Rule 3 — COMPLETED: Show greyed-out disabled pill
  // Rule 4 — CANCELLED: Show greyed-out disabled pill
  const renderCancelControl = () => {
    if (isCompleted) {
      return (
        <div className="tp-cancel-disabled">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Request completed
        </div>
      );
    }

    if (cancelled) {
      return (
        <div className="tp-cancel-disabled">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          Request cancelled
        </div>
      );
    }

    if (isAccepted) {
      // Helper already assigned — warn user before opening modal
      return (
        <button
          type="button"
          className="tp-cancel-btn accepted-cancel"
          onClick={() => setShowCancelModal(true)}
          title="A helper is already on the way. You can still cancel but must provide a reason."
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Cancel (helper assigned)
        </button>
      );
    }

    // isPending — open request, straightforward cancel
    return (
      <button
        type="button"
        className="tp-cancel-btn"
        onClick={() => setShowCancelModal(true)}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        Cancel Request
      </button>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Cancel Modal — only mounted when needed ── */}
      <CancelRequestModal
        isOpen={showCancelModal}
        onClose={() => !cancelLoading && setShowCancelModal(false)}
        onConfirm={handleCancelConfirm}
        isLoading={cancelLoading}
      />

      <div className="min-h-screen w-full relative overflow-hidden"
        style={{ background:'#f9f9f9', fontFamily:"'Outfit','Helvetica Neue',sans-serif", paddingTop:'5rem', paddingBottom:'3rem' }}>
        <style>{css}</style>

        <div className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto px-4 sm:px-6">

          {/* ── SOS Banner ── */}
          {isSOS && !isCompleted && !cancelled && (
            <div className="tp-card mb-4 sm:mb-5 flex items-center gap-3 rounded-2xl px-5 py-4"
              style={{ background:'linear-gradient(135deg,#dc2626,#b91c1c)',boxShadow:'0 8px 28px rgba(220,38,38,0.22)' }}>
              <span style={{ fontSize:'1.2rem',flexShrink:0 }}>🚨</span>
              <div>
                <div style={{ fontSize:'0.6rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.18em',color:'rgba(255,255,255,0.65)',marginBottom:2 }}>SOS Mode</div>
                <div style={{ fontSize:'0.85rem',fontWeight:700,color:'#fff' }}>HELP IS ON THE WAY</div>
              </div>
            </div>
          )}

          {/* ── Main Card ── */}
          <div className="tp-card-1 gt-card-shadow rounded-3xl overflow-hidden mb-4"
            style={{ background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.06)',backdropFilter:'blur(20px)' }}>

            <div className="px-6 sm:px-9 pt-8 sm:pt-10 pb-6 sm:pb-8">

              {/* Status icon */}
              <div className="flex justify-center mb-7 sm:mb-8">
                <div className="relative" style={{ width:90,height:90 }}>
                  {!isAccepted && !isCompleted && !cancelled && (
                    <>
                      <div className="ripple-ring" style={{ color:statusConfig.color }}/>
                      <div className="ripple-ring ripple-ring-2" style={{ color:statusConfig.color }}/>
                      <div className="ripple-ring ripple-ring-3" style={{ color:statusConfig.color }}/>
                    </>
                  )}
                  <div style={{
                    position:'relative',width:90,height:90,borderRadius:'50%',background:statusConfig.bg,
                    border:`1.5px solid ${statusConfig.border}`,display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:36,transition:'all 0.5s ease',
                    boxShadow: isAccepted || isCompleted
                      ? '0 0 0 12px rgba(21,128,61,0.06), 0 8px 32px rgba(21,128,61,0.14)'
                      : '0 0 0 12px rgba(220,38,38,0.04), 0 8px 32px rgba(220,38,38,0.1)',
                  }}>
                    <span style={{ animation: isAccepted || isCompleted ? 'checkPop 0.4s ease both' : 'none' }}>
                      {statusConfig.icon}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status heading */}
              <div className="text-center mb-5 sm:mb-6">
                <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontSize:'clamp(1.55rem,5vw,1.85rem)',color:'#111827',lineHeight:1.2,marginBottom:'0.65rem',letterSpacing:'-0.02em' }}>
                  {cancelled
                    ? <span style={{ color:'#dc2626' }}>Request cancelled.</span>
                    : isCompleted
                    ? <span style={{ color:'#15803d' }}>Request complete.</span>
                    : isAccepted
                    ? <span style={{ color:'#15803d' }}>Helper found.</span>
                    : <>Posting your{' '}<span className="gt-shimmer-text" style={{ fontStyle:'italic' }}>request…</span></>
                  }
                </h1>
                <p style={{ fontSize:'clamp(0.76rem,2.5vw,0.82rem)',color:'#6b7280',lineHeight:1.7,maxWidth:300,margin:'0 auto' }}>
                  {statusConfig.desc}
                </p>
              </div>

              {/* Status pill */}
              <div className="flex justify-center mb-5 sm:mb-6">
                <div style={{
                  display:'inline-flex',alignItems:'center',gap:8,padding:'8px 20px',borderRadius:999,
                  background:statusConfig.bg,border:`1px solid ${statusConfig.border}`,
                  fontSize:'0.6rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.18em',color:statusConfig.color,
                }}>
                  <span style={{
                    width:6,height:6,borderRadius:'50%',background:statusConfig.color,flexShrink:0,
                    boxShadow:`0 0 5px ${statusConfig.color}99`,
                    animation: !isAccepted && !isCompleted && !cancelled ? 'dotPulse 1.2s ease-in-out infinite' : 'none',
                  }} />
                  {statusConfig.label}
                </div>
              </div>

              {/* Public ID badge */}
              {request.publicId && (
                <div className="flex justify-center mb-4" style={{ animation:'fadeUp 0.4s 0.1s ease both' }}>
                  <div style={{
                    display:'inline-flex',alignItems:'center',gap:'0.5rem',padding:'6px 14px',borderRadius:999,
                    background:'rgba(0,0,0,0.03)',border:'1px solid rgba(0,0,0,0.08)',
                    fontSize:'0.6rem',fontWeight:700,fontFamily:'monospace',letterSpacing:'0.1em',color:'#78716c',
                  }}>
                    <span style={{ opacity:0.5 }}>ID</span>
                    <span style={{ color:'#1a1714' }}>{request.publicId}</span>
                  </div>
                </div>
              )}

              {/* Enhance Request button — only when pending */}
              {user && isPending && (
                <div className="flex justify-center mb-5" style={{ animation:'fadeUp 0.4s 0.15s ease both' }}>
                  <button onClick={() => navigate(`/edit-request/${requestId}`)} className="enhance-btn"
                    style={{
                      display:'inline-flex',alignItems:'center',gap:'0.5rem',padding:'10px 22px',borderRadius:999,
                      background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.4)',color:'#b45309',
                      fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',
                    }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    ✏️ Enhance Request
                  </button>
                </div>
              )}

              {/* ── Cancel control — shown to logged-in users only, not after completion ── */}
              {user && !isCompleted && (
                <div className="flex justify-center mb-5" style={{ animation:'fadeUp 0.4s 0.18s ease both' }}>
                  {renderCancelControl()}
                </div>
              )}

              {/* Cancellation reason card — shown after cancellation */}
              {cancelled && request.cancellationReason && (
                <div className="mb-4 rounded-2xl px-4 py-3"
                  style={{ background:'rgba(254,242,242,0.85)',border:'1px solid rgba(220,38,38,0.18)',animation:'fadeUp 0.4s ease both' }}>
                  <p style={{ fontSize:'0.56rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.2em',color:'#dc2626',marginBottom:'0.375rem' }}>
                    Cancellation Reason
                  </p>
                  <p style={{ margin:0,fontSize:'0.82rem',color:'#7f1d1d',lineHeight:1.5 }}>
                    {request.cancellationReason}
                  </p>
                </div>
              )}

              {/* Aftercare button — only when completed */}
              {isCompleted && (
                <div className="flex justify-center mb-5" style={{ animation:'fadeUp 0.4s 0.18s ease both' }}>
                  <AftercareButton requestId={requestId} />
                </div>
              )}

              {/* Guidance panel — max 3 tips; hidden after cancel or complete */}
              {guidance.length > 0 && !cancelled && !isCompleted && (
                <div className="mt-5 px-5 py-4 rounded-2xl"
                  style={{ background:'rgba(255,255,255,0.75)',border:'1px solid rgba(220,38,38,0.12)',backdropFilter:'blur(10px)',animation:'fadeUp 0.4s ease' }}>
                  <div className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-red-500 mb-3">🚨 Immediate Guidance</div>
                  <ul className="m-0 p-0 list-none text-[0.8rem] text-stone-600 space-y-2">
                    {guidance.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-400 mt-[2px]">•</span><span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Incident image */}
              {hasImage && (
                <div className="mt-4">
                  <img src={images[0].url} alt="incident" className="w-full rounded-lg border" />
                </div>
              )}

              {/* Helper card */}
              {hasHelper && !cancelled && (
                <div className="mb-4 rounded-2xl p-4 sm:p-5"
                  style={{ background:'rgba(240,253,244,0.85)',border:'1px solid rgba(74,222,128,0.3)',animation:'fadeUp 0.45s ease both',boxShadow:'0 4px 16px rgba(21,128,61,0.07)',marginTop:'1rem' }}>
                  <p style={{ fontSize:'0.56rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.2em',color:'#15803d',marginBottom:'0.75rem' }}>Assigned Helper</p>
                  <div className="flex items-center gap-3">
                    <div style={{ width:42,height:42,borderRadius:'50%',flexShrink:0,background:'linear-gradient(135deg,#22c55e,#16a34a)',border:'1.5px solid rgba(74,222,128,0.4)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'1rem',boxShadow:'0 4px 14px rgba(21,128,61,0.25)' }}>
                      {request.helper?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontWeight:600,color:'#111827',fontSize:'0.92rem',margin:0 }}>{request.helper?.name || 'Helper'}</p>
                      {request.helper?.phone && <p style={{ fontSize:'0.76rem',color:'#6b7280',margin:'2px 0 0' }}>📞 {request.helper.phone}</p>}
                    </div>
                    {distance && (
                      <span style={{ fontSize:'0.63rem',fontWeight:700,color:'#15803d',background:'#dcfce7',padding:'4px 10px',borderRadius:999,border:'1px solid rgba(74,222,128,0.35)',flexShrink:0 }}>
                        {distance} km
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Map preview button */}
              {canShowMap && !cancelled && (
                <button onClick={() => navigate(`/map/${request._id}`)}
                  className="tp-map-btn w-full rounded-2xl overflow-hidden mb-3 text-left block"
                  style={{ background:'rgba(255,255,255,0.9)',border:'1px solid rgba(0,0,0,0.08)',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',padding:0 }}>
                  <MapPreview userCoords={userCoords} helperCoords={helperCoords} />
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div style={{ width:7,height:7,borderRadius:'50%',background:'#dc2626' }} />
                        <span style={{ fontSize:'0.6rem',color:'#6b7280',fontWeight:600 }}>You</span>
                      </div>
                      <div style={{ width:10,height:1.5,background:'#94a3b8',borderRadius:1 }} />
                      <div className="flex items-center gap-1.5">
                        <div style={{ width:7,height:7,borderRadius:'50%',background:'#2563eb' }} />
                        <span style={{ fontSize:'0.6rem',color:'#6b7280',fontWeight:600 }}>Helper</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background:'#dc2626' }}>
                      <span style={{ fontSize:'0.6rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.12em',color:'#fff' }}>Open Map</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </button>
              )}

              {hasHelper && !canShowMap && !isCompleted && !cancelled && (
                <div className="rounded-xl px-4 py-3 mb-3 text-center" style={{ background:'#f9fafb',border:'1px solid rgba(0,0,0,0.07)' }}>
                  <p style={{ fontSize:'0.68rem',color:'#9ca3af',margin:0 }}>📍 Map tracking will be available once location data is ready</p>
                </div>
              )}
            </div>

            {/* Footer — 112 emergency pill */}
            <div className="gt-divider-line" />
            <div className="px-6 sm:px-9 py-3.5 flex items-center justify-center" style={{ background:'rgba(255,255,255,0.5)' }}>
              <div style={{
                display:'inline-flex',alignItems:'center',gap:'0.5rem',
                padding:'6px 14px',borderRadius:999,
                background:'#fef2f2',border:'1px solid rgba(220,38,38,0.18)',
                fontSize:'0.68rem',color:'#b91c1c',fontWeight:500,
              }}>
                <span>⚠️</span>
                <span>Life-threatening?</span>
                <a href="tel:112" style={{ fontWeight:800,color:'#dc2626',textDecoration:'none' }}>Call 112 immediately.</a>
              </div>
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="tp-card-2 flex gap-3">
            <button onClick={() => navigate('/dashboard')} className="tp-sec-btn flex-1 py-3 rounded-2xl font-bold"
              style={{ background:'rgba(255,255,255,0.95)',backdropFilter:'blur(10px)',color:'#374151',border:'1px solid rgba(0,0,0,0.09)',fontSize:'0.68rem',textTransform:'uppercase',letterSpacing:'0.12em',fontFamily:"'Outfit',sans-serif",boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
              My Requests
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default TrackingPage;