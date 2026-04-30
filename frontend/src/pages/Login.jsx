import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const LiveDot = () => (
  <span className="relative inline-flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
  </span>
);

// ─────────────────────────────────────────────
// Warning Modal
// ─────────────────────────────────────────────
const WarningModal = ({ warnings, currentIndex, onAcknowledge }) => {
  const warning = warnings[currentIndex];
  if (!warning) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(26,23,20,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: 'modalIn 0.18s ease both' }}
      >
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
          <span className="text-white text-xl select-none">⚠️</span>
          <h2
            className="text-white text-lg font-bold"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            Admin Warning
          </h2>
          {warnings.length > 1 && (
            <span className="ml-auto text-white/60 text-xs font-semibold">
              {currentIndex + 1} / {warnings.length}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-xs text-stone-400 uppercase tracking-widest font-bold mb-3">
            Official Notice
          </p>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800 font-medium text-sm leading-relaxed">
              {warning.message}
            </p>
          </div>
          <p className="text-xs text-stone-400 mt-4 leading-relaxed">
            This warning has been issued by the platform administrator. Please
            review and acknowledge to continue.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end">
          <button
            onClick={onAcknowledge}
            className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded-xl transition-colors duration-150"
          >
            {currentIndex + 1 < warnings.length ? 'Acknowledge & Next' : 'I Acknowledge'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────
const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading,  setLoading]  = useState(false);

  // Role stored after login so handleAcknowledge can navigate correctly
  const roleRef = React.useRef(null);

  // Warning state
  const [warnings,      setWarnings]      = useState([]);
  const [warningIndex,  setWarningIndex]  = useState(0);
  const [showWarning,   setShowWarning]   = useState(false);

  const { login }    = useAuth();
  const navigate     = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // Fetch unread warnings after login succeeds
  const fetchAndShowWarnings = async (role) => {
    const dest = role === 'admin' ? '/dashboard' : '/map';
    try {
      const res   = await api.get('/auth/me/warnings');
      const unread = res.data.warnings || [];
      if (unread.length > 0) {
        setWarnings(unread);
        setWarningIndex(0);
        setShowWarning(true);
      } else {
        navigate(dest);
      }
    } catch (err) {
      console.error('Could not fetch warnings:', err);
      navigate(dest);
    }
  };

  // Acknowledge current warning → mark read → advance or navigate
  const handleAcknowledge = async () => {
    const current = warnings[warningIndex];
    try {
      await api.patch(`/auth/warnings/${current._id}/read`);
    } catch (err) {
      console.error('Could not mark warning as read:', err);
    }

    if (warningIndex + 1 < warnings.length) {
      setWarningIndex((prev) => prev + 1);
    } else {
      setShowWarning(false);
      navigate(roleRef.current === 'admin' ? '/dashboard' : '/map');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(formData.email, formData.password);
    if (result.success) {
      // Pass role from login result directly — user state may not be set yet
      roleRef.current = result.role;
      await fetchAndShowWarnings(result.role);
    } else {
      if (result.error) console.log(result.error);
    }
    setLoading(false);
  };

  const inputCls =
    'w-full px-4 py-3 text-sm text-stone-900 bg-white border border-stone-200 rounded-xl placeholder-stone-400 outline-none transition-all duration-150 focus:border-red-500 focus:ring-2 focus:ring-red-500/10';

  return (
    <div
      className="min-h-screen flex bg-white"
      style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes borderPulse {
          0%, 100% { border-color: rgba(220,38,38,0.35); }
          50%       { border-color: rgba(220,38,38,0.75); }
        }
        @keyframes spinLoader {
          to { transform: rotate(360deg); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .fade-up   { animation: fadeUp 0.45s ease both; }
        .fade-up-1 { animation: fadeUp 0.45s 0.07s ease both; }
        .fade-up-2 { animation: fadeUp 0.45s 0.14s ease both; }
        .fade-up-3 { animation: fadeUp 0.45s 0.21s ease both; }
        .border-pulse { animation: borderPulse 2s ease-in-out infinite; }
        .spin-loader  { animation: spinLoader 0.8s linear infinite; }
        .serif { font-family: 'DM Serif Display', Georgia, serif; }
      `}</style>

      {/* Warning Modal */}
      {showWarning && (
        <WarningModal
          warnings={warnings}
          currentIndex={warningIndex}
          onAcknowledge={handleAcknowledge}
        />
      )}

      {/* Full-page grid background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.018) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative flex min-h-screen w-full z-10">

        {/* ── Left Panel ── */}
        <div
          className="hidden lg:flex flex-col justify-between w-5/12 relative overflow-hidden px-12 py-14"
          style={{ background: 'linear-gradient(145deg, #dc2626 0%, #991b1b 100%)', minHeight: '100vh' }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div
            className="absolute -top-20 -left-20 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.16) 0%, transparent 70%)' }}
          />

          <div className="relative fade-up flex items-center gap-2">
            <LiveDot />
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">HelpLink</span>
          </div>

          <div className="relative fade-up-1">
            <h2
              className="serif leading-none mb-5 text-white"
              style={{ fontSize: 'clamp(2.4rem, 3.4vw, 3.6rem)', letterSpacing: '-0.015em' }}
            >
              Help starts<br />
              <span className="serif italic text-white/50">with you.</span>
            </h2>
            <p className="text-sm text-white/40 leading-relaxed">
              Small actions. Real impact. Every day.
            </p>
          </div>

          <div className="relative fade-up-2 flex items-center gap-2">
            <LiveDot />
            <span className="text-xs text-white/40 tracking-wide">Network active 24 / 7</span>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex flex-1 items-center justify-center px-6 py-14 bg-white/90">
          <div className="w-full max-w-sm">

            <div className="lg:hidden mb-8 fade-up flex items-center gap-2">
              <LiveDot />
              <span className="text-xs font-bold uppercase tracking-widest text-red-600">HelpLink</span>
            </div>

            <div className="fade-up mb-2">
              <span className="border-pulse inline-block text-xs font-bold uppercase tracking-widest text-red-600 border border-red-600/40 px-2.5 py-1">
                Sign In
              </span>
            </div>

            <div className="fade-up-1 mb-8">
              <h1
                className="serif leading-tight mb-1.5 text-stone-900"
                style={{ fontSize: 'clamp(1.9rem, 4vw, 2.4rem)', letterSpacing: '-0.01em' }}
              >
                Welcome<br />
                <span className="serif italic text-red-600">back.</span>
              </h1>
              <p className="text-sm text-stone-400 leading-relaxed">
                Access your dashboard and continue helping your community.
              </p>
            </div>

            <form className="fade-up-2 flex flex-col gap-4" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={inputCls}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className={inputCls}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl border-none cursor-pointer transition-all duration-150 hover:-translate-y-px hover:shadow-lg hover:shadow-red-600/25 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="spin-loader inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                    Signing in…
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="fade-up-3 mt-8 text-center">
              <p className="text-sm text-stone-400">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-bold text-red-600 hover:text-red-500 transition-colors duration-150"
                >
                  Sign up
                </Link>
              </p>
            </div>

            <p className="mt-4 text-center text-stone-300 text-xs leading-relaxed">
              For life-threatening emergencies always call{' '}
              <strong className="text-red-600">112</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;