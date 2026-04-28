/**
 * ProfilePage.jsx  — REFACTORED + SKELETON LOADER
 *
 * Changes from previous version:
 *   ✅ REMOVED: Plain spinner loading state
 *   ✅ ADDED:   Full ProfileSkeleton matching actual layout
 *   ✅ KEPT:    All existing logic — fetch, error, render — unchanged
 */

import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

import ProfileHeader        from '../components/profile/ProfileHeader';
import ProfileStats         from '../components/profile/ProfileStats';
import ProfileEmergencyCard from '../components/profile/ProfileEmergencyCard';
import ActivitySummary      from '../components/profile/ActivitySummary';

// ─────────────────────────────────────────────────────────────────────────────
// ProfileSkeleton
// Mirrors exact layout: Header → Stats + Emergency card → Activity summary
// ─────────────────────────────────────────────────────────────────────────────
const ProfileSkeleton = () => (
  <div
    className="min-h-screen pt-20"
    style={{
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      background: '#ffffff',
      position: 'relative',
    }}
  >
    {/* Grid background */}
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage:
          'linear-gradient(rgba(0,0,0,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.018) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    />

    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
      @keyframes shimmer {
        0%   { background-position: -600px 0; }
        100% { background-position:  600px 0; }
      }
      @keyframes borderPulse {
        0%, 100% { border-color: rgba(220,38,38,0.2); }
        50%       { border-color: rgba(220,38,38,0.5); }
      }
      .skel {
        background: linear-gradient(90deg, #f5f4f2 25%, #eceae7 50%, #f5f4f2 75%);
        background-size: 600px 100%;
        animation: shimmer 1.4s ease-in-out infinite;
        border-radius: 6px;
      }
      .pulse-ring { animation: borderPulse 2s ease-in-out infinite; }
    `}</style>

    <div style={{ position: 'relative', zIndex: 1 }}>

      {/* ── ProfileHeader skeleton ── */}
      <section
        className="border-b border-stone-100 relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.88)' }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            top: -80, right: -80, width: 320, height: 320,
            background: 'radial-gradient(circle, rgba(220,38,38,0.04) 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-6 md:px-12 py-12 md:py-14">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">

            {/* Avatar */}
            <div className="skel w-20 h-20 md:w-24 md:h-24 rounded-2xl shrink-0" />

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="skel h-8 w-44 rounded-lg" style={{ animationDelay: '60ms' }} />
                <div className="skel h-5 w-12 rounded-full" style={{ animationDelay: '80ms' }} />
                <div className="skel h-5 w-16 rounded-full" style={{ animationDelay: '100ms' }} />
              </div>
              <div className="skel h-3.5 w-52 rounded" style={{ animationDelay: '80ms' }} />
              <div className="skel h-3 w-32 rounded"   style={{ animationDelay: '100ms' }} />
              <div className="skel h-2.5 w-40 rounded" style={{ animationDelay: '120ms' }} />
            </div>

          </div>
        </div>
      </section>

      {/* ── Stats + Emergency card skeleton ── */}
      <section className="max-w-5xl mx-auto px-6 md:px-12 py-8">
        <div className="md:grid md:grid-cols-3 md:gap-8">

          {/* Stats column */}
          <div className="md:col-span-1 mb-8 md:mb-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="skel h-2.5 w-10 rounded" />
              <div className="flex-1 h-px bg-stone-100" />
            </div>
            <div className="flex flex-col gap-3">

              {/* Rating card */}
              <div
                className="px-5 py-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="skel h-2.5 w-12 rounded" />
                  <div className="skel h-4 w-4 rounded" />
                </div>
                <div className="skel h-7 w-10 rounded" style={{ animationDelay: '40ms' }} />
                <div className="skel h-2.5 w-24 rounded mt-2" style={{ animationDelay: '60ms' }} />
              </div>

              {/* Helps given card */}
              <div
                className="flex items-center justify-between px-5 py-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <div className="space-y-2">
                  <div className="skel h-7 w-8 rounded"   style={{ animationDelay: '80ms' }} />
                  <div className="skel h-2.5 w-20 rounded" style={{ animationDelay: '100ms' }} />
                </div>
                <div className="skel w-5 h-5 rounded" style={{ animationDelay: '80ms' }} />
              </div>

              {/* Availability card */}
              <div
                className="px-5 py-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                <div className="skel h-2.5 w-20 rounded mb-3" style={{ animationDelay: '100ms' }} />
                <div className="flex items-center gap-2">
                  <div className="skel w-2 h-2 rounded-full" />
                  <div className="skel h-3 w-16 rounded" style={{ animationDelay: '120ms' }} />
                </div>
              </div>

            </div>
          </div>

          {/* Emergency card column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="skel h-2.5 w-32 rounded" />
              <div className="flex-1 h-px bg-stone-100" />
              <div className="skel h-5 w-14 rounded-full" />
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(0,0,0,0.08)' }}
            >
              {/* Blood group header */}
              <div
                className="px-6 py-5 flex items-center justify-between"
                style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
              >
                <div className="flex items-center gap-4">
                  <div className="skel w-12 h-12 rounded-xl" style={{ animationDelay: '60ms' }} />
                  <div className="space-y-2">
                    <div className="skel h-2.5 w-20 rounded" style={{ animationDelay: '80ms' }} />
                    <div className="skel h-5 w-8 rounded"    style={{ animationDelay: '100ms' }} />
                  </div>
                </div>
                <div className="skel h-8 w-14 rounded-full" style={{ animationDelay: '60ms' }} />
              </div>

              {/* Medical rows */}
              <div className="px-6 py-5 space-y-5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <div
                      className="skel h-2.5 w-28 rounded mb-2.5"
                      style={{ animationDelay: `${i * 30}ms` }}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <div className="skel h-6 w-16 rounded-full" style={{ animationDelay: `${i * 30 + 20}ms` }} />
                      <div className="skel h-6 w-20 rounded-full" style={{ animationDelay: `${i * 30 + 40}ms` }} />
                      {i % 2 === 0 && (
                        <div className="skel h-6 w-14 rounded-full" style={{ animationDelay: `${i * 30 + 60}ms` }} />
                      )}
                    </div>
                    {i < 3 && <div className="h-px bg-stone-100 mt-5" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Activity Summary skeleton ── */}
      <section className="max-w-5xl mx-auto px-6 md:px-12 pb-16">

        <div className="flex items-center gap-3 mb-4">
          <div className="skel h-2.5 w-14 rounded" />
          <div className="flex-1 h-px bg-stone-100" />
        </div>

        {/* Two stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { color: 'rgba(220,38,38,0.04)',  border: 'rgba(220,38,38,0.12)',  delay: '0ms'  },
            { color: 'rgba(22,163,74,0.04)',  border: 'rgba(22,163,74,0.12)', delay: '60ms' },
          ].map((c, i) => (
            <div
              key={i}
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{ background: c.color, border: `1px solid ${c.border}` }}
            >
              <div className="skel w-6 h-6 rounded-lg"   style={{ animationDelay: c.delay }} />
              <div className="skel h-9 w-10 rounded-lg"  style={{ animationDelay: c.delay }} />
              <div className="skel h-2.5 w-24 rounded"   style={{ animationDelay: c.delay }} />
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl border border-stone-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="skel w-5 h-5 rounded" />
            <div className="skel h-3 w-32 rounded" style={{ animationDelay: '40ms' }} />
          </div>
          <div className="skel h-3 w-3 rounded" />
        </div>

      </section>

    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ProfilePage
// ─────────────────────────────────────────────────────────────────────────────
const ProfilePage = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/profile/me');
      if (data.success) {
        setProfileData(data.data);
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      console.error('[ProfilePage] fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return <ProfileSkeleton />;

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="min-h-screen pt-20 flex items-center justify-center"
        style={{ background: '#ffffff', fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="text-center max-w-sm">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchProfile}
            className="px-6 py-2 bg-stone-900 text-white text-xs font-bold uppercase tracking-widest rounded-full"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { user, emergencyProfile, stats } = profileData;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen text-stone-900 pt-20"
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        background: '#ffffff',
        position: 'relative',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.018) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade-up   { animation: fadeUp 0.45s ease both; }
        .fade-up-1 { animation: fadeUp 0.45s 0.08s ease both; }
        .fade-up-2 { animation: fadeUp 0.45s 0.16s ease both; }
        .fade-up-3 { animation: fadeUp 0.45s 0.24s ease both; }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1 }}>

        <ProfileHeader user={user} />

        <section className="max-w-5xl mx-auto px-6 md:px-12 py-8">
          <div className="md:grid md:grid-cols-3 md:gap-8">
            <div className="md:col-span-1 mb-8 md:mb-0 fade-up-1">
              <ProfileStats stats={stats} user={user} />
            </div>
            <div className="md:col-span-2 fade-up-2">
              <ProfileEmergencyCard
                emergencyProfile={emergencyProfile}
                onUpdate={fetchProfile}
              />
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 md:px-12 pb-16 fade-up-3">
          <ActivitySummary />
        </section>

        <footer className="border-t border-stone-100" style={{ background: 'rgba(255,255,255,0.9)' }}>
          <div className="max-w-5xl mx-auto px-6 md:px-12 py-6 text-center">
            <span className="text-xs text-stone-400">© 2026 HelpLink</span>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default ProfilePage;