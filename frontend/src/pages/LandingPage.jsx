import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRequests } from '../context/RequestContext';
import { getStatsOverview } from '../services/api';
import api from '../services/api';

/* ─── Avatar helpers ──────────────────────── */
const getInitials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

const avatarHue = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 360;
  }
  return h;
};

/* ─── Pulse dot ──────────────────────── */
const LiveDot = () => (
  <span className="relative inline-flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-red-500" />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
  </span>
);

// ── SOS Button ───────────────────────────────────────────────────────────────
const SOSButton = ({ onTrigger, loading, disabled, cooldown, fetchingLocation }) => {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdDuration = 2000;
  const intervalRef  = useRef(null);
  const startTimeRef = useRef(null);
  const triggeredRef = useRef(false);
  const buttonRef    = useRef(null);

  const isDisabled = loading || disabled || cooldown > 0;

  const startHold = useCallback(() => {
    if (isDisabled) return;
    triggeredRef.current = false;
    setHolding(true);
    setProgress(0);
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / holdDuration) * 100, 100);
      setProgress(pct);
      if (pct >= 100 && !triggeredRef.current) {
        triggeredRef.current = true;
        clearInterval(intervalRef.current);
        onTrigger();
      }
    }, 30);
  }, [isDisabled, onTrigger]);

  const cancelHold = useCallback(() => {
    clearInterval(intervalRef.current);
    setHolding(false);
    setProgress(0);
  }, []);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const handleTouchStart = (e) => { e.preventDefault(); startHold(); };
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => el.removeEventListener('touchstart', handleTouchStart);
  }, [startHold]);

  const radius        = 94;
  const circumference = 2 * Math.PI * radius;
  const strokeDash    = ((100 - progress) / 100) * circumference;
  const cooldownPct   = cooldown > 0 ? (cooldown / 60) * 100 : 0;
  const cooldownDash  = ((100 - cooldownPct) / 100) * circumference;
  const holdSeconds   = Math.round((progress / 100) * holdDuration / 1000 * 10) / 10;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 216, height: 216 }}>
        {!holding && !loading && cooldown === 0 && (
          <>
            <div className="absolute inset-0 rounded-full pointer-events-none sos-pulse-ring-1" />
            <div className="absolute inset-0 rounded-full pointer-events-none sos-pulse-ring-2" />
            <div className="absolute inset-0 rounded-full pointer-events-none sos-pulse-ring-3" />
          </>
        )}
        <svg width="216" height="216" className="absolute inset-0 pointer-events-none" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="108" cy="108" r={radius} fill="none" stroke="rgba(220,38,38,0.14)" strokeWidth="6" />
          {cooldown > 0 ? (
            <circle cx="108" cy="108" r={radius} fill="none" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={cooldownDash}
              style={{ transition: 'stroke-dashoffset 1s linear' }} />
          ) : (
            <circle cx="108" cy="108" r={radius} fill="none" stroke="#dc2626" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeDash}
              style={{ transition: holding ? 'none' : 'stroke-dashoffset 0.2s ease' }} />
          )}
        </svg>
        <button
          ref={buttonRef}
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchEnd={cancelHold}
          onTouchCancel={cancelHold}
          disabled={isDisabled}
          aria-label={
            cooldown > 0 ? `SOS on cooldown. Wait ${cooldown}s`
            : loading ? 'Sending SOS...'
            : 'Hold for 2 seconds to send SOS'
          }
          className={[
            'absolute rounded-full border-none flex flex-col items-center justify-center',
            'select-none transition-all duration-150',
            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
            holding ? 'scale-95' : 'scale-100',
          ].join(' ')}
          style={{
            inset: 20,
            background: loading
              ? 'rgba(185,28,28,0.92)'
              : cooldown > 0 ? 'rgba(120,113,108,0.55)'
              : holding ? '#b91c1c' : '#dc2626',
            boxShadow: holding
              ? '0 0 0 12px rgba(220,38,38,0.15), 0 20px 60px rgba(220,38,38,0.55)'
              : cooldown > 0 ? '0 0 0 4px rgba(120,113,108,0.1), 0 6px 24px rgba(0,0,0,0.12)'
              : '0 0 0 6px rgba(220,38,38,0.1), 0 16px 50px rgba(220,38,38,0.45)',
          }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="sos-spin">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
              <span className="text-white font-bold tracking-widest uppercase text-[0.62rem]">
                {fetchingLocation ? 'Locating…' : 'Sending…'}
              </span>
            </div>
          ) : cooldown > 0 ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-white font-black leading-none text-[2.4rem]">{cooldown}s</span>
              <span className="text-white/80 font-semibold tracking-widest uppercase text-[0.52rem]">cooldown</span>
            </div>
          ) : holding ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-white font-black leading-none text-[2.4rem]">{holdSeconds}s</span>
              <span className="text-white/80 font-semibold tracking-widest uppercase text-[0.52rem]">hold…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-white font-black tracking-[0.14em] uppercase leading-none" style={{ fontSize: '2.4rem' }}>SOS</span>
            </div>
          )}
        </button>
      </div>
      <div className="text-center h-6">
        {cooldown > 0 ? (
          <span className="text-[0.78rem] text-amber-700 font-semibold">Next SOS in {cooldown}s</span>
        ) : holding ? (
          <span className="text-[0.78rem] text-red-600 font-bold sos-pulse-text">Keep holding…</span>
        ) : loading ? (
          <span className="text-[0.78rem] text-red-500 font-semibold">
            {fetchingLocation ? 'Getting your location…' : 'Dispatching responders…'}
          </span>
        ) : (
          <span className="text-[0.78rem] text-stone-400 tracking-wide">Hold for 2 seconds to send SOS</span>
        )}
      </div>
    </div>
  );
};

