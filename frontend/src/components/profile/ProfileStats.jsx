/**
 * ProfileStats.jsx
 *
 * PHASE 3 — Component Modularization
 *
 * Displays:
 *   - Star rating (from stats.rating)
 *   - Total helps given (from stats.totalHelps)
 *   - Total ratings received (from stats.totalRatings)
 *   - Availability status (from user.isAvailable)
 *
 * Props:
 *   stats {Object} — { totalHelps, rating, totalRatings }
 *   user  {Object} — for isAvailable flag
 *
 * ✅ Receives props only — fetches nothing
 * ✅ Reusable and self-contained
 */

import React from 'react';

// ── Star rating display ───────────────────────────────────────────────────────
const StarRating = ({ value }) => {
  const rounded = Math.round(value * 2) / 2; // nearest 0.5
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rounded >= star;
        const half   = !filled && rounded >= star - 0.5;
        return (
          <svg key={star} width="14" height="14" viewBox="0 0 14 14" fill="none">
            <defs>
              <linearGradient id={`half-${star}`}>
                <stop offset="50%" stopColor="#E4A017" />
                <stop offset="50%" stopColor="none" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M7 1L8.545 4.885L12.75 5.382L9.75 8.236L10.545 12.25L7 10.25L3.455 12.25L4.25 8.236L1.25 5.382L5.455 4.885L7 1Z"
              fill={filled ? '#E4A017' : half ? 'url(#half-' + star + ')' : 'none'}
              stroke={filled || half ? '#E4A017' : '#d6d3d1'}
              strokeWidth="0.8"
            />
          </svg>
        );
      })}
    </div>
  );
};

// ── Single stat card ──────────────────────────────────────────────────────────
const StatCard = ({ value, label, sub, color = '#1a1714', icon }) => (
  <div
    className="flex items-center justify-between px-5 py-4 rounded-xl"
    style={{
      background: 'rgba(255,255,255,0.9)',
      border: '1px solid rgba(0,0,0,0.08)',
      transition: 'box-shadow 0.2s',
    }}
  >
    <div>
      <div
        className="text-2xl font-bold leading-none mb-1"
        style={{ fontFamily: "'DM Serif Display', serif", color }}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">{label}</div>
      {sub && <div className="text-[10px] text-stone-400 mt-0.5">{sub}</div>}
    </div>
    {icon && <span style={{ fontSize: '1.2rem', opacity: 0.25 }}>{icon}</span>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ProfileStats
// ─────────────────────────────────────────────────────────────────────────────
const ProfileStats = ({ stats, user }) => {
  const { totalHelps = 0, rating = 0, totalRatings = 0 } = stats || {};

  return (
    <div>
      {/* Section label */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400 font-bold">Stats</span>
        <div className="flex-1 h-px bg-stone-100" />
      </div>

      <div className="flex flex-col gap-3">

        {/* Rating */}
        <div
          className="px-5 py-4 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold">Rating</span>
            <span style={{ fontSize: '1rem', opacity: 0.25 }}>⭐</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-bold"
              style={{ fontFamily: "'DM Serif Display', serif", color: '#E4A017' }}
            >
              {rating > 0 ? rating.toFixed(1) : '—'}
            </span>
            {rating > 0 && <StarRating value={rating} />}
          </div>
          {totalRatings > 0 && (
            <p className="text-[10px] text-stone-400 mt-1">{totalRatings} rating{totalRatings !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Total helps */}
        <StatCard
          value={totalHelps}
          label="Helps Given"
          color="#16a34a"
          icon="🤝"
        />

        {/* Availability */}
        <div
          className="px-5 py-4 rounded-xl flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)' }}
        >
          <div>
            <div className="text-[10px] uppercase tracking-widest text-stone-400 font-semibold mb-1">
              Availability
            </div>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
              style={{ color: user?.isAvailable ? '#16a34a' : '#9ca3af' }}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{
                  background: user?.isAvailable ? '#16a34a' : '#9ca3af',
                  boxShadow: user?.isAvailable ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none',
                }}
              />
              {user?.isAvailable ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfileStats;