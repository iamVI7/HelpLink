import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import VerifyOTPModal from './VerifyOTPModal';

/* ── helpers ── */
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const avatarHue = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
};

/* ── Live pulse dot ── */
const LiveDot = ({ color = '#ef4444' }) => (
  <span className="relative inline-flex h-2 w-2 shrink-0">
    <span
      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
      style={{ backgroundColor: color }}
    />
    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }} />
  </span>
);

/* ── Star rating ── */
const StarIcon = ({ filled }) => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
    <path
      d="M7 1.2L8.35 4.95L12.3 5.37L9.4 8.07L10.27 12L7 10.07L3.73 12L4.6 8.07L1.7 5.37L5.65 4.95Z"
      fill={filled ? '#f59e0b' : 'none'}
      stroke={filled ? '#f59e0b' : '#d4c89a'}
      strokeWidth="0.8"
    />
  </svg>
);

const UserRating = ({ rating = 0, totalRatings = 0 }) => {
  const score  = parseFloat(rating) || 0;
  const filled = Math.round(score);
  const pct    = Math.min((score / 5) * 100, 100).toFixed(0);
  return (
    <div className="px-4 py-3 border-b border-stone-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Your rating</span>
        <span className="text-xs text-stone-400">{totalRatings} {totalRatings === 1 ? 'review' : 'reviews'}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="serif text-lg font-semibold leading-none text-stone-900">
          {score.toFixed(1)}
        </span>
        <div>
          <div className="flex items-center gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map((s) => <StarIcon key={s} filled={s <= filled} />)}
          </div>
          <div className="w-24 h-0.5 rounded-full bg-stone-100">
            <div className="h-0.5 rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Sign-out confirm modal ── */
const SignOutModal = ({ onConfirm, onCancel }) => (
  <>
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]" onClick={onCancel} />
    <div
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70]
                 w-[calc(100%-1.5rem)] max-w-sm
                 bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      <div className="px-7 py-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500 mb-3">
          Confirm Action
        </p>
        <p className="serif text-[1.45rem] leading-tight text-stone-900 mb-2">
          Sign out of HelpLink?
        </p>
        <p className="text-sm text-stone-400 leading-relaxed mb-6">
          You'll be returned to the home page. Any unsaved changes will be lost.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-xs font-semibold tracking-wide text-stone-500
                       border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-xs font-bold tracking-widest uppercase
                       bg-red-600 text-white rounded-full
                       hover:bg-red-500 transition-all duration-150
                       hover:-translate-y-px hover:shadow-md hover:shadow-red-600/25 active:translate-y-0"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  </>
);

