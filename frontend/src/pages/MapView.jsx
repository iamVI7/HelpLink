import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useRequests } from '../context/RequestContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import NearbyUserMarker from '../components/NearbyUserMarker';
import { getNearbyUsers } from '../services/api';
import { useSocket } from '../context/SocketContext';

// 📍 Geofencing — Prayagraj only (tight bounding box)
const PRAYAGRAJ_BOUNDS = [
  [25.30, 81.70],
  [25.55, 82.00],
];

// 📍 Default centre → Prayagraj
const PRAYAGRAJ_CENTER = [25.4358, 81.8463];

// Fix default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── Request marker icons ──────────────────────────────────────────────────────
const getMarkerIcon = (request) => {
  if (request.isSOS) {
    return L.divIcon({
      className: '',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div style="
            background:#fff; border-radius:50%;
            width:42px; height:42px;
            display:flex; align-items:center; justify-content:center;
            box-shadow:0 2px 12px rgba(220,38,38,0.35),0 1px 4px rgba(0,0,0,0.12);
            border:2px solid #fecaca; font-size:20px;
            animation:sosPulse 1s ease-out infinite;
          ">🚨</div>
          <div style="
            background:#fff; border-radius:20px; padding:2px 8px;
            font-size:10px; font-weight:700; color:#dc2626;
            box-shadow:0 1px 4px rgba(0,0,0,0.12); white-space:nowrap;
            font-family:'DM Sans',sans-serif; letter-spacing:0.02em;
          ">SOS</div>
        </div>`,
      iconSize: [42, 64],
      iconAnchor: [21, 64],
      popupAnchor: [0, -66],
    });
  }

  if (request.status === 'accepted') {
    return L.divIcon({
      className: '',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div style="
            background:#fff; border-radius:50%;
            width:38px; height:38px;
            display:flex; align-items:center; justify-content:center;
            box-shadow:0 2px 10px rgba(37,99,235,0.3),0 1px 4px rgba(0,0,0,0.1);
            border:2px solid #bfdbfe; font-size:16px;
          ">✓</div>
          <div style="
            background:#fff; border-radius:20px; padding:2px 8px;
            font-size:10px; font-weight:700; color:#2563eb;
            box-shadow:0 1px 4px rgba(0,0,0,0.1); white-space:nowrap;
            font-family:'DM Sans',sans-serif;
          ">Accepted</div>
        </div>`,
      iconSize: [38, 62],
      iconAnchor: [19, 62],
      popupAnchor: [0, -64],
    });
  }

  const cfg = {
    high:   { color: '#dc2626', border: '#fecaca', label: 'Urgent' },
    medium: { color: '#d97706', border: '#fde68a', label: 'Medium' },
    low:    { color: '#16a34a', border: '#bbf7d0', label: 'Low'    },
  };
  const c = cfg[request.urgency] ?? cfg.low;

  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="
          background:#fff; border-radius:50%;
          width:36px; height:36px;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.14),0 1px 3px rgba(0,0,0,0.08);
          border:2px solid ${c.border};
          font-size:15px; font-weight:800; color:${c.color};
          font-family:'DM Sans',sans-serif;
        ">!</div>
        <div style="
          background:#fff; border-radius:20px; padding:2px 8px;
          font-size:10px; font-weight:700; color:${c.color};
          box-shadow:0 1px 4px rgba(0,0,0,0.1); white-space:nowrap;
          font-family:'DM Sans',sans-serif;
        ">${c.label}</div>
      </div>`,
    iconSize: [36, 60],
    iconAnchor: [18, 60],
    popupAnchor: [0, -62],
  });
};

const urgencyConfig = {
  high:   { label: 'HIGH',   textCls: 'text-red-600',    borderCls: 'border-red-200',    bgCls: 'bg-red-50'    },
  medium: { label: 'MEDIUM', textCls: 'text-yellow-700', borderCls: 'border-yellow-200', bgCls: 'bg-yellow-50' },
  low:    { label: 'LOW',    textCls: 'text-green-700',  borderCls: 'border-green-200',  bgCls: 'bg-green-50'  },
};

// ── Circular Loader ───────────────────────────────────────────────────────────
const MinimalLoader = () => (
  <div
    className="h-screen w-full flex items-center justify-center"
    style={{ background: '#fafaf9', fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}
  >
    <div className="flex flex-col items-center gap-3">
      <div
        style={{
          width: 48,
          height: 40,
          borderRadius: 999,
          border: '2.5px solid #e7e5e4',
          borderTopColor: '#1c1917',
          animation: 'circSpin 0.75s linear infinite',
        }}
      />
      <p
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#a8a29e',
          margin: 0,
        }}
      >
        Locating you
      </p>
    </div>
    <style>{`@keyframes circSpin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ── Status Banner ─────────────────────────────────────────────────────────────