// ── Image Attach ──────────────────────────────────────────────────────────────
const ImageAttach = ({ sosImage, setSosImage }) => {
  const fileRef = useRef();
  const [showTip, setShowTip] = useState(false);
  const preview = sosImage ? URL.createObjectURL(sosImage) : null;

  return (
    <div className="flex flex-col items-center gap-2 sos-attach-up">
      {!sosImage ? (
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[0.72rem] font-semibold uppercase tracking-[0.08em] transition-all duration-150 hover:bg-red-50 border border-dashed border-red-200 text-stone-400 bg-white/85 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Attach photo
            <span className="text-[0.62rem] font-normal normal-case tracking-normal text-stone-300 ml-0.5">(optional)</span>
            <span
              role="button" tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setShowTip(v => !v); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setShowTip(v => !v); } }}
              aria-label="Why attach a photo?"
              className="ml-0.5 flex items-center justify-center rounded-full transition-colors"
              style={{
                width: 15, height: 15,
                background: showTip ? 'rgba(220,38,38,0.15)' : 'rgba(0,0,0,0.08)',
                color: showTip ? '#dc2626' : '#78716c',
                fontSize: '0.55rem', fontWeight: 800, flexShrink: 0,
              }}
            >?</span>
          </button>
          {showTip && (
            <div className="rounded-2xl px-4 py-3 text-left max-w-xs sos-attach-up"
              style={{
                background: 'rgba(255,255,255,0.95)',
                border: '1.5px solid rgba(220,38,38,0.13)',
                boxShadow: '0 4px 20px rgba(220,38,38,0.07)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-red-500 m-0 mb-2">Why attach a photo?</p>
              <ul className="m-0 p-0 flex flex-col gap-1.5" style={{ listStyle: 'none' }}>
                {[
                  { icon: '📍', text: 'Helps responders identify your exact location or surroundings faster.' },
                  { icon: '🩹', text: 'Shows the severity of injury so responders arrive prepared with the right aid.' },
                  { icon: '⚡', text: 'Reduces back-and-forth — responders act immediately without needing to ask questions.' },
                  { icon: '🚗', text: 'Captures scene details (accident, hazard) that words alone may miss.' },
                ].map(({ icon, text }, i) => (
                  <li key={i} className="flex items-start gap-2 text-[0.74rem] text-stone-600 leading-snug">
                    <span className="flex-shrink-0 text-[0.85rem]">{icon}</span>
                    {text}
                  </li>
                ))}
              </ul>
              <p className="m-0 mt-2.5 text-[0.65rem] text-stone-400 italic">Optional — but a photo can make the difference in critical moments.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/90 border border-red-100">
            <img src={preview} alt="SOS attachment" className="rounded-full object-cover flex-shrink-0 w-[30px] h-[30px]" />
            <span className="text-[0.72rem] text-stone-500 font-medium max-w-[120px] truncate">{sosImage.name}</span>
            <button type="button" onClick={() => setSosImage(null)}
              className="text-stone-300 hover:text-red-400 transition-colors ml-1 bg-transparent border-0 p-0 cursor-pointer"
              aria-label="Remove image">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <p className="text-[0.65rem] text-green-600 font-medium m-0">✓ Photo attached — responders will have a clearer picture of your situation</p>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setSosImage(e.target.files[0] || null)} />
    </div>
  );
};

// ── Stats Pill ────────────────────────────────────────────────────────────────
// ✅ EXTENDED — accepts isLocationScoped so label reads "nearby" vs generic
const StatsPill = ({ stats }) => {
  if (!stats) return null;

  const hasResponders = stats.totalActive > 0;

  // ✅ Use "nearby" wording only when the backend confirmed a location-scoped result
  const nearbyLabel = stats.isLocationScoped
    ? 'responders active nearby'
    : 'responders active';

  if (hasResponders) {
    return (
      <div
        className="inline-flex items-center gap-2.5 rounded-full px-3 py-2"
        style={{
          border: '1.5px solid rgba(134,239,172,0.6)',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          boxShadow: '0 2px 12px rgba(34,197,94,0.10)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {/* Avatar stack */}
        <div className="flex items-center flex-shrink-0">
          {stats.activeUsers?.map((u, index) => {
            const hue = avatarHue(u.name);
            return (
              <div
                key={index}
                title={u.name}
                className="flex items-center justify-center flex-shrink-0 rounded-full font-bold"
                style={{
                  width: 24, height: 24,
                  marginLeft: index === 0 ? 0 : -6,
                  zIndex: (stats.activeUsers?.length ?? 0) - index,
                  background: `hsl(${hue} 55% 92%)`,
                  color: `hsl(${hue} 60% 32%)`,
                  border: `2px solid hsl(${hue} 45% 82%)`,
                  fontSize: '9px',
                }}
              >
                {getInitials(u.name)}
              </div>
            );
          })}
          {stats.totalActive > (stats.activeUsers?.length ?? 0) && (
            <div
              className="rounded-full flex items-center justify-center flex-shrink-0 font-bold"
              style={{
                width: 24, height: 24,
                marginLeft: -6,
                border: '2px solid #dcfce7',
                background: '#4ade80',
                color: '#14532d',
                fontSize: '9px',
              }}
            >
              +{stats.totalActive - (stats.activeUsers?.length ?? 0)}
            </div>
          )}
        </div>

        {/* Label — ✅ now context-aware */}
        <p className="m-0 text-[0.76rem] font-medium whitespace-nowrap leading-none" style={{ color: '#15803d' }}>
          <span className="font-bold text-green-900">{stats.totalActive}</span>
          {' '}{nearbyLabel}
        </p>

        {/* Live indicator */}
        <span className="flex-shrink-0 flex items-center gap-1 pl-1 border-l border-green-200">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
          </span>
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-green-600">Live</span>
        </span>
      </div>
    );
  }

  // ── No responders state ────────────────────────────────────────────────────
  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full px-4 py-2.5"
      style={{
        border: '1.5px solid rgba(214,211,209,0.8)',
        background: 'rgba(255,255,255,0.92)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Icon */}
      <span
        className="flex items-center justify-center flex-shrink-0 rounded-full"
        style={{ width: 22, height: 22, background: 'rgba(120,113,108,0.08)' }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </span>

      {/* Text — ✅ also context-aware */}
      <p className="m-0 text-[0.76rem] font-medium leading-none whitespace-nowrap" style={{ color: '#78716c' }}>
        {stats.isLocationScoped ? 'No responders nearby' : 'No active responders'}
        <span className="ml-1.5 font-normal" style={{ color: '#a8a29e' }}>
          — alert still reaches the network
        </span>
      </p>
    </div>
  );
};

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'Who responds when I send an SOS?',
    a: 'Verified HelpLink members within a 5 km radius are instantly notified. These are real people in your community — trained volunteers, off-duty medics, and registered first-aiders — who have opted in to receive emergency alerts near them.',
  },
  {
    q: 'Is my location shared with anyone else?',
    a: 'Your location is shared only with the responder who accepts your request, and only for the duration of the emergency. It is never stored on our servers, sold, or used for any other purpose. Once the request is resolved, the data is purged.',
  },
  {
    q: 'Should I use this instead of calling 112?',
    a: 'No — for life-threatening emergencies always call 112 first. HelpLink is designed to get you community help faster while official services are on their way. Think of it as a powerful complement, not a replacement.',
  },
];

const FAQ = () => {
  const [open, setOpen] = useState(null);
  return (
    <section className="max-w-xl mx-auto px-6 py-16 text-center">
      <div className="flex items-center gap-4 mb-10">
        <span className="uppercase text-[0.65rem] tracking-[0.2em] font-bold text-stone-400 flex-shrink-0">FAQ</span>
        <div className="flex-1 h-px bg-black/[0.09]" />
        <span className="uppercase text-[0.65rem] tracking-[0.2em] font-semibold text-stone-300 flex-shrink-0">Quick answers</span>
      </div>
      <div className="flex flex-col gap-3 text-left">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                border: isOpen ? '1.5px solid rgba(220,38,38,0.2)' : '1.5px solid rgba(0,0,0,0.08)',
                background: isOpen ? 'linear-gradient(135deg,#fff5f5 0%,#fff 100%)' : 'rgba(255,255,255,0.85)',
                boxShadow: isOpen ? '0 4px 20px rgba(220,38,38,0.06)' : '0 1px 4px rgba(0,0,0,0.03)',
              }}>
              <button onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left bg-transparent border-0 cursor-pointer">
                <span className="font-semibold text-[0.95rem] leading-snug" style={{ color: isOpen ? '#dc2626' : '#1a1714' }}>
                  {item.q}
                </span>
                <span className="flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-300"
                  style={{
                    width: 28, height: 28,
                    background: isOpen ? 'rgba(220,38,38,0.1)' : 'rgba(0,0,0,0.05)',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <line x1="6" y1="1" x2="6" y2="11" stroke={isOpen ? '#dc2626' : '#78716c'} strokeWidth="1.8" strokeLinecap="round"/>
                    <line x1="1" y1="6" x2="11" y2="6" stroke={isOpen ? '#dc2626' : '#78716c'} strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </span>
              </button>
              <div style={{ maxHeight: isOpen ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
                <p className="text-sm leading-relaxed text-stone-500 px-6 pb-5 m-0">{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const LandingPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { createRequest } = useRequests();

  const [sosLoading,       setSosLoading]       = useState(false);
  const [sosSuccess,       setSosSuccess]       = useState(false);
  const [sosError,         setSosError]         = useState(null);
  const [sosCategory,      setSosCategory]      = useState('critical');
  const [sosImage,         setSosImage]         = useState(null);
  const [cooldown,         setCooldown]         = useState(0);
  const [stats,            setStats]            = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const cooldownTimerRef = useRef(null);

  useEffect(() => () => clearInterval(cooldownTimerRef.current), []);

  useEffect(() => {
    localStorage.removeItem('activeRequestId');
    setSosSuccess(false);
    setSosError(null);
  }, [user?._id]);

  useEffect(() => {
    const activeRequestId = localStorage.getItem('activeRequestId');
    if (!activeRequestId) return;

    const check = async () => {
      try {
        const res = await api.get(`/requests/${activeRequestId}`);
        const status = res.data?.status;
        if (status === 'open' || status === 'accepted') {
          if (user) {
            navigate(`/my-tracking/${activeRequestId}`, { replace: true });
          } else {
            navigate(`/tracking/${activeRequestId}`, { replace: true });
          }
        } else {
          localStorage.removeItem('activeRequestId');
        }
      } catch {
        localStorage.removeItem('activeRequestId');
      }
    };

    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ✅ UPDATED fetchStats — sends user GPS coords so backend scopes to 5 km ──
  // Strategy:
  //   1. Try to get GPS position (silent — no UI prompt, timeout 6 s).
  //   2. If granted, pass ?lat=&lng= to the stats endpoint.
  //   3. If denied or unavailable, call stats without coords → global fallback.
  // This runs once on mount and does NOT block the page render.
  // The SOS button has its own separate location flow — this is independent.
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Attempt a silent location read with a short timeout
        let lat = null;
        let lng = null;

        if (navigator.geolocation) {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false, // low-accuracy is fine for stats
                timeout: 6000,
                maximumAge: 60000,        // accept a 1-min cached position
              });
            });
            lat = position.coords.latitude;
            lng = position.coords.longitude;
          } catch {
            // Location denied or timed out — proceed without coords
          }
        }

        // Build query params — only attach coords when we actually got them
        const params = (lat !== null && lng !== null) ? { lat, lng } : {};
        const res = await getStatsOverview(params);
        setStats(res.data);
      } catch (err) {
        console.error('Stats fetch failed:', err);
      }
    };

    fetchStats();
  }, []);
  // ── END: updated fetchStats ────────────────────────────────────────────────

  const startCooldownTimer = useCallback((seconds) => {
    setCooldown(seconds);
    clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownTimerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleSOSTrigger = useCallback(async () => {
    if (sosLoading || fetchingLocation) return;

    setSosError(null);
    setFetchingLocation(true);

    let lat, lng;
    let locationFailed = false;

    try {
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
        });
      });
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    } catch {
      locationFailed = true;
      lat = 0;
      lng = 0;
    }

    setFetchingLocation(false);

    const guestId = crypto.randomUUID ? crypto.randomUUID() : `guest_${Date.now()}`;
    localStorage.setItem('guestId', guestId);

    const formData = new FormData();
    formData.append('title',       'Emergency SOS');
    formData.append('description', 'Auto-generated SOS request');
    formData.append('category',    sosCategory);
    formData.append('urgency',     'high');
    formData.append('isSOS',       'true');
    formData.append('location',    JSON.stringify({ lat, lng }));
    formData.append('guestId',     guestId);

    if (locationFailed) {
      formData.append('locationStatus', 'unavailable');
      setSosError('📍 Location unavailable — SOS sent without coordinates. If possible, share your location manually.');
    }

    if (sosImage) formData.append('images', sosImage);

    if (!navigator.onLine) {
      localStorage.setItem('pendingSOS', JSON.stringify({
        category: sosCategory, lat, lng,
        locationStatus: locationFailed ? 'unavailable' : 'available',
        guestId, timestamp: Date.now(),
      }));
      setSosError('📶 You appear to be offline. SOS saved — it will be sent when you reconnect.');
      return;
    }

    setSosLoading(true);
    const result = await createRequest(formData);
    setSosLoading(false);

    if (!result.success) {
      const msg = result.error || '';
      const cooldownMatch = msg.match(/Please wait (\d+)s/);
      if (cooldownMatch) {
        startCooldownTimer(parseInt(cooldownMatch[1], 10));
        setSosError(msg);
      } else {
        setSosError(msg || 'SOS failed. Please try again.');
      }
      return;
    }

    const requestId = result.requestId;
    setSosSuccess(true);

    if (requestId) {
      const guidance = result.guidance || [];
      if (user) {
        navigate(`/my-tracking/${requestId}`, { state: { guidance } });
      } else {
        navigate(`/tracking/${requestId}`, { state: { guidance } });
      }
    } else {
      console.error('No requestId returned from SOS');
    }
  }, [createRequest, sosCategory, sosImage, navigate, startCooldownTimer, sosLoading, fetchingLocation, user]);

  const CATEGORIES = [
    { key: 'critical', label: 'Critical', emoji: '🚨' },
    { key: 'medical',  label: 'Medical',  emoji: '🏥' },
    { key: 'accident', label: 'Accident', emoji: '🚗' },
  ];

  const eyebrowLabel = isAuthenticated && user?.name ? user.name : 'Guest Mode';
  const eyebrowSub   = isAuthenticated && user?.name ? 'Signed in' : 'No account needed';

  return (
    <div className="min-h-screen relative bg-white text-[#1a1714]"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sosPulseRing { 0%{transform:scale(1);opacity:0.5} 70%{transform:scale(1.45);opacity:0} 100%{transform:scale(1.45);opacity:0} }
        @keyframes sosSpin { to{transform:rotate(360deg)} }
        @keyframes sosPulseText { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes attachFadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes panelIn { from{opacity:0;transform:translateY(20px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes eyebrowIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .fade-up    { animation: fadeUp 0.4s ease both; }
        .fade-up-2  { animation: fadeUp 0.4s 0.16s ease both; }
        .panel-in   { animation: panelIn 0.5s 0.05s cubic-bezier(0.22,1,0.36,1) both; }
        .eyebrow-in { animation: eyebrowIn 0.4s ease both; }
        .sos-pulse-ring-1 { background:rgba(220,38,38,0.22); animation:sosPulseRing 2.2s ease-out infinite; }
        .sos-pulse-ring-2 { background:rgba(220,38,38,0.12); animation:sosPulseRing 2.2s ease-out 0.75s infinite; }
        .sos-pulse-ring-3 { background:rgba(220,38,38,0.06); animation:sosPulseRing 2.2s ease-out 1.4s infinite; }
        .sos-spin       { animation:sosSpin 0.85s linear infinite; }
        .sos-pulse-text { animation:sosPulseText 0.6s ease infinite; }
        .sos-attach-up  { animation:attachFadeUp 0.25s ease both; }
        .secondary-fade { opacity:0.45; transition:opacity 0.2s ease; }
        .secondary-fade:hover, .secondary-fade:focus-within { opacity:0.85; }
      `}</style>

      <section className="relative flex flex-col items-center justify-center min-h-screen pt-16 pb-10">
        <div className="panel-in relative w-full flex flex-col items-center z-10 max-w-lg px-4">

          {/* Eyebrow */}
          <div className="eyebrow-in flex items-center justify-center gap-2 mb-5">
            <LiveDot />
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-red-600">{eyebrowLabel}</span>
            <span className="text-stone-300 text-[0.68rem]">•</span>
            <span className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-stone-400">{eyebrowSub}</span>
          </div>

          {/* Category pills */}
          <div className="flex flex-row flex-nowrap gap-2 justify-center mb-7">
            {CATEGORIES.map(({ key, label, emoji }) => {
              const active = sosCategory === key;
              return (
                <button key={key} onClick={() => setSosCategory(key)}
                  className={[
                    'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full',
                    'text-sm font-semibold leading-none whitespace-nowrap',
                    'border transition-all duration-150 cursor-pointer select-none',
                    active
                      ? 'bg-red-600 text-white border-red-600 scale-105'
                      : 'bg-white/90 text-stone-500 border-black/10 hover:border-red-200 hover:bg-white',
                  ].join(' ')}
                  style={active
                    ? { boxShadow: '0 2px 14px rgba(220,38,38,0.32)' }
                    : { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
                  }
                >
                  <span className="text-[0.9rem]">{emoji}</span>
                  {label}
                </button>
              );
            })}
          </div>

          {/* SOS Button */}
          <SOSButton
            onTrigger={handleSOSTrigger}
            loading={sosLoading || fetchingLocation}
            disabled={sosSuccess}
            cooldown={cooldown}
            fetchingLocation={fetchingLocation}
          />

          {/* Success banner */}
          {sosSuccess && (
            <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold text-green-800 justify-center mt-5 border border-green-200/60"
              style={{
                background: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                boxShadow: '0 4px 20px rgba(34,197,94,0.08)',
                animation: 'fadeUp 0.3s ease',
              }}
            >
              <span className="text-lg">✅</span>
              <div>
                <div>Help is on the way!</div>
                <div className="text-[0.7rem] font-normal text-green-700 mt-0.5">Responders in your area have been notified. Stay on the line.</div>
              </div>
            </div>
          )}

          {/* Error banner */}
          {sosError && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-[0.8rem] mt-5 w-full"
              style={{
                background: 'rgba(255,255,255,0.88)',
                border: `1.5px solid ${cooldown > 0 ? 'rgba(245,158,11,0.35)' : 'rgba(220,38,38,0.25)'}`,
                color: cooldown > 0 ? '#92400e' : '#b91c1c',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                animation: 'fadeUp 0.2s ease',
              }}
            >
              <span className="text-base flex-shrink-0 mt-px">{cooldown > 0 ? '⏱' : '⚠️'}</span>
              <div>
                <div className="font-semibold">{sosError}</div>
                {cooldown === 0 && (
                  <div className="mt-0.5 text-[0.7rem] opacity-75">If this is life-threatening, call <strong>112</strong> immediately.</div>
                )}
              </div>
            </div>
          )}

          {/* Photo attach */}
          <div className="mt-4 secondary-fade">
            <ImageAttach sosImage={sosImage} setSosImage={setSosImage} />
          </div>

          {/* Stats pill */}
          <div className="fade-up-2 flex justify-center mt-5 secondary-fade">
            <StatsPill stats={stats} />
          </div>

        </div>
      </section>

      <div className="max-w-xl mx-auto px-6"><div className="h-px bg-black/[0.06]" /></div>
      <FAQ />
      <footer className="border-t border-black/[0.06] bg-white/90">
        <div className="px-6 py-6 flex items-center justify-center">
          <span className="text-xs text-stone-400">© 2026 HelpLink</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;