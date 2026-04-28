/**
 * ProfileHeader.jsx
 *
 * PHASE 3 — Component Modularization
 *
 * Displays:
 *   - User avatar (initials-based, colour-derived from name — matches Navbar style)
 *   - Name, email, phone
 *   - Role badge
 *   - Member since date
 *   - Verification badge if isVerified
 *
 * Props:
 *   user {Object} — from /api/profile/me  (no password)
 *
 * ✅ Receives props only — fetches nothing
 * ✅ Reusable and self-contained
 */

import React from 'react';

// ── Avatar helpers (mirrors Navbar.jsx) ───────────────────────────────────────
const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const avatarHue = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
};

// ── Verified badge ────────────────────────────────────────────────────────────
const VerifiedBadge = () => (
  <span
    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
    style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}
  >
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="4.25" stroke="#16a34a" strokeWidth="0.75" />
      <path d="M3 5l1.4 1.4L7 3.5" stroke="#16a34a" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    Verified
  </span>
);

// ── Role badge ────────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const isAdmin = role === 'admin';
  return (
    <span
      className="inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
      style={{
        background: isAdmin ? 'rgba(220,38,38,0.08)' : 'rgba(0,0,0,0.05)',
        color: isAdmin ? '#dc2626' : '#78716c',
        border: isAdmin ? '1px solid rgba(220,38,38,0.2)' : '1px solid rgba(0,0,0,0.1)',
      }}
    >
      {role}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProfileHeader
// ─────────────────────────────────────────────────────────────────────────────
const ProfileHeader = ({ user }) => {
  if (!user) return null;

  // Derive the same palette the Navbar uses
  const hue          = avatarHue(user.name);
  const avatarBg     = `hsl(${hue} 55% 92%)`;
  const avatarFg     = `hsl(${hue} 60% 32%)`;
  const avatarBorder = `hsl(${hue} 45% 78%)`;

  return (
    <section
      className="border-b border-stone-100 relative overflow-hidden fade-up"
      style={{ background: 'rgba(255,255,255,0.88)' }}
    >
      {/* Decorative radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -80, right: -80, width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(220,38,38,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-14">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">

          {/* Avatar — initials-based, matches Navbar palette */}
          <div
            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl flex-shrink-0 flex items-center justify-center"
            style={{
              background: avatarBg,
              border: `2px solid ${avatarBorder}`,
            }}
          >
            <span
              className="font-bold select-none leading-none"
              style={{
                color: avatarFg,
                fontSize: '2rem',
                fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
              }}
            >
              {initials(user.name)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Name + badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1
                className="text-2xl md:text-3xl font-bold leading-tight text-stone-900 mr-1"
                style={{ fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: '-0.01em' }}
              >
                {user.name}
              </h1>
              <RoleBadge role={user.role} />
              {user.isVerified && <VerifiedBadge />}
            </div>

            {/* Email */}
            <p className="text-sm text-stone-500 mb-1 truncate">{user.email}</p>

            {/* Phone */}
            {user.phoneNumber && (
              <p className="text-xs text-stone-400 mb-3">📞 {user.phoneNumber}</p>
            )}

            {/* Address */}
            {user.address && (
              <p className="text-xs text-stone-400 mb-3 truncate">📍 {user.address}</p>
            )}

            {/* Member since */}
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">
              Member since {new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}
            </p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ProfileHeader;