/**
 * ProfileHeader.jsx — AdminDashboard Design Match
 *
 * Tokens from AdminDashboard:
 *   font: Fraunces + DM Sans
 *   card: hero-card (bg #fff, radius 24px, shadow, border rgba(0,0,0,0.05))
 *   badges: rounded-lg, uppercase tracking-widest 10px
 *   accent: #dc2626
 *
 * ✅ All props / logic unchanged
 */

import React from 'react';

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const avatarHue = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
};

const VerifiedBadge = () => (
  <span
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em',
      padding: '3px 10px', borderRadius: 8,
      background: 'rgba(22,163,74,0.07)', color: '#16a34a',
      border: '1px solid rgba(22,163,74,0.2)',
    }}
  >
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
      <circle cx="5" cy="5" r="4.25" stroke="#16a34a" strokeWidth="0.75" />
      <path d="M3 5l1.4 1.4L7 3.5" stroke="#16a34a" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    Verified
  </span>
);

const RoleBadge = ({ role }) => {
  const isAdmin = role === 'admin';
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center',
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em',
        padding: '3px 10px', borderRadius: 8,
        background: isAdmin ? 'rgba(220,38,38,0.07)' : 'rgba(0,0,0,0.04)',
        color: isAdmin ? '#dc2626' : '#78716c',
        border: isAdmin ? '1px solid rgba(220,38,38,0.2)' : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {role}
    </span>
  );
};

const ProfileHeader = ({ user }) => {
  if (!user) return null;

  const hue      = avatarHue(user.name);
  const avatarBg = `hsl(${hue} 45% 90%)`;
  const avatarFg = `hsl(${hue} 55% 35%)`;

  return (
    <div className="hero-card" style={{ padding: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>

        {/* Avatar */}
        <div
          style={{
            width: 72, height: 72, borderRadius: 16, flexShrink: 0,
            background: avatarBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '1.6rem', fontWeight: 700, color: avatarFg,
            userSelect: 'none',
          }}
        >
          {initials(user.name)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <h1
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
                fontWeight: 600, lineHeight: 1.1,
                letterSpacing: '-0.015em', color: '#1c1917', margin: 0,
              }}
            >
              {user.name}
            </h1>
            <RoleBadge role={user.role} />
            {user.isVerified && <VerifiedBadge />}
          </div>

          {/* Contact rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: '0.8rem', color: '#78716c' }}>{user.email}</span>
            {user.phoneNumber && (
              <span style={{ fontSize: '0.75rem', color: '#a8a29e' }}>📞 {user.phoneNumber}</span>
            )}
            {user.address && (
              <span style={{
                fontSize: '0.75rem',
                color: '#a8a29e',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
              }}>
                📍 {user.address}
              </span>
            )}
          </div>

          {/* Member since */}
          <p style={{
            marginTop: 10, fontSize: '0.6rem',
            textTransform: 'uppercase', letterSpacing: '0.16em',
            color: '#c7c4bf', fontWeight: 600, marginBottom: 0,
          }}>
            Member since{' '}
            {new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}
          </p>
        </div>

      </div>
    </div>
  );
};

export default ProfileHeader;