const StatusBanner = ({ status, onDismiss }) => {
  if (status === 'idle') return null;
  const isSearching = status === 'searching';

  return (
    <div className="absolute left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2.5 px-4 py-2.5 bg-white rounded-full shadow-lg border whitespace-nowrap"
      style={{
        top: 88,
        borderColor: isSearching ? '#fde68a' : '#bbf7d0',
        minWidth: 220,
        fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
      }}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0 inline-block"
        style={{
          background: isSearching ? '#f59e0b' : '#16a34a',
          animation: isSearching ? 'bannerPulse 1.2s ease-in-out infinite' : 'none',
        }}
      />
      <span className="flex-1 text-xs font-semibold"
        style={{ color: isSearching ? '#92400e' : '#14532d' }}
      >
        {isSearching ? 'Notifying nearby helpers…' : 'Helper found — on the way!'}
      </span>
      <button
        onClick={onDismiss}
        className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 text-xs font-bold flex-shrink-0 hover:bg-stone-200 transition-colors border-none cursor-pointer"
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
};

// ── Back Button ───────────────────────────────────────────────────────────────
const BackButton = ({ onClick }) => (
  <button
    onClick={onClick}
    aria-label="Go back"
    style={{
      position: 'absolute',
      top: 80,
      left: 16,
      zIndex: 1000,
      width: 48,
      height: 40,
      borderRadius: 999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.94)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(28,25,23,0.08)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
      cursor: 'pointer',
      color: '#78716c',
      transition: 'box-shadow 0.18s, background 0.18s, transform 0.12s',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = 'rgba(255,255,255,1)';
      e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.94)';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)';
    }}
    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
  >
    <svg
      width="14" height="14"
      fill="none" stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 19l-7-7 7-7" />
    </svg>
  </button>
);

