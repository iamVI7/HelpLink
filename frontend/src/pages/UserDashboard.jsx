/**
 * Dashboard.jsx — TWO-COLUMN ARRANGEMENT
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRequests } from '../context/RequestContext';
import { useSocket } from '../context/SocketContext';
import RequestCard from '../components/RequestCard';
import { SoftPrompt, useEmergencyProfilePrompt } from '../components/EmergencyProfilePrompt';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (km) => {
  if (km < 0.2) return 'Very close';
  if (km < 1)   return 'Nearby';
  return `${km.toFixed(1)} km away`;
};

const NO_RESPONSE_THRESHOLD_MS = 2 * 60 * 1000;
const isNoResponse = (req) => {
  if (req.status !== 'open') return false;
  return Date.now() - new Date(req.createdAt).getTime() > NO_RESPONSE_THRESHOLD_MS;
};

// ─────────────────────────────────────────────────────────────────────────────
// StarIcon + RatingRow
// ─────────────────────────────────────────────────────────────────────────────
const StarIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 1.5L9.545 5.635L14 6.18L10.75 9.27L11.636 13.5L8 11.385L4.364 13.5L5.25 9.27L2 6.18L6.455 5.635L8 1.5Z"
      fill={filled ? '#E4A017' : 'none'}
      stroke={filled ? '#E4A017' : '#c4b5a0'}
      strokeWidth="1"
    />
  </svg>
);

const RatingRow = ({ requestId, onRate }) => {
  const [hovered,   setHovered]   = useState(0);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="px-5 py-3 flex items-center gap-2 border-t border-amber-50">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6.25" stroke="#16a34a" strokeWidth="0.5" />
          <path d="M4 7l2 2 4-4" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-xs text-green-600 font-medium">Thanks for the feedback</span>
      </div>
    );
  }

  return (
    <div className="px-5 py-3 flex items-center gap-4 border-t border-amber-50 bg-amber-50/40">
      <span className="text-[10px] uppercase tracking-[0.16em] text-amber-700 font-bold">Rate helper</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => { setSubmitted(true); onRate(requestId, star); }}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 transition-colors active:scale-95"
          >
            <StarIcon filled={star <= hovered} />
          </button>
        ))}
      </div>
      <div className="w-px h-4 bg-amber-200" />
      <button
        className="text-[10px] uppercase tracking-widest text-amber-500 hover:text-amber-700 font-bold transition-colors"
        onClick={() => setSubmitted(true)}
      >
        Skip
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────
const EmptyState = ({ title, subtitle }) => (
  <div className="py-20 text-center flex flex-col items-center gap-3">
    <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-2xl mb-1">
      🌿
    </div>
    <p className="text-base font-semibold text-stone-700" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
      {title}
    </p>
    <p className="text-sm text-stone-400 max-w-xs leading-relaxed">{subtitle}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sk — shimmer block primitive
// ─────────────────────────────────────────────────────────────────────────────
const Sk = ({ w, h, r = 8, style = {} }) => (
  <div
    className="sk-shimmer"
    style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }}
  />
);

const HeroCardSkeleton = () => (
  <div className="hero-card mt-6 px-7 py-8">
    <Sk w={90} h={22} r={100} style={{ marginBottom: 20 }} />
    <Sk w="56%" h={46} r={10} style={{ marginBottom: 10 }} />
    <Sk w="70%" h={13} r={6} style={{ marginBottom: 6 }} />
    <Sk w="50%" h={13} r={6} style={{ marginBottom: 28 }} />
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
      <Sk w={88}  h={38} r={100} />
      <Sk w={74}  h={38} r={100} />
      <Sk w={92}  h={38} r={100} />
      <Sk w={72}  h={38} r={100} />
    </div>
    <Sk w={148} h={42} r={100} />
  </div>
);

const NearbyRowSkeleton = ({ last = false }) => (
  <div style={{ padding: '16px 20px', borderBottom: last ? 'none' : '1px solid #f5f3f0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
      <Sk w={68} h={20} r={100} />
      <Sk w={54} h={13} r={6} />
    </div>
    <Sk w="64%" h={15} r={6} style={{ marginBottom: 8 }} />
    <Sk w="88%" h={12} r={5} style={{ marginBottom: 5 }} />
    <Sk w="54%" h={12} r={5} style={{ marginBottom: 14 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Sk w={26} h={26} r={50} />
      <Sk w={80} h={11} r={5} />
      <Sk w={38} h={11} r={5} style={{ marginLeft: 'auto' }} />
    </div>
  </div>
);

const ActivityRowSkeleton = ({ last = false }) => (
  <div style={{ padding: '16px 20px', borderBottom: last ? 'none' : '1px solid #f5f3f0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
      <Sk w={60} h={20} r={100} />
      <Sk w={46} h={13} r={6} />
    </div>
    <Sk w="62%" h={15} r={6} style={{ marginBottom: 8 }} />
    <Sk w="85%" h={12} r={5} style={{ marginBottom: 5 }} />
    <Sk w="48%" h={12} r={5} style={{ marginBottom: 14 }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Sk w={26} h={26} r={50} />
      <Sk w={76} h={11} r={5} />
      <Sk w={36} h={11} r={5} style={{ marginLeft: 'auto' }} />
    </div>
  </div>
);

const DashboardSkeleton = () => (
  <div className="flex flex-col lg:flex-row gap-6 items-start">
    <div className="w-full lg:w-[55%] flex-shrink-0">
      <HeroCardSkeleton />
      <div className="mt-6">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Sk w={148} h={18} r={6} />
          <Sk w={56}  h={13} r={6} />
        </div>
        <div className="content-card">
          <NearbyRowSkeleton />
          <NearbyRowSkeleton />
          <NearbyRowSkeleton last />
        </div>
      </div>
    </div>
    <div className="w-full lg:flex-1">
      <div className="right-sticky">
        <div className="mt-6">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Sk w={104} h={18} r={6} />
            <Sk w={130} h={13} r={6} />
          </div>
          <div className="content-card">
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid #f0ece8',
              background: '#faf9f7',
            }}>
              <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 100, background: '#ede9e4' }}>
                <Sk w={92} h={30} r={100} />
                <Sk w={72} h={30} r={100} />
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <Sk w={50} h={24} r={100} />
                <Sk w={74} h={24} r={100} />
              </div>
            </div>
            <ActivityRowSkeleton />
            <ActivityRowSkeleton />
            <ActivityRowSkeleton />
            <ActivityRowSkeleton last />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// StatPill
// ─────────────────────────────────────────────────────────────────────────────
const StatPill = ({ value, label, color, bg }) => (
  <div
    className="stat-chip flex items-center gap-2 px-4 py-2 rounded-full border"
    style={{ background: bg, borderColor: `${color}22` }}
  >
    <span className="text-lg font-bold leading-none" style={{ color, fontFamily: "'Fraunces', Georgia, serif" }}>
      {value}
    </span>
    <span className="text-[10px] uppercase tracking-widest font-semibold text-stone-400">{label}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SectionLabel
// ─────────────────────────────────────────────────────────────────────────────
const SectionLabel = ({ children, aside }) => (
  <div className="flex items-center justify-between mb-4">
    <h2
      className="text-base font-semibold text-stone-800 tracking-tight"
      style={{ fontFamily: "'Fraunces', Georgia, serif" }}
    >
      {children}
    </h2>
    {aside && <span className="text-[11px] text-stone-400 font-medium">{aside}</span>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────
const UserDashboard = () => {
  const { user, isAuthenticated } = useAuth();

  // ✅ Pull myAcceptedRequests directly from context — it is updated
  // immediately by acceptRequest() and by socket-driven updateRequestState(),
  // so the Helps tab reflects changes without any page reload or polling.
  const {
    requests,
    fetchNearbyRequests,
    myAcceptedRequests,
    fetchMyAcceptedRequests,
  } = useRequests();

  const { isConnected, viewerCounts } = useSocket();

  const [userCoords, setUserCoords] = useState(null);
  const didFetchRef                  = useRef(false);
  const activeRequests               = requests || [];
  const [stats, setStats]           = useState({ total: 0, high: 0, medium: 0, low: 0 });

  const [activityTab,     setActivityTab]     = useState('requests');
  const [statusFilter,    setStatusFilter]    = useState('active');
  const [myRequests,      setMyRequests]      = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const didFetchActivity                       = useRef(false);

  const [slideDir, setSlideDir] = useState(1);
  const [slideKey, setSlideKey] = useState(0);

  const { showSoft, dismissSoft } = useEmergencyProfilePrompt(isAuthenticated);

  // ── Geolocation ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || didFetchRef.current) return;
    if (!navigator.geolocation) {
      fetchNearbyRequests(78.9629, 20.5937);
      didFetchRef.current = true;
      return;
    }
    didFetchRef.current = true;
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        setUserCoords({ lat: latitude, lng: longitude });
        fetchNearbyRequests(latitude, longitude);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        toast.error('Enable location services to see nearby requests');
        fetchNearbyRequests(78.9629, 20.5937);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [user?._id, fetchNearbyRequests]);

  // ── Stats from nearby requests ─────────────────────────────────────────────
  useEffect(() => {
    setStats({
      total:  activeRequests.length,
      high:   activeRequests.filter(r => r.urgency === 'high').length,
      medium: activeRequests.filter(r => r.urgency === 'medium').length,
      low:    activeRequests.filter(r => r.urgency === 'low').length,
    });
  }, [activeRequests]);

  // ── Initial activity fetch (runs once on mount) ────────────────────────────
  // Only fetches myRequests here. myHelps comes from context (myAcceptedRequests)
  // which is already kept live by acceptRequest + socket updateRequestState.
  useEffect(() => {
    if (!user || didFetchActivity.current) return;
    didFetchActivity.current = true;

    const loadActivity = async () => {
      setActivityLoading(true);
      try {
        const [reqRes] = await Promise.all([
          api.get('/requests/my-requests'),
          // ✅ Also seed myAcceptedRequests in context on first load
          fetchMyAcceptedRequests(),
        ]);
        const toArr = (res) => {
          const d = res.data;
          if (Array.isArray(d)) return d;
          if (Array.isArray(d?.requests)) return d.requests;
          return [];
        };
        setMyRequests(toArr(reqRes));
      } catch (err) {
        console.error('[Dashboard] activity fetch error:', err);
        toast.error('Could not load your activity');
      } finally {
        setActivityLoading(false);
      }
    };
    loadActivity();
  }, [user?._id, fetchMyAcceptedRequests]);

  // ── Rating ─────────────────────────────────────────────────────────────────
  const handleRating = async (requestId, rating) => {
    try {
      await api.post(`/requests/${requestId}/rate`, { rating });
      toast.success('Rating submitted');
      const res = await api.get('/requests/my-requests');
      const toArr = (r) => Array.isArray(r.data) ? r.data : (r.data?.requests ?? []);
      setMyRequests(toArr(res));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rate');
    }
  };

  const TAB_ORDER = ['requests', 'helps'];

  const handleTabSwitch = useCallback((newTab) => {
    if (newTab === activityTab) return;
    const dir = TAB_ORDER.indexOf(newTab) > TAB_ORDER.indexOf(activityTab) ? 1 : -1;
    setSlideDir(dir);
    setActivityTab(newTab);
    setStatusFilter('active');
    setSlideKey(k => k + 1);
  }, [activityTab]);

  const handleFilterSwitch = useCallback((filter) => {
    if (filter === statusFilter) return;
    setSlideDir(filter === 'completed' ? 1 : -1);
    setStatusFilter(filter);
    setSlideKey(k => k + 1);
  }, [statusFilter]);

  // ── Derived lists ──────────────────────────────────────────────────────────
  const activeReqs     = myRequests.filter(r => r.status !== 'completed');
  const completedReqs  = myRequests.filter(r => r.status === 'completed');

  // ✅ myHelps comes directly from context — live, no reload needed
  const activeHelps    = myAcceptedRequests.filter(r => r.status !== 'completed');
  const completedHelps = myAcceptedRequests.filter(r => r.status === 'completed');

  const displayRequests = statusFilter === 'active' ? activeReqs    : completedReqs;
  const displayHelps    = statusFilter === 'active' ? activeHelps   : completedHelps;
  const displayList     = activityTab  === 'requests' ? displayRequests : displayHelps;

  const computeRequestProps = useCallback((req) => {
    let distanceLabel = null;
    if (userCoords && req.location?.coordinates?.length === 2) {
      const [reqLng, reqLat] = req.location.coordinates;
      const km = haversineKm(userCoords.lat, userCoords.lng, reqLat, reqLng);
      distanceLabel = formatDistance(km);
    }
    return { distanceLabel, noResponse: isNoResponse(req) };
  }, [userCoords]);

  const emptyStates = {
    requests: {
      active:    { title: 'No active requests.',    subtitle: 'Create a request when you need help.' },
      completed: { title: 'No completed requests.', subtitle: 'Completed requests will appear here.' },
    },
    helps: {
      active:    { title: 'Not helping anyone yet.', subtitle: 'Browse nearby requests and lend a hand.' },
      completed: { title: 'No completed help.',      subtitle: 'Requests you help complete will appear here.' },
    },
  };
  const emptyMsg  = emptyStates[activityTab][statusFilter];
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        background: '#f7f5f2',
        color: '#1c1917',
        paddingTop: '80px',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-border {
          0%,100% { border-color: rgba(220,38,38,0.25); }
          50%      { border-color: rgba(220,38,38,0.55); }
        }

        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        .sk-shimmer {
          background: linear-gradient(90deg, #e8e4de 25%, #f0ece6 50%, #e8e4de 75%);
          background-size: 600px 100%;
          animation: shimmer 1.6s ease-in-out infinite;
        }

        @keyframes slideFromRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideFromLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .slide-from-right {
          animation: slideFromRight 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .slide-from-left {
          animation: slideFromLeft 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .anim-0 { animation: slideUp 0.48s 0.04s both ease-out; }
        .anim-1 { animation: slideUp 0.48s 0.10s both ease-out; }
        .anim-2 { animation: slideUp 0.48s 0.18s both ease-out; }
        .anim-3 { animation: slideUp 0.48s 0.26s both ease-out; }
        .anim-4 { animation: slideUp 0.48s 0.34s both ease-out; }

        .hero-card {
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 6px 24px rgba(0,0,0,0.05);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .action-pill {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 11px 24px;
          background: #dc2626; color: #fff;
          border-radius: 100px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          transition: background 0.16s, box-shadow 0.16s, transform 0.1s;
          text-decoration: none;
        }
        .action-pill:hover {
          background: #b91c1c;
          box-shadow: 0 6px 20px rgba(220,38,38,0.3);
          transform: translateY(-1px);
        }
        .action-pill:active { transform: translateY(0); box-shadow: none; }

        .stat-chip { transition: transform 0.15s, box-shadow 0.15s; }
        .stat-chip:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .content-card {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.05);
          overflow: hidden;
        }

        .tab-pill {
          padding: 7px 18px;
          border-radius: 100px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase;
          cursor: pointer; border: none; background: none;
          transition: background 0.18s, color 0.18s;
        }
        .tab-pill.active   { background: #1c1917; color: #fff; }
        .tab-pill.inactive { color: #a8a29e; }
        .tab-pill.inactive:hover { background: #ebe8e4; color: #57534e; }

        .filter-chip {
          padding: 5px 13px;
          border-radius: 100px;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.06em; text-transform: uppercase;
          cursor: pointer; border: none; background: none;
          transition: background 0.18s, color 0.18s;
        }
        .filter-chip.active   { background: #ebe8e4; color: #44403c; }
        .filter-chip.inactive { color: #c4b5a0; }
        .filter-chip.inactive:hover { color: #78716c; }

        .req-item { transition: background 0.12s; }
        .req-item:hover { background: #faf9f7; }

        .dashboard-badge {
          animation: pulse-border 2.4s ease-in-out infinite;
          display: inline-flex; align-items: center;
          padding: 4px 13px; border-radius: 100px;
          border: 1px solid rgba(220,38,38,0.3);
          color: #dc2626;
          font-size: 10px; font-weight: 700; letter-spacing: 0.16em;
          text-transform: uppercase;
          background: rgba(254,242,242,0.7);
        }

        .right-sticky {
          position: sticky;
          top: 88px;
          max-height: calc(100vh - 104px);
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-gutter: stable;
          padding-right: 6px;
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
          transition: scrollbar-color 0.3s;
        }
        .right-sticky:hover { scrollbar-color: #ddd8d2 transparent; }
        .right-sticky::-webkit-scrollbar { width: 4px; }
        .right-sticky::-webkit-scrollbar-track {
          background: transparent;
          margin: 8px 0;
        }
        .right-sticky::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 10px;
        }
        .right-sticky:hover::-webkit-scrollbar-thumb { background: #ddd8d2; }
        .right-sticky::-webkit-scrollbar-thumb:hover { background: #b8b0a8; }

        .tab-viewport { overflow: hidden; }
      `}</style>

      {/* Dot-grid background */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          opacity: 0.55,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pb-16">

          {activityLoading ? (
            <DashboardSkeleton />
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 items-start">

              {/* ══ LEFT COLUMN ══ */}
              <div className="w-full lg:w-[55%] flex-shrink-0">

                <div className="hero-card mt-6 px-7 py-8 anim-0">
                  <div className="mb-5">
                    <span className="dashboard-badge">Dashboard</span>
                  </div>
                  <h1
                    style={{
                      fontFamily: "'Fraunces', Georgia, serif",
                      fontSize: 'clamp(1.9rem, 5vw, 2.9rem)',
                      fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.015em',
                      color: '#1c1917',
                    }}
                  >
                    Hello,{' '}
                    <span style={{ color: '#dc2626', fontStyle: 'italic' }}>{firstName}.</span>
                  </h1>
                  <p className="text-sm text-stone-400 mt-2 mb-6 leading-relaxed" style={{ maxWidth: 300 }}>
                    Manage your requests, track your help, and respond to your community.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-7">
                    <StatPill value={stats.total}  label="Total"  color="#1c1917" bg="#f7f5f2" />
                    <StatPill value={stats.high}   label="High"   color="#dc2626" bg="#fef2f2" />
                    <StatPill value={stats.medium} label="Medium" color="#d97706" bg="#fffbeb" />
                    <StatPill value={stats.low}    label="Low"    color="#16a34a" bg="#f0fdf4" />
                  </div>
                  <Link to="/create-request" className="action-pill">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    New Request
                  </Link>
                </div>

                {showSoft && (
                  <div className="mt-4 anim-1">
                    <SoftPrompt onDismiss={dismissSoft} />
                  </div>
                )}

                <div className="mt-6 anim-2">
                  <SectionLabel aside={`${activeRequests.length} nearby`}>
                    Nearby Requests
                  </SectionLabel>
                  <div className="content-card">
                    {activeRequests.length === 0 ? (
                      <EmptyState
                        title="No requests nearby."
                        subtitle="Check back soon — your community may need help."
                      />
                    ) : (
                      <div>
                        {activeRequests.map((req, idx) => {
                          const { distanceLabel, noResponse } = computeRequestProps(req);
                          return (
                            <div
                              key={req._id}
                              className="req-item"
                              style={{ borderBottom: idx < activeRequests.length - 1 ? '1px solid #f5f3f0' : 'none' }}
                            >
                              <RequestCard
                                request={req}
                                showActions={true}
                                distanceLabel={distanceLabel}
                                noResponse={noResponse}
                                viewerCount={viewerCounts[req._id]}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* ══ RIGHT COLUMN ══ */}
              <div className="w-full lg:flex-1 anim-3">
                <div className="right-sticky">
                  <div className="mt-6">
                    {/* ✅ myAcceptedRequests.length reflects live context state */}
                    <SectionLabel aside={`${myRequests.length} requests · ${myAcceptedRequests.length} helps`}>
                      My Activity
                    </SectionLabel>

                    <div className="content-card">
                      {/* Tab + filter bar */}
                      <div
                        className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: '1px solid #f0ece8', background: '#faf9f7' }}
                      >
                        <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: '#ede9e4' }}>
                          {[
                            { key: 'requests', label: 'Requests' },
                            { key: 'helps',    label: 'Helps'    },
                          ].map(tab => (
                            <button
                              key={tab.key}
                              onClick={() => handleTabSwitch(tab.key)}
                              className={`tab-pill ${activityTab === tab.key ? 'active' : 'inactive'}`}
                            >
                              {tab.label}
                              <span className="ml-1.5 text-[9px] font-bold" style={{ opacity: 0.55 }}>
                                {/* ✅ Helps count from live context */}
                                {tab.key === 'requests' ? myRequests.length : myAcceptedRequests.length}
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="relative">
  <select
    value={statusFilter}
    onChange={(e) => handleFilterSwitch(e.target.value)}
    style={{
      appearance: 'none',
      WebkitAppearance: 'none',
      background: '#ede9e4',
      border: 'none',
      borderRadius: 100,
      padding: '5px 28px 5px 12px',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: '#44403c',
      cursor: 'pointer',
      outline: 'none',
    }}
  >
    <option value="active">Active</option>
    <option value="completed">Completed</option>
  </select>
  <svg
    width="10" height="10" viewBox="0 0 10 10" fill="none"
    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
  >
    <path d="M2 3.5l3 3 3-3" stroke="#78716c" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
</div>
                      </div>

                      {/* Sliding content */}
                      <div className="tab-viewport">
                        <div
                          key={slideKey}
                          className={slideDir === 1 ? 'slide-from-right' : 'slide-from-left'}
                        >
                          {displayList.length === 0 ? (
                            <EmptyState title={emptyMsg.title} subtitle={emptyMsg.subtitle} />
                          ) : (
                            <div>
                              {displayList.map((request, idx) => (
                                <div
                                  key={request._id}
                                  className="req-item"
                                  style={{ borderBottom: idx < displayList.length - 1 ? '1px solid #f5f3f0' : 'none' }}
                                >
                                  <RequestCard
                                    request={request}
                                    showActions={activityTab === 'helps' ? request.status === 'accepted' : false}
                                  />
                                  {activityTab === 'requests' &&
                                    request.status === 'completed' &&
                                    !request.rated && (
                                      <RatingRow requestId={request._id} onRate={handleRating} />
                                    )
                                  }
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Footer */}
          <div className="mt-14 anim-4 text-center">
            <div
              style={{
                height: 1,
                background: 'linear-gradient(to right, transparent, #ddd8d2 30%, #ddd8d2 70%, transparent)',
                marginBottom: 20,
              }}
            />
            <span className="text-xs text-stone-400">© 2026 HelpLink</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserDashboard;