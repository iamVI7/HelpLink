/**
 * ProfilePage.jsx — Layout Revision
 *
 * Layout change:
 *   LEFT column  (1/3): ProfileStats → ActivitySummary stacked
 *   RIGHT column (2/3): ProfileEmergencyCard — full height, no cramping
 *
 * ✅ All fetch logic / data flow unchanged
 */

import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';

import ProfileHeader        from '../components/profile/ProfileHeader';
import ProfileStats         from '../components/profile/ProfileStats';
import ProfileEmergencyCard from '../components/profile/ProfileEmergencyCard';
import ActivitySummary      from '../components/profile/ActivitySummary';

// ── Skeleton atom ─────────────────────────────────────────────────────────────
const Sk = ({ w, h, r = 8, style = {} }) => (
  <div className="sk-shimmer" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />
);

// ── ProfileSkeleton ───────────────────────────────────────────────────────────
const ProfileSkeleton = () => (
  <div
    className="min-h-screen pt-20"
    style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: '#f7f5f2' }}
  >
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap');
      @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
      .sk-shimmer {
        background: linear-gradient(90deg, #e8e4de 25%, #f0ece6 50%, #e8e4de 75%);
        background-size: 600px 100%;
        animation: shimmer 1.6s ease-in-out infinite;
      }
      .hero-card {
        background: #fff;
        border-radius: 24px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 6px 24px rgba(0,0,0,0.05);
        border: 1px solid rgba(0,0,0,0.05);
      }
      .content-card {
        background: #fff;
        border-radius: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
        border: 1px solid rgba(0,0,0,0.05);
        overflow: hidden;
      }
    `}</style>

    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 pb-16">
      <div className="mt-6 flex flex-col gap-6">

        {/* Header */}
        <div className="hero-card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Sk w={72} h={72} r={16} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Sk w={160} h={26} r={6} />
                <Sk w={44} h={20} r={8} />
              </div>
              <Sk w={180} h={12} r={5} />
              <Sk w={110} h={11} r={5} />
              <Sk w={130} h={10} r={5} />
            </div>
          </div>
        </div>

        {/* Stats + Activity | Emergency */}
        <div className="md:grid md:grid-cols-3 md:gap-6">

          {/* LEFT — Stats + Activity stacked */}
          <div className="md:col-span-1 mb-6 md:mb-0 flex flex-col gap-6">
            {/* Stats skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Sk w={40} h={16} r={5} style={{ marginBottom: 2 }} />
              {[null, null, null].map((_, i) => (
                <div key={i} className="content-card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Sk w={60} h={10} r={4} />
                  <Sk w={44} h={24} r={6} />
                </div>
              ))}
            </div>
            {/* Activity skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Sk w={55} h={16} r={5} style={{ marginBottom: 2 }} />
              <Sk w="100%" h={42} r={999} />
              <Sk w="100%" h={42} r={999} />
              <div className="content-card" style={{ padding: '13px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Sk w={18} h={18} r={4} />
                    <Sk w={100} h={10} r={4} />
                  </div>
                  <Sk w={12} h={12} r={3} />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Emergency full height */}
          <div className="md:col-span-2">
            <Sk w={130} h={16} r={5} style={{ marginBottom: 14 }} />
            <div className="content-card">
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f5f3f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <Sk w={44} h={44} r={10} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Sk w={70} h={10} r={4} />
                    <Sk w={32} h={20} r={5} />
                  </div>
                </div>
                <Sk w={52} h={28} r={10} />
              </div>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <Sk w={90} h={10} r={4} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Sk w={56} h={22} r={8} />
                      <Sk w={68} h={22} r={8} />
                      {i % 2 === 0 && <Sk w={48} h={22} r={8} />}
                    </div>
                    {i < 4 && <div style={{ height: 1, background: '#f5f3f0', marginTop: 4 }} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
);

// ── ProfilePage ───────────────────────────────────────────────────────────────
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

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) return <ProfileSkeleton />;

  if (error) {
    return (
      <div
        className="min-h-screen pt-20 flex items-center justify-center"
        style={{ background: '#f7f5f2', fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="text-center max-w-xs">
          <p style={{ fontSize: '0.8rem', color: '#dc2626', marginBottom: 16 }}>{error}</p>
          <button
            onClick={fetchProfile}
            style={{
              padding: '8px 24px', background: '#1c1917', color: '#fff',
              fontSize: '0.6rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.14em',
              borderRadius: 999, border: 'none', cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { user, emergencyProfile, stats } = profileData;

  return (
    <div
      className="min-h-screen pt-20"
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        background: '#f7f5f2',
        color: '#1c1917',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap');

        .hero-card {
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 6px 24px rgba(0,0,0,0.05);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .content-card {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.05);
          overflow: hidden;
        }
        @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
        .sk-shimmer {
          background: linear-gradient(90deg, #e8e4de 25%, #f0ece6 50%, #e8e4de 75%);
          background-size: 600px 100%;
          animation: shimmer 1.6s ease-in-out infinite;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .page-enter { animation: fadeUp 0.35s ease both; }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 pb-4 page-enter">

        {/* Header */}
        <div className="mt-6 mb-6">
          <ProfileHeader user={user} />
        </div>

        {/* Two-column layout */}
        <div className="md:grid md:grid-cols-3 md:gap-6 mb-6">

          {/* LEFT — Stats then Activity stacked */}
          <div className="md:col-span-1 mb-6 md:mb-0 flex flex-col gap-6">
            <ProfileStats stats={stats} user={user} />
            <ActivitySummary />
          </div>

          {/* RIGHT — Emergency full height */}
          <div className="md:col-span-2">
            <ProfileEmergencyCard
              emergencyProfile={emergencyProfile}
              onUpdate={fetchProfile}
            />
          </div>

        </div>

        {/* Footer */}
<div style={{ textAlign: 'center', paddingBottom: 16, marginTop: '3.5rem' }}>
  <div
    style={{
      height: 1,
      background: 'linear-gradient(to right, transparent, #ddd8d2 30%, #ddd8d2 70%, transparent)',
      marginBottom: 20,
    }}
  />
  <span style={{ fontSize: '0.7rem', color: '#c7c4bf', letterSpacing: '0.06em' }}>
    © 2026 HelpLink
  </span>
</div>

      </div>
    </div>
  );
};

export default ProfilePage;