// ── Main component ────────────────────────────────────────────────────────────
const MapView = () => {
  const { requests, fetchNearbyRequests, requestStatus } = useRequests();
  const { user }   = useAuth();
  const { updateLocation } = useSocket();
  const navigate   = useNavigate();

  const [userLocation,    setUserLocation]    = useState(null);
  const [map,             setMap]             = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [nearbyUsers,     setNearbyUsers]     = useState([]);
  const [nearestUserId,   setNearestUserId]   = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const didInitialFetchRef = useRef(false);
  const userLocationRef    = useRef(null);

  useEffect(() => {
    setBannerDismissed(false);
  }, [requestStatus]);

  const fetchNearby = useCallback(async (lat, lng) => {
    try {
      const res   = await getNearbyUsers(lat, lng);
      const users = res.data.data ?? [];
      setNearbyUsers(users);
      setNearestUserId(users.length > 0 ? users[0]._id : null);
    } catch (err) {
      console.error('fetchNearby error:', err);
    }
  }, []);

  // ── Geolocation + initial fetch ──────────────────────────────────────────
  useEffect(() => {
    if (didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;

    if (!navigator.geolocation) {
      setLoading(false);
      fetchNearbyRequests(PRAYAGRAJ_CENTER[1], PRAYAGRAJ_CENTER[0]);
      return;
    }

    // Fallback: if geolocation takes > 6 s, show the map at Prayagraj centre
    const fallback = setTimeout(() => {
      if (loading) {
        setLoading(false);
        fetchNearbyRequests(PRAYAGRAJ_CENTER[1], PRAYAGRAJ_CENTER[0]);
      }
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(fallback);
        const { latitude, longitude } = position.coords;
        userLocationRef.current = [latitude, longitude];
        updateLocation([longitude, latitude]);
        fetchNearbyRequests(longitude, latitude);
        fetchNearby(latitude, longitude);
        // Set location and clear loader together so MapContainer already
        // has the right centre before it mounts — no jump.
        setUserLocation([latitude, longitude]);
        setLoading(false);
      },
      (error) => {
        clearTimeout(fallback);
        console.error('Geolocation error:', error);
        setLoading(false);
        fetchNearbyRequests(PRAYAGRAJ_CENTER[1], PRAYAGRAJ_CENTER[0]);
      },
      { timeout: 6000, maximumAge: 30000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fly to user location once map AND location are both ready ───────────
  useEffect(() => {
    if (!map || !userLocation) return;
    map.setView(userLocation, 13, { animate: false });
  }, [map, userLocation]);

  // ── Nearby users refresh (every 30 s) ───────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      const loc = userLocationRef.current;
      if (loc) fetchNearby(loc[0], loc[1]);
    }, 30_000);
    return () => clearInterval(timer);
  }, [fetchNearby]);

  // ── Fly to latest request ────────────────────────────────────────────────
  useEffect(() => {
    if (!map || requests.length === 0) return;
    const latest = [...requests].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
    if (latest?.location?.coordinates) {
      const [lng, lat] = latest.location.coordinates;
      map.flyTo([lat, lng], 15, { duration: 1.2 });
    }
  }, [requests.length, map]);

  const userIcon = L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <div style="
          background:#1c1917; border-radius:50%;
          width:40px; height:40px;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 3px 12px rgba(0,0,0,0.25),0 1px 4px rgba(0,0,0,0.12);
          border:2.5px solid #fff; color:#fff;
          font-family:'DM Sans',sans-serif; font-weight:700; font-size:16px;
        ">${user?.name?.[0]?.toUpperCase() ?? '?'}</div>
        <div style="
          background:#1c1917; color:#fff;
          border-radius:20px; padding:2px 10px;
          font-size:10px; font-weight:700;
          box-shadow:0 1px 4px rgba(0,0,0,0.18); white-space:nowrap;
          font-family:'DM Sans',sans-serif; letter-spacing:0.02em;
        ">You</div>
      </div>`,
    iconSize: [40, 64],
    iconAnchor: [20, 64],
    popupAnchor: [0, -66],
  });

  const highCount   = requests.filter(r => r.urgency === 'high').length;
  const showBanner  = false;

  if (loading) return <MinimalLoader />;

  return (
    <div
      className="h-screen w-full relative overflow-hidden"
      style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}
    >
      {showBanner && !bannerDismissed && (
        <StatusBanner
          status={requestStatus}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* ── Map ── */}
      <MapContainer
        center={userLocation ?? PRAYAGRAJ_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={setMap}
        zoomControl={false}
        maxBounds={PRAYAGRAJ_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={11}
        maxZoom={18}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* User marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup closeButton={false}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", width: 224, padding: 0, overflow: 'hidden' }}>
                <div className="px-3 pt-3 pb-2.5 flex items-start gap-2.5">
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-stone-900 text-white flex items-center justify-center text-[13px] font-bold">
                      {user?.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2 border-white bg-green-500" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[13px] font-bold text-stone-900 leading-tight truncate m-0">
                      {user?.name}
                    </p>
                    <p className="text-[9px] text-stone-400 uppercase tracking-widest font-medium mt-0.5 m-0">
                      Community Helper
                    </p>
                  </div>
                  <button
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer border border-stone-200 bg-stone-100 text-stone-400 hover:bg-stone-200 transition-colors p-0"
                    style={{ alignSelf: 'flex-start', marginTop: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.currentTarget.closest('.leaflet-popup')
                        ?._leaflet_events
                        && map?.closePopup();
                    }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                <div className="mx-3 h-px bg-stone-100" />
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border
                    ${user?.isAvailable
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-600 border-red-200'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${user?.isAvailable ? 'bg-green-500' : 'bg-red-400'}`} />
                    {user?.isAvailable ? 'Available for help' : 'Unavailable'}
                  </span>
                </div>
                <div className="px-3 pb-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">Your pin</span>
                  <span className="text-[11px] text-stone-500 tabular-nums">
                    {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Request markers */}
        {requests.map((request) => {
          if (!request?.location?.coordinates) return null;
          const urg = urgencyConfig[request.urgency] ?? urgencyConfig.low;
          return (
            <Marker
              key={request._id}
              position={[
                request.location.coordinates[1],
                request.location.coordinates[0],
              ]}
              icon={getMarkerIcon(request)}
            >
              <Popup closeButton={false}>
                <div style={{ fontFamily: "'DM Sans',sans-serif", width: 230, padding: '14px 16px' }}>
                  <div className="flex gap-1.5 mb-2.5">
                    <span className={`inline-block border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full ${urg.textCls} ${urg.bgCls} ${urg.borderCls}`}>
                      {urg.label}
                    </span>
                    <span className="inline-block border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full text-stone-500">
                      {request.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-stone-900 text-[15px] leading-snug mb-1.5">
                    {request.title}
                  </h3>
                  {request.description && (
                    <p className="text-xs text-stone-500 leading-relaxed mb-3 line-clamp-2">
                      {request.description}
                    </p>
                  )}
                  <div className="border-t border-stone-100 pt-2.5">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[11px] text-stone-400 font-semibold">
                        {request.createdBy?.name}
                      </p>
                      {request.createdBy?.isVerified && (
                        <span className="text-[10px] text-green-600 font-bold">✔</span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-300 mb-2.5">
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="w-full bg-stone-900 text-white border-none py-2 rounded-2xl text-[11px] font-bold cursor-pointer tracking-wide transition-colors duration-150 hover:bg-stone-700"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Nearby user markers */}
        {userLocation && nearbyUsers.map((u) => (
          <NearbyUserMarker
            key={u._id}
            user={u}
            currentLat={userLocation[0]}
            currentLng={userLocation[1]}
            isNearest={u._id === nearestUserId}
          />
        ))}
      </MapContainer>

      {/* ── Back button — top-left, floats above map ── */}
      <BackButton onClick={() => navigate(-1)} />

      {/* ── Top-right panel ── */}
      <div className="absolute top-[72px] right-4 z-[1000] flex flex-col gap-2">

        {/* Requests card — pill */}
        <div
          style={{
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(28,25,23,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 16px',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 900, color: '#1c1917', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {requests.length}
          </span>
          <span style={{ width: 1, height: 20, background: 'rgba(28,25,23,0.12)', flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a8a29e', whiteSpace: 'nowrap' }}>
            Nearby Requests
          </span>
          {highCount > 0 && (
            <>
              <span style={{ width: 1, height: 20, background: 'rgba(28,25,23,0.12)', flexShrink: 0, display: 'inline-block' }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: '#ef4444', display: 'inline-block', flexShrink: 0, animation: 'blink 1.2s ease-in-out infinite' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', whiteSpace: 'nowrap' }}>{highCount} urgent</span>
              </span>
            </>
          )}
        </div>

        {/* Online Helpers card */}
        {nearbyUsers.length > 0 && (
          <div
            style={{
              background: 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(28,25,23,0.08)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
              borderRadius: 20,
              minWidth: 158,
            }}
          >
            <div style={{ padding: '13px 16px 11px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: '#15803d', lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: 2 }}>
                {nearbyUsers.length}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a8a29e' }}>
                Online Helpers
              </div>
            </div>
            <div style={{ borderTop: '1px solid #f5f5f4', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#15803d' }}>Within 2.4 km</span>
            </div>
          </div>
        )}
      </div>


      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');

        @keyframes spin        { to { transform: rotate(360deg); } }
        @keyframes circSpin    { to { transform: rotate(360deg); } }
        @keyframes blink       { 0%,100%{opacity:1;}50%{opacity:0.3;} }
        @keyframes sosPulse    { 0%{box-shadow:0 0 0 0 rgba(220,38,38,0.5);}70%{box-shadow:0 0 0 10px rgba(220,38,38,0);}100%{box-shadow:0 0 0 0 rgba(220,38,38,0);} }
        @keyframes bannerPulse { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(0.8);} }

        .leaflet-popup-content-wrapper {
          border-radius: 18px !important;
          padding: 0 !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06) !important;
          border: 1px solid rgba(240,238,236,0.9) !important;
          overflow: hidden !important;
        }
        .leaflet-popup-close-button { display: none !important; }
        .leaflet-popup-content       { margin: 0 !important; width: auto !important; }
        .leaflet-popup-tip-container { display: none !important; }
        .leaflet-control-zoom        { display: none !important; }
        .leaflet-tile              { transition: opacity 0.35s ease !important; }
        .leaflet-fade-anim .leaflet-popup { transition: opacity 0.2s ease !important; }
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(255,255,255,0.6) !important;
          backdrop-filter: blur(6px) !important;
          border-radius: 8px !important;
          padding: 2px 6px !important;
        }
      `}</style>
    </div>
  );
};

export default MapView;