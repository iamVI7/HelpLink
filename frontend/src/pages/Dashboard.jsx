import React, { Suspense } from 'react';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = React.lazy(() => import('./AdminDashboard'));
const UserDashboard  = React.lazy(() => import('./UserDashboard'));

// ─────────────────────────────────────────────────────────────────────────────
// DashboardSkeleton
// Mimics the real dashboard layout while the bundle loads.
// Matches HelpLink's exact aesthetic: DM Sans, stone palette, red accent.
// ─────────────────────────────────────────────────────────────────────────────
const DashboardSkeleton = () => (
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
      .pulse-badge-skel {
        animation: borderPulse 2s ease-in-out infinite;
      }
    `}</style>

    <div style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Hero header skeleton ── */}
      <section
        className="border-b border-stone-100 relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.92)' }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            top: -120, right: -120, width: 480, height: 480,
            background: 'radial-gradient(circle, rgba(220,38,38,0.04) 0%, transparent 70%)',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-10 md:py-16">

          {/* Badge row */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="pulse-badge-skel px-3 py-1 rounded"
              style={{
                border: '1px solid rgba(220,38,38,0.3)',
                width: 90, height: 22,
              }}
            >
              <div className="skel w-full h-full rounded" />
            </div>
            <div className="skel w-2 h-2 rounded-full" />
            <div className="skel w-10 h-3 rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 md:gap-12 md:items-start">

            {/* Left — name + subtext + button */}
            <div className="md:col-span-3 space-y-4">
              <div className="skel h-12 w-56 rounded-lg" />
              <div className="skel h-3.5 w-48 rounded" />
              <div className="skel h-3 w-36 rounded" />
              <div className="skel h-9 w-36 rounded-full mt-2" />
            </div>

            {/* Right — 4 stat cards */}
            <div className="md:col-span-2 mt-8 md:mt-0 grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col justify-between p-4 rounded-2xl min-h-[84px]"
                  style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.07)' }}
                >
                  <div className="skel h-7 w-8 rounded" />
                  <div className="mt-2 space-y-1.5">
                    <div className="skel h-2.5 w-12 rounded" />
                    <div className="skel h-2 w-8 rounded" />
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Body skeleton ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12">

        {/* Section label */}
        <div className="pt-10 flex items-center gap-3 mb-6">
          <div className="skel h-2.5 w-24 rounded" />
          <div className="flex-1 h-px bg-stone-100" />
          <div className="skel h-2.5 w-20 rounded" />
        </div>

        {/* Activity card with tab bar */}
        <div
          className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm mb-10"
        >
          {/* Tab bar */}
          <div className="flex items-center border-b border-stone-100 px-0">
            {['My Requests', 'My Helps'].map((label, i) => (
              <div
                key={i}
                className={`flex-1 px-5 py-3.5 flex items-center gap-2 border-r border-stone-100 last:border-r-0 ${i === 0 ? 'bg-stone-50' : 'bg-white'}`}
              >
                <div className="skel h-2.5 w-20 rounded" />
                <div className="skel h-2.5 w-5 rounded" />
              </div>
            ))}
            {/* Filter pills */}
            <div className="flex items-center gap-1 px-4 border-l border-stone-100">
              <div className="skel h-6 w-12 rounded-lg" />
              <div className="skel h-6 w-16 rounded-lg" />
            </div>
          </div>

          {/* Request rows */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="px-5 py-4 border-b border-stone-100 last:border-b-0 flex items-center gap-4"
            >
              <div className="skel w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skel h-3.5 w-48 rounded" />
                <div className="skel h-2.5 w-32 rounded" />
              </div>
              <div className="skel h-5 w-14 rounded-lg shrink-0" />
            </div>
          ))}
        </div>

        {/* Nearby requests section label */}
        <div className="flex items-center gap-3 mb-6 border-t border-stone-100 pt-10">
          <div className="skel h-2.5 w-32 rounded" />
          <div className="flex-1 h-px bg-stone-100" />
          <div className="skel h-2.5 w-16 rounded" />
        </div>

        {/* Nearby request rows */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm mb-16">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="px-5 py-4 border-b border-stone-100 last:border-b-0 flex items-center gap-4"
            >
              <div className="skel w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skel h-3.5 rounded" style={{ width: `${48 + (i * 11) % 30}%` }} />
                <div className="skel h-2.5 rounded" style={{ width: `${30 + (i * 7) % 20}%` }} />
              </div>
              <div className="flex gap-2 shrink-0">
                <div className="skel h-5 w-12 rounded-lg" />
                <div className="skel h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — role switcher
// ─────────────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();

  if (!user || !user.role) return null;

  return (
    <Suspense fallback={null}>
      {user.role === 'admin' ? <AdminDashboard /> : <UserDashboard />}
    </Suspense>
  );
};

export default Dashboard;