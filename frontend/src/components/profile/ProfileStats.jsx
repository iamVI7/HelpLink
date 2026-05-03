/**
 * ProfileStats.jsx — AdminDashboard Design Match
 *
 * Uses content-card style, Fraunces for numbers, DM Sans body.
 * Section label matches AdminDashboard SectionLabel component style.
 *
 * ✅ All props / logic unchanged
 */

import React from 'react';

const StarRating = ({ value }) => {
  const rounded = Math.round(value * 2) / 2;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rounded >= star;
        const half   = !filled && rounded >= star - 0.5;
        return (
          <svg key={star} width="12" height="12" viewBox="0 0 14 14" fill="none">
            <defs>
              <linearGradient id={`half-${star}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor="#E4A017" />
                <stop offset="50%" stopColor="transparent" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M7 1L8.545 4.885L12.75 5.382L9.75 8.236L10.545 12.25L7 10.25L3.455 12.25L4.25 8.236L1.25 5.382L5.455 4.885L7 1Z"
              fill={filled ? '#E4A017' : half ? `url(#half-${star})` : 'none'}
              stroke={filled || half ? '#E4A017' : '#e7e5e4'}
              strokeWidth="0.9"
            />
          </svg>
        );
      })}
    </div>
  );
};

// Matches AdminDashboard SectionLabel style
const SectionLabel = ({ text }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
    <h2
      style={{
        fontFamily: "'Fraunces', Georgia, serif",
        fontSize: '1rem', fontWeight: 600,
        color: '#1c1917', letterSpacing: '-0.01em', margin: 0,
      }}
    >
      {text}
    </h2>
  </div>
);

// Matches content-card from AdminDashboard
const StatCard = ({ children }) => (
  <div className="content-card" style={{ padding: '1rem 1.25rem', borderRadius: 16 }}>
    {children}
  </div>
);

const FieldLabel = ({ text }) => (
  <span style={{
    fontSize: '0.6rem', textTransform: 'uppercase',
    letterSpacing: '0.14em', color: '#a8a29e', fontWeight: 700, display: 'block',
  }}>
    {text}
  </span>
);

const ProfileStats = ({ stats, user }) => {
  const { totalHelps = 0, rating = 0, totalRatings = 0 } = stats || {};
  const available = user?.isAvailable;

  return (
    <div>
      <SectionLabel text="Stats" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Rating */}
        <StatCard>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <FieldLabel text="Rating" />
            <span style={{ fontSize: '0.85rem', opacity: 0.2 }}>⭐</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <span
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: '1.7rem', fontWeight: 600, lineHeight: 1,
                color: rating > 0 ? '#E4A017' : '#d6d3d1',
              }}
            >
              {rating > 0 ? rating.toFixed(1) : '—'}
            </span>
            {rating > 0 && <StarRating value={rating} />}
          </div>
          {totalRatings > 0 && (
            <span style={{ fontSize: '0.65rem', color: '#a8a29e', marginTop: 6, display: 'block' }}>
              {totalRatings} rating{totalRatings !== 1 ? 's' : ''}
            </span>
          )}
        </StatCard>

        {/* Helps given */}
        <StatCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: '1.7rem', fontWeight: 600, lineHeight: 1,
                  color: '#16a34a', display: 'block', marginBottom: 6,
                }}
              >
                {totalHelps}
              </span>
              <FieldLabel text="Helps Given" />
            </div>
            <span style={{ fontSize: '1.1rem', opacity: 0.18 }}>🤝</span>
          </div>
        </StatCard>

        {/* Availability */}
        <StatCard>
          <FieldLabel text="Availability" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span
              style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: available ? '#16a34a' : '#d1d5db',
                boxShadow: available ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '0.7rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.12em',
                color: available ? '#16a34a' : '#9ca3af',
              }}
            >
              {available ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </StatCard>

      </div>
    </div>
  );
};

export default ProfileStats;