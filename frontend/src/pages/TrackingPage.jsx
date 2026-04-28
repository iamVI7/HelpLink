import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import MapPreview from '../components/MapPreview';
// ✅ NEW — Aftercare Bridge
import AftercareButton from '../components/AftercareButton';

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

// ✅ FIX 2 — image source of truth helper (mirrors GuestTracking)
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
  @keyframes borderPulse { 0%,100%{border-color:rgba(220,38,38,0.25)} 50%{border-color:rgba(220,38,38,0.65)} }
  @keyframes dotPulse { 0%,100%{opacity:1} 50%{opacity:0.22} }
  @keyframes gt_shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes gt_bgMove { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(40px,40px) rotate(3deg)} }
  @keyframes gt_bgMoveAlt { 0%{transform:translate(0,0) rotate(0deg)} 100%{transform:translate(-30px,-30px) rotate(-2deg)} }
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
`;

// ─── TrackingPage ─────────────────────────────────────────────────────────────
const TrackingPage = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Guidance from navigation state (passed by LandingPage after SOS)
  const guidanceFromNav = location.state?.guidance || null;

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const pollRef               = useRef(null);

  // ── Redirect guests away ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) navigate(`/`, { replace: true });
  }, [user, navigate]);

  // ── Fetch request data ────────────────────────────────────────────────────
  const fetchRequest = useCallback(async () => {
    try {
      const res = await api.get(`/requests/${requestId}`);
      // ✅ FIX 10 — null guard
      if (!res.data) return;
      setRequest(res.data);
      setError(null);
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

  useEffect(() => {
    if (request?.helper) clearInterval(pollRef.current);
  }, [request]);

  // ✅ FIX 10 — early return if request not loaded yet (prevents flicker)
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background:'linear-gradient(145deg,#fff7f7 0%,#ffffff 40%,#f0fdf4 100%)',fontFamily:"'Outfit',sans-serif" }}>
      <style>{css}</style>
      <div className="text-center">
        <div style={{ width:44,height:44,borderRadius:'50%',border:'2.5px solid #fecaca',borderTopColor:'#dc2626',animation:'spin 0.9s linear infinite',margin:'0 auto 1rem' }} />
        <p style={{ fontSize:'0.72rem',color:'#9ca3af',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.16em' }}>Loading request…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-8"
      style={{ background:'linear-gradient(145deg,#fff7f7 0%,#ffffff 40%,#f0fdf4 100%)',fontFamily:"'Outfit',sans-serif" }}>
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

  // ✅ FIX 10 — guard against null request after loading
  if (!request) return null;

  // ── Derived state — ✅ FIX 11: always use normalized helpers ─────────────
  const isSOS       = request.isSOS;
  const hasHelper   = !!request.helper;
  const status      = request.status;
  const category    = request.category;
  const isPending   = status === 'open';
  const isAccepted  = status === 'accepted' || status === 'in-progress';
  const isCompleted = status === 'completed';

  // ✅ FIX 2 — images always from backend via helper
  const images   = getImages(request);
  const hasImage = images.length > 0 && images[0].url;

  // Guidance: prefer nav state (from LandingPage SOS), fall back to hardcoded map
  const guidance = guidanceFromNav || GUIDANCE[category] || [];

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

  const statusConfig = isCompleted
    ? { icon:'✅', color:'#15803d', bg:'rgba(240,253,244,0.85)', border:'rgba(74,222,128,0.35)', label:'Completed', desc:'This request has been completed. Thank you for using HelpLink!' }
    : isAccepted
    ? { icon:isSOS?'🚨':'🙌', color:'#15803d', bg:'rgba(240,253,244,0.85)', border:'rgba(74,222,128,0.35)', label:'Helper Assigned',
        desc:isSOS?'HELP IS ON THE WAY. Stay where you are and keep your phone available.':'A helper has accepted your request and is on the way.' }
    : { icon:isSOS?'🆘':'🔍', color:'#dc2626', bg:'rgba(254,242,242,0.85)', border:'rgba(220,38,38,0.2)',
        label:isSOS?'SOS Active':'Searching…',
        desc:isSOS?'HELP IS ON THE WAY — alerting nearby responders.':'Your request has been posted. Searching for nearby helpers.' };

  return (
    <div className="min-h-screen w-full relative overflow-hidden"
      style={{ background:'linear-gradient(145deg,#fff7f7 0%,#ffffff 40%,#f0fdf4 100%)',fontFamily:"'Outfit','Helvetica Neue',sans-serif",paddingTop:'5rem',paddingBottom:'3rem' }}>
      <style>{css}</style>

      {/* Atmospheric background */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',backgroundSize:'28px 28px' }} />
        <div style={{ position:'absolute',top:'-20%',left:'-12%',width:'60vw',height:'60vw',borderRadius:'50%',background:'radial-gradient(circle, rgba(254,202,202,0.5) 0%, transparent 65%)',animation:'gt_bgMove 14s ease-in-out infinite alternate' }} />
        <div style={{ position:'absolute',bottom:'-15%',right:'-12%',width:'50vw',height:'50vw',borderRadius:'50%',background:'radial-gradient(circle, rgba(187,247,208,0.4) 0%, transparent 65%)',animation:'gt_bgMoveAlt 17s ease-in-out infinite alternate-reverse' }} />
        <div style={{ position:'absolute',top:'-5%',right:'-8%',width:'35vw',height:'35vw',borderRadius:'50%',background:'radial-gradient(circle, rgba(254,240,138,0.22) 0%, transparent 65%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto px-4 sm:px-6">

        {/* SOS Banner */}
        {isSOS && !isCompleted && (
          <div className="tp-card mb-4 sm:mb-5 flex items-center gap-3 rounded-2xl px-5 py-4"
            style={{ background:'linear-gradient(135deg,#dc2626,#b91c1c)',boxShadow:'0 8px 28px rgba(220,38,38,0.22)' }}>
            <span style={{ fontSize:'1.2rem',flexShrink:0 }}>🚨</span>
            <div>
              <div style={{ fontSize:'0.6rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.18em',color:'rgba(255,255,255,0.65)',marginBottom:2 }}>SOS Mode</div>
              <div style={{ fontSize:'0.85rem',fontWeight:700,color:'#fff' }}>HELP IS ON THE WAY</div>
            </div>
          </div>
        )}

        {/* Brand strip */}
        <div className="tp-card flex justify-center mb-5 sm:mb-6">
          <div style={{ display:'inline-flex',alignItems:'center',gap:'0.6rem',padding:'6px 18px 6px 12px',background:'rgba(220,38,38,0.07)',border:'1px solid rgba(220,38,38,0.2)',borderRadius:'999px',animation:'borderPulse 2.5s ease-in-out infinite',backdropFilter:'blur(6px)' }}>
            <div style={{ width:7,height:7,borderRadius:'50%',background:'#ef4444',animation:'gt_pulse 1.3s ease-in-out infinite',flexShrink:0,boxShadow:'0 0 6px rgba(239,68,68,0.5)' }} />
            <span style={{ fontSize:'0.58rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.2em',color:'#dc2626' }}>HelpLink · Request Tracking</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="tp-card-1 gt-card-shadow rounded-3xl overflow-hidden mb-4"
          style={{ background:'rgba(255,255,255,0.85)',border:'1px solid rgba(255,255,255,0.9)',backdropFilter:'blur(20px)' }}>

          <div className="px-6 sm:px-9 pt-8 sm:pt-10 pb-6 sm:pb-8">

            {/* Status icon */}
            <div className="flex justify-center mb-7 sm:mb-8">
              <div className="relative" style={{ width:90,height:90 }}>
                {!isAccepted && !isCompleted && (
                  <><div className="ripple-ring" style={{ color:statusConfig.color }}/><div className="ripple-ring ripple-ring-2" style={{ color:statusConfig.color }}/><div className="ripple-ring ripple-ring-3" style={{ color:statusConfig.color }}/></>
                )}
                <div style={{
                  position:'relative',width:90,height:90,borderRadius:'50%',background:statusConfig.bg,
                  border:`1.5px solid ${statusConfig.border}`,display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:36,transition:'all 0.5s ease',
                  boxShadow:isAccepted||isCompleted?'0 0 0 12px rgba(21,128,61,0.06), 0 8px 32px rgba(21,128,61,0.14)':'0 0 0 12px rgba(220,38,38,0.04), 0 8px 32px rgba(220,38,38,0.1)',
                }}>
                  <span style={{ animation:isAccepted||isCompleted?'checkPop 0.4s ease both':'none' }}>
                    {statusConfig.icon}
                  </span>
                </div>
              </div>
            </div>

            {/* Status heading */}
            <div className="text-center mb-5 sm:mb-6">
              <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif",fontSize:'clamp(1.55rem,5vw,1.85rem)',color:'#111827',lineHeight:1.2,marginBottom:'0.65rem',letterSpacing:'-0.02em' }}>
                {isCompleted ? <span style={{ color:'#15803d' }}>Request complete.</span>
                  : isAccepted ? <span style={{ color:'#15803d' }}>Helper found.</span>
                  : <>Posting your{' '}<span className="gt-shimmer-text" style={{ fontStyle:'italic' }}>request…</span></>}
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
                  animation:!isAccepted&&!isCompleted?'dotPulse 1.2s ease-in-out infinite':'none',
                }} />
                {statusConfig.label}
              </div>
            </div>

            {/* ✅ NEW — Public ID badge: shown to authenticated users so they can
                share / look up their request without exposing the Mongo _id */}
            {request.publicId && (
              <div
                className="flex justify-center mb-4"
                style={{ animation: 'fadeUp 0.4s 0.1s ease both' }}
              >
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '6px 14px',
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  color: '#78716c',
                }}>
                  <span style={{ opacity: 0.5 }}>ID</span>
                  <span style={{ color: '#1a1714' }}>{request.publicId}</span>
                </div>
              </div>
            )}

            {/* ✅ Enhance Request button — users only, pending only */}
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

            {/* ✅ NEW — Aftercare button: shown ONLY when request is completed */}
            {isCompleted && (
              <div
                className="flex justify-center mb-5"
                style={{ animation: 'fadeUp 0.4s 0.18s ease both' }}
              >
                <AftercareButton requestId={requestId} />
              </div>
            )}

            {/* Guidance panel */}
            {guidance.length > 0 && (
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

            {/* ✅ FIX 2 — incident image from backend */}
            {hasImage && (
              <div className="mt-4">
                <img src={images[0].url} alt="incident"
                  className="w-full rounded-lg border" />
              </div>
            )}

            {/* Helper card */}
            {hasHelper && (
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
            {canShowMap && (
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

            {hasHelper && !canShowMap && !isCompleted && (
              <div className="rounded-xl px-4 py-3 mb-3 text-center" style={{ background:'#f9fafb',border:'1px solid rgba(0,0,0,0.07)' }}>
                <p style={{ fontSize:'0.68rem',color:'#9ca3af',margin:0 }}>📍 Map tracking will be available once location data is ready</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="gt-divider-line" />
          <div className="px-6 sm:px-9 py-3.5 flex items-center justify-center gap-2" style={{ background:'rgba(255,255,255,0.5)' }}>
            <div style={{ width:5,height:5,borderRadius:'50%',background:'#ef4444',flexShrink:0,boxShadow:'0 0 5px rgba(239,68,68,0.5)',animation:'gt_pulse 1.5s ease-in-out infinite' }} />
            <p style={{ fontSize:'0.62rem',color:'#9ca3af',margin:0 }}>Life-threatening?{' '}<strong style={{ color:'#dc2626',fontWeight:700 }}>Call 112 immediately.</strong></p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="tp-card-2 flex gap-3">
          <button onClick={() => canShowMap ? navigate(`/map/${request._id}`) : null}
            className="tp-sec-btn flex-1 py-3 rounded-2xl font-bold"
            disabled={!canShowMap}
            title={!canShowMap ? 'Available once helper is assigned with location' : ''}
            style={{
              background:'rgba(255,255,255,0.85)',backdropFilter:'blur(10px)',
              color:canShowMap?'#374151':'#c7c3c0',
              border:`1px solid ${canShowMap?'rgba(0,0,0,0.09)':'rgba(0,0,0,0.05)'}`,
              fontSize:'0.68rem',textTransform:'uppercase',letterSpacing:'0.12em',
              fontFamily:"'Outfit',sans-serif",cursor:canShowMap?'pointer':'not-allowed',
              opacity:canShowMap?1:0.5,boxShadow:'0 2px 8px rgba(0,0,0,0.04)',
            }}>
            🗺️ Map View
          </button>
          <button onClick={() => navigate('/my-requests')} className="tp-sec-btn flex-1 py-3 rounded-2xl font-bold"
            style={{ background:'rgba(255,255,255,0.85)',backdropFilter:'blur(10px)',color:'#374151',border:'1px solid rgba(0,0,0,0.09)',fontSize:'0.68rem',textTransform:'uppercase',letterSpacing:'0.12em',fontFamily:"'Outfit',sans-serif",boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
            My Requests
          </button>
        </div>

      </div>
    </div>
  );
};

export default TrackingPage;