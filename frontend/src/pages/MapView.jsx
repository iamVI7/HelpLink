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

// ── Friendly Loader ───────────────────────────────────────────────────────────
const LOADER_STEPS = [
  { icon: '📍', label: 'Finding your location' },
  { icon: '📡', label: 'Connecting to network'  },
  { icon: '🗺️', label: 'Loading nearby requests' },
];

const MinimalLoader = () => {
  const [step, setStep] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStep(prev => (prev < LOADER_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(stepTimer);
  }, []);

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 420);
    return () => clearInterval(dotTimer);
  }, []);

  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafaf9',
        fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes loaderFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes loaderSpin   { to { transform: rotate(360deg); } }
        @keyframes loaderPulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes stepIn       { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
      `}</style>

      <div style={{
        background: '#ffffff',
        borderRadius: 28,
        border: '1px solid rgba(28,25,23,0.07)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.07), 0 2px 8px rgba(0,0,0,0.04)',
        padding: '36px 40px 32px',
        width: 300,
        animation: 'loaderFadeUp 0.4s ease both',
      }}>
        {/* Spinner */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '3px solid #f0ede9',
            borderTopColor: '#1c1917',
            animation: 'loaderSpin 0.8s linear infinite',
          }} />
        </div>

        {/* Step list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {LOADER_STEPS.map((s, i) => {
            const done    = i < step;
            const current = i === step;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                opacity: done ? 0.38 : current ? 1 : 0.22,
                transition: 'opacity 0.4s ease',
                animation: current ? 'stepIn 0.3s ease both' : 'none',
              }}>
                {/* Icon / check */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: done ? '#f0fdf4' : current ? '#1c1917' : '#f5f5f4',
                  border: done ? '1px solid #bbf7d0' : current ? 'none' : '1px solid #e7e5e4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13,
                  transition: 'background 0.3s, border 0.3s',
                }}>
                  {done
                    ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5L5.5 9.5L10.5 4" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : current
                    ? <span style={{ fontSize: 12, color: 'white' }}>{i + 1}</span>
                    : <span style={{ fontSize: 12, color: '#a8a29e' }}>{i + 1}</span>
                  }
                </div>

                {/* Label */}
                <span style={{
                  fontSize: 13,
                  fontWeight: current ? 600 : 400,
                  color: done ? '#a8a29e' : current ? '#1c1917' : '#c4c1be',
                  transition: 'color 0.3s',
                }}>
                  {s.label}{current ? dots : done ? '' : ''}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom hint */}
        <p style={{
          margin: 0, textAlign: 'center',
          fontSize: 11, fontWeight: 500,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: '#c4c1be',
          animation: 'loaderPulse 2s ease-in-out infinite',
        }}>
          HelpLink
        </p>
      </div>
    </div>
  );
};

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

// ── Bottom Action Bar ─────────────────────────────────────────────────────────
const BottomActionBar = ({ onRequestHelp, onRefresh, refreshing }) => (
  <div
    className="bottom-action-bar-wrap"
    style={{
      position: 'relative',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '7px 8px',
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderRadius: 999,
      border: '1px solid rgba(28,25,23,0.09)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
      fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
      whiteSpace: 'nowrap',
    }}
  >
    {/* Request Help */}
    <button
      onClick={onRequestHelp}
      aria-label="Request help"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 16px',
        borderRadius: 999,
        border: 'none',
        background: '#dc2626',
        color: '#fff',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        boxShadow: '0 4px 18px rgba(220,38,38,0.35)',
        transition: 'background 0.15s, box-shadow 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#b91c1c';
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(220,38,38,0.45)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = '#dc2626';
        e.currentTarget.style.boxShadow = '0 4px 18px rgba(220,38,38,0.35)';
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {/* SOS bell icon */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      Request Help
    </button>

    {/* Divider */}
    <div style={{ width: 1, height: 24, background: 'rgba(28,25,23,0.1)', flexShrink: 0 }} />

    {/* Refresh */}
    <button
      onClick={onRefresh}
      aria-label="Refresh map"
      title="Refresh nearby requests"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '10px 12px',
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        color: '#78716c',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        cursor: refreshing ? 'default' : 'pointer',
        transition: 'color 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => { if (!refreshing) e.currentTarget.style.color = '#1c1917'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#78716c'; }}
      onMouseDown={e => { if (!refreshing) e.currentTarget.style.transform = 'scale(0.93)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <svg
        width="14" height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          flexShrink: 0,
          animation: refreshing ? 'refreshSpin 0.7s linear infinite' : 'none',
          transformOrigin: 'center',
        }}
      >
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
      Refresh
    </button>
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const MapView = () => {
  const { requests, fetchNearbyRequests, requestStatus } = useRequests();
  const { user }   = useAuth();
  const { socket, updateLocation } = useSocket();
  const navigate   = useNavigate();

  const [userLocation,    setUserLocation]    = useState(null);
  const [map,             setMap]             = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [nearbyUsers,     setNearbyUsers]     = useState([]);
  const [nearestUserId,   setNearestUserId]   = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [refreshing,      setRefreshing]      = useState(false);

  const didInitialFetchRef  = useRef(false);
  const userLocationRef     = useRef(null);
  const latestSocketReqRef  = useRef(null);

  useEffect(() => {
    setBannerDismissed(false);
  }, [requestStatus]);

  const fetchNearby = useCallback(async (lat, lng) => {
    try {
      const res   = await getNearbyUsers(lat, lng);
      const allUsers = res.data.data ?? [];
      const users = allUsers.filter(u => u.role !== 'admin');
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
    map.setView(userLocation, 15, { animate: true });
  }, [map, userLocation]);

  // ── Nearby users refresh (every 30 s) ───────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      const loc = userLocationRef.current;
      if (loc) fetchNearby(loc[0], loc[1]);
    }, 30_000);
    return () => clearInterval(timer);
  }, [fetchNearby]);

  // ── Fly to latest request when requests list grows ─────────────────────
  useEffect(() => {
    if (!map || requests.length === 0) return;
    const latest = [...requests].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
    if (latest?.location?.coordinates && latest._id !== latestSocketReqRef.current) {
      latestSocketReqRef.current = latest._id;
      const [lng, lat] = latest.location.coordinates;
      map.flyTo([lat, lng], 16, { duration: 1.5 });
    }
  }, [requests.length, map]);

  // ── Real-time: pan to every new_request the moment it arrives ───────────
  useEffect(() => {
    if (!socket || !map) return;
    const handleNewRequest = (data) => {
      const req = data?.request;
      if (!req?.location?.coordinates) return;
      if (latestSocketReqRef.current === req._id) return;
      latestSocketReqRef.current = req._id;
      const [lng, lat] = req.location.coordinates;
      map.flyTo([lat, lng], 15, { duration: 1.2 });
    };
    socket.on('new_request', handleNewRequest);
    return () => socket.off('new_request', handleNewRequest);
  }, [socket, map]);

  // ── Refresh handler ──────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    const loc = userLocationRef.current;
    const [lng, lat] = loc
      ? [loc[1], loc[0]]
      : [PRAYAGRAJ_CENTER[1], PRAYAGRAJ_CENTER[0]];
    try {
      await Promise.all([
        fetchNearbyRequests(lng, lat),
        loc ? fetchNearby(loc[0], loc[1]) : Promise.resolve(),
      ]);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  }, [refreshing, fetchNearbyRequests, fetchNearby]);

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

  const highCount  = requests.filter(r => r.urgency === 'high').length;
  const showBanner = false;

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
      <div className="absolute top-[72px] right-4 z-[40] flex flex-col gap-2">

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
          <div style={{
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(28,25,23,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 14px',
            gap: 10,
          }}>
            {/* Avatars stack */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {nearbyUsers.slice(0, 3).map((u, i) => (
                <div key={u._id} style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: '#15803d',
                  border: '2px solid #fff',
                  marginLeft: i === 0 ? 0 : -8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#fff',
                  fontFamily: "'DM Sans', sans-serif",
                  zIndex: 3 - i,
                  position: 'relative',
                }}>
                  {u.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              ))}
            </div>
            <span style={{ width: 1, height: 18, background: 'rgba(28,25,23,0.1)', flexShrink: 0 }} />
            {/* Count + label */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#15803d', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {nearbyUsers.length} helper{nearbyUsers.length > 1 ? 's' : ''} nearby
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#a8a29e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Within 5 km
              </span>
            </div>
            {/* Live dot */}
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
          </div>
        )}
      </div>

      {/* ── Bottom bar group ── */}
      <div style={{
        position: 'absolute',
        bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: 'calc(100vw - 24px)',
      }}>
        <BottomActionBar
          onRequestHelp={() => navigate('/')}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        {/* ── Locate Me pill ── */}
        <button
        onClick={() => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              userLocationRef.current = [latitude, longitude];
              setUserLocation([latitude, longitude]);
              if (map) map.flyTo([latitude, longitude], 15, { duration: 1.2 });
            },
            (error) => {
              console.error('Locate me error:', error);
              if (map && userLocation) map.flyTo(userLocation, 15, { duration: 1.2 });
            },
            { timeout: 5000, maximumAge: 0 }
          );
        }}
        aria-label="Locate me"
        title="Centre map on your location"
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          flexShrink: 0,
          border: '1px solid rgba(28,25,23,0.09)',
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          color: '#1c1917',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          transition: 'background 0.15s, transform 0.1s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.96)'; }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          <circle cx="12" cy="12" r="8" strokeWidth="1.5" strokeDasharray="2 2"/>
        </svg>
      </button>
      </div>

      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');

        @keyframes spin          { to { transform: rotate(360deg); } }
        @keyframes circSpin      { to { transform: rotate(360deg); } }
        @keyframes refreshSpin   { to { transform: rotate(360deg); } }
        @keyframes blink         { 0%,100%{opacity:1;}50%{opacity:0.3;} }
        @keyframes sosPulse      { 0%{box-shadow:0 0 0 0 rgba(220,38,38,0.5);}70%{box-shadow:0 0 0 10px rgba(220,38,38,0);}100%{box-shadow:0 0 0 0 rgba(220,38,38,0);} }
        @keyframes bannerPulse   { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(0.8);} }
        @media (max-width: 380px) {
          .bottom-action-bar-wrap { padding: 5px 6px !important; }
          .bottom-action-bar-wrap button { padding: 8px 10px !important; font-size: 11px !important; }
        }

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
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .bottom-action-bar-wrap { padding-bottom: env(safe-area-inset-bottom); }
        }
      `}</style>
    </div>
  );
};

export default MapView;