/* ── Unverified shield icon ── */
const UnverifiedShieldIcon = ({ size = 14 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

/* ── Navbar ── */
const Navbar = () => {
  const { user, logout, updateAvailability, isAuthenticated } = useAuth();
  const { isConnected } = useSocket();
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleLogoClick = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signOutModal, setSignOutModal] = useState(false);
  const [verifyModal,  setVerifyModal]  = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    setSignOutModal(false);
    setDropdownOpen(false);
    logout();
    navigate('/');
  };

  const handleAvailabilityToggle = async () => {
    if (user) await updateAvailability(!user?.isAvailable);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = signOutModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [signOutModal]);

  const hue          = user ? avatarHue(user.name) : 200;
  const avatarBg     = `hsl(${hue} 55% 92%)`;
  const avatarFg     = `hsl(${hue} 60% 32%)`;
  const avatarBorder = `hsl(${hue} 45% 78%)`;

  const navLinks =
    user?.role === 'admin'
      ? [{ to: '/dashboard', label: 'Dashboard' }]
      : [
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/map',       label: 'Map'        },
        ];

  const isProfileActive = ['/profile', '/my-requests', '/my-help', '/emergency-profile']
    .includes(location.pathname);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes borderPulse {
          0%, 100% { border-color: rgba(220,38,38,0.35); }
          50%       { border-color: rgba(220,38,38,0.75); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .drop-in      { animation: dropIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .border-pulse { animation: borderPulse 2s ease-in-out infinite; }
        .serif        { font-family: 'DM Serif Display', Georgia, serif; }
        .verify-btn-shimmer {
          background: linear-gradient(105deg, #fef3c7 0%, #fde68a 30%, #fef9e7 50%, #fde68a 70%, #fef3c7 100%);
          background-size: 200% auto;
          animation: shimmer 2.8s linear infinite;
        }

        /* ── Availability pill toggle ── */
        .avail-track {
          position: relative;
          display: inline-flex;
          align-items: center;
          width: 2.5rem;
          height: 1.375rem;
          border-radius: 9999px;
          transition: background 0.2s ease, border-color 0.2s ease;
          flex-shrink: 0;
          cursor: pointer;
        }
        .avail-track.on  { background: #dcfce7; border: 1.5px solid #86efac; }
        .avail-track.off { background: #f5f5f4; border: 1.5px solid #d6d3d1; }
        .avail-thumb {
          position: absolute;
          width: 1rem;
          height: 1rem;
          border-radius: 9999px;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
          top: 50%;
          transform: translateY(-50%) translateX(2px);
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
        .avail-track.on  .avail-thumb { background: #22c55e; transform: translateY(-50%) translateX(1.125rem); }
        .avail-track.off .avail-thumb { background: #a8a29e; transform: translateY(-50%) translateX(2px); }
      `}</style>

      <nav
        className={`
          fixed top-4 left-1/2 -translate-x-1/2 z-50
          w-[calc(100%-2rem)] max-w-4xl
          bg-white/90 backdrop-blur-md border border-stone-200/80 rounded-2xl
          px-4 flex items-center justify-between gap-3
          transition-all duration-200
          ${scrolled ? 'shadow-lg shadow-stone-900/8 border-stone-300/60' : 'shadow-sm shadow-stone-900/4'}
        `}
        style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", height: '3.25rem' }}
      >
        {/* ── Logo ── */}
        <div
          onClick={handleLogoClick}
          className="flex items-center gap-2 shrink-0 group cursor-pointer"
        >
          <img src="/HelpLink_logo.png" alt="HelpLink" className="w-5 h-5 object-contain" />
          <span className="serif text-sm font-medium tracking-wide text-stone-800 group-hover:text-red-600 transition-colors duration-150">
            HelpLink
          </span>
        </div>

        {/* ── Authenticated ── */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">

            {/* Connection status */}
            <div className="flex items-center">
              <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-stone-200 bg-stone-50">
                <LiveDot color={isConnected ? '#22c55e' : '#ef4444'} />
                <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  {isConnected ? 'Live' : 'Off'}
                </span>
              </div>
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-stone-200 bg-stone-50">
                <LiveDot color={isConnected ? '#22c55e' : '#ef4444'} />
                <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
                  {isConnected ? 'Live' : 'Off'}
                </span>
              </div>
            </div>

            {/* Availability toggle */}
            <button
              onClick={handleAvailabilityToggle}
              className={`
                hidden sm:inline-flex items-center gap-1.5
                px-2.5 py-1 text-xs font-bold tracking-widest uppercase rounded-full border transition-all duration-150
                ${user.isAvailable
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300'
                  : 'border-stone-200 bg-stone-50 text-stone-500 hover:bg-stone-100'}
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full transition-colors ${user.isAvailable ? 'bg-green-500' : 'bg-stone-400'}`} />
              {user.isAvailable ? 'Available' : 'Away'}
            </button>

            {/* Verify button */}
            {user.role !== 'admin' && !user.isVerified && (
              <button
                onClick={() => setVerifyModal(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold tracking-widest uppercase
                           rounded-full border border-amber-300 text-amber-800
                           hover:border-amber-400 hover:shadow-sm hover:shadow-amber-200
                           transition-all duration-200 hover:-translate-y-px active:translate-y-0
                           verify-btn-shimmer"
              >
                <UnverifiedShieldIcon size={13} />
                Verify
              </button>
            )}

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`
                      px-3 py-1.5 text-xs font-semibold tracking-wide rounded-xl transition-all duration-150
                      ${isActive
                        ? 'text-red-600 bg-red-50'
                        : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'}
                    `}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <div className="hidden md:block w-px h-5 bg-stone-200" />

            {/* ── Avatar + dropdown ── */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                aria-label="User menu"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-150"
              >
                <div className="relative">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2"
                    style={{ background: avatarBg, color: avatarFg, borderColor: avatarBorder }}
                  >
                    {initials(user.name)}
                  </div>
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white"
                    style={{ background: user.isAvailable ? '#22c55e' : '#a8a29e' }}
                  />
                </div>
                <div className="hidden md:flex flex-col items-start leading-none gap-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-stone-800 leading-none">
                      {user.name.split(' ')[0]}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold uppercase tracking-widest leading-none ${user.role === 'admin' ? 'text-amber-600' : 'text-stone-400'}`}
                    style={{ fontSize: '0.6rem' }}
                  >
                    {user.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </div>
                <svg
                  className={`hidden md:block w-3 h-3 text-stone-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* ── Dropdown panel ── */}
              {dropdownOpen && (
                <div className="drop-in absolute right-0 top-[calc(100%+12px)] w-64 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 overflow-hidden">

                  {/* ── User header — clickable → /profile (non-admin only) ── */}
                  {user.role !== 'admin' ? (
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className={`block px-4 pt-4 pb-3.5 border-b border-stone-100 transition-colors duration-150 group ${
                        isProfileActive ? 'bg-red-50/60' : 'hover:bg-stone-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2"
                            style={{ background: avatarBg, color: avatarFg, borderColor: avatarBorder }}
                          >
                            {initials(user.name)}
                          </div>
                          <span
                            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                            style={{ background: user.isAvailable ? '#22c55e' : '#a8a29e' }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`serif text-sm font-semibold truncate leading-tight block min-w-0 transition-colors ${
                              isProfileActive ? 'text-red-600' : 'text-stone-900 group-hover:text-red-600'
                            }`}>
                              {user.name}
                            </span>
                            {user.isVerified && (
                              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" className="shrink-0 flex-none overflow-visible">
                                <circle cx="10" cy="10" r="9.5" fill="#22c55e" />
                                <path d="M5.5 10.3L8.6 13.3L14.5 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <div className="text-xs text-stone-400 truncate mt-0.5">{user.email}</div>
                        </div>
                        <svg
                          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                            isProfileActive ? 'text-red-400' : 'text-stone-300 group-hover:text-red-400'
                          }`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border text-stone-500 bg-stone-50 border-stone-200">
                          Member
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          user.isAvailable
                            ? 'text-green-700 bg-green-50 border-green-200'
                            : 'text-stone-500 bg-stone-50 border-stone-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isAvailable ? 'bg-green-500' : 'bg-stone-400'}`} />
                          {user.isAvailable ? 'Available' : 'Away'}
                        </span>
                      </div>
                    </Link>
                  ) : (
                    /* Admin header — not clickable */
                    <div className="px-4 pt-4 pb-3.5 border-b border-stone-100">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2"
                            style={{ background: avatarBg, color: avatarFg, borderColor: avatarBorder }}
                          >
                            {initials(user.name)}
                          </div>
                          <span
                            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                            style={{ background: user.isAvailable ? '#22c55e' : '#a8a29e' }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="serif text-sm font-semibold text-stone-900 truncate leading-tight block min-w-0">
                            {user.name}
                          </span>
                          <div className="text-xs text-stone-400 truncate mt-0.5">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border text-amber-700 bg-amber-50 border-amber-200">
                          ★ Admin
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rating — user only */}
                  {user.role !== 'admin' && (
                    <UserRating rating={user.rating} totalRatings={user.totalRatings} />
                  )}

                  {/* Mobile nav links */}
                  <div className="md:hidden border-b border-stone-100 py-1.5 px-2">
                    {navLinks.map((link) => {
                      const isActive = location.pathname === link.to;
                      return (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={() => setDropdownOpen(false)}
                          className={`
                            block px-3 py-2 text-xs font-semibold tracking-wide rounded-xl transition-colors
                            ${isActive
                              ? 'text-red-600 bg-red-50'
                              : 'text-stone-600 hover:bg-stone-50'}
                          `}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>

                  {/* Mobile availability toggle */}
                  <div className="sm:hidden border-b border-stone-100 px-4 py-3.5">
                    <button
                      onClick={() => { handleAvailabilityToggle(); setTimeout(() => setDropdownOpen(false), 320); }}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-xs font-semibold text-stone-700">Availability</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${user.isAvailable ? 'text-green-600' : 'text-stone-400'}`}>
                          {user.isAvailable ? "You're available" : "You're away"}
                        </span>
                      </div>
                      <div className={`avail-track ${user.isAvailable ? 'on' : 'off'}`}>
                        <div className="avail-thumb" />
                      </div>
                    </button>
                  </div>

                  {/* Mobile verify — only when not yet verified */}
                  {user.role !== 'admin' && !user.isVerified && (
                    <div className="border-b border-stone-100 px-3 py-3">
                      <button
                        onClick={() => { setDropdownOpen(false); setVerifyModal(true); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-amber-800 rounded-full border border-amber-300 verify-btn-shimmer hover:border-amber-400 hover:shadow-sm transition-all duration-200"
                      >
                        <UnverifiedShieldIcon size={14} />
                        Verify Yourself
                      </button>
                    </div>
                  )}

                  {/* Sign out */}
                  <div className="px-3 py-3">
                    <button
                      onClick={() => { setDropdownOpen(false); setSignOutModal(true); }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-600 rounded-full border border-red-100 bg-red-50 hover:bg-red-100 hover:border-red-200 transition-all duration-150"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Unauthenticated ── */
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors tracking-wide px-3 py-1.5 rounded-full hover:bg-stone-50"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="border-pulse px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold tracking-widest uppercase rounded-full transition-all duration-150 hover:-translate-y-px hover:shadow-md hover:shadow-red-600/25 active:translate-y-0"
            >
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {signOutModal && (
        <SignOutModal onConfirm={handleLogout} onCancel={() => setSignOutModal(false)} />
      )}

      {verifyModal && (
        <VerifyOTPModal onClose={() => setVerifyModal(false)} />
      )}
    </>
  );
};

export default Navbar;