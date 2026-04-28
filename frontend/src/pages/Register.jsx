import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MapLocationPicker from '../components/MapLocationPicker';

const STEPS = [
  { id: 1, label: 'Account', icon: '01' },
  { id: 2, label: 'Contact', icon: '02' },
  { id: 3, label: 'Location', icon: '03' },
];

const LiveDot = () => (
  <span className="relative inline-flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
  </span>
);

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    address: '',
    location: null,
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLocationSelect = (location, address) => {
    setFormData({
      ...formData,
      location: { type: 'Point', coordinates: [location.lng, location.lat] },
      address: address || formData.address,
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported by your browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          if (data.display_name) address = data.display_name;
        } catch (_) {}
        setFormData((prev) => ({ ...prev, location: { type: 'Point', coordinates: [lng, lat] }, address }));
        setDetectedCoords({ lat, lng });
        setLocating(false);
      },
      () => { alert('Unable to retrieve your location. Please allow location access.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password) return;
      if (formData.password.length < 6) { alert('Password must be at least 6 characters long'); return; }
    }
    if (step === 2 && !formData.phoneNumber) return;
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location) { alert('📍 Please select your location on the map'); return; }
    setLoading(true);
    const result = await register(formData);
    if (result.success) navigate('/dashboard');
    setLoading(false);
  };

  const inputCls =
    'w-full px-4 py-2.5 text-sm text-stone-900 bg-white border border-stone-200 rounded-xl placeholder-stone-400 outline-none transition-all duration-150 focus:border-red-500 focus:ring-2 focus:ring-red-500/10';

  const primaryBtn =
    'w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl border-none cursor-pointer transition-all duration-150 hover:-translate-y-px hover:shadow-lg hover:shadow-red-600/25 active:translate-y-0';

  const ghostBtn =
    'flex-1 py-2.5 bg-transparent border border-stone-200 text-stone-500 hover:bg-stone-50 text-xs font-semibold tracking-wider rounded-xl cursor-pointer transition-colors duration-150';

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
        @keyframes slidePanel {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes spinLoader {
          to { transform: rotate(360deg); }
        }

        .fade-up   { animation: fadeUp 0.45s ease both; }
        .fade-up-1 { animation: fadeUp 0.45s 0.07s ease both; }
        .fade-up-2 { animation: fadeUp 0.45s 0.14s ease both; }
        .fade-up-3 { animation: fadeUp 0.45s 0.21s ease both; }
        .step-panel { animation: slidePanel 0.35s ease both; }
        .border-pulse { animation: borderPulse 2s ease-in-out infinite; }
        .spin-loader { animation: spinLoader 0.8s linear infinite; }
        .serif { font-family: 'DM Serif Display', Georgia, serif; }
      `}</style>

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
          {/* Grid overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          {/* Glow blobs */}
          <div
            className="absolute -top-20 -left-20 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(0,0,0,0.16) 0%, transparent 70%)' }}
          />

          {/* Top — wordmark */}
          <div className="relative fade-up flex items-center gap-2">
            <LiveDot />
            <span className="text-xs font-bold uppercase tracking-widest text-white/70">HelpLink</span>
          </div>

          {/* Center — headline */}
          <div className="relative fade-up-1">
            <h2
              className="serif leading-none mb-5 text-white"
              style={{ fontSize: 'clamp(2.4rem, 3.4vw, 3.6rem)', letterSpacing: '-0.015em' }}
            >
              Your city<br />
              needs you<br />
              <span className="serif italic text-white/50">right now.</span>
            </h2>
            <p className="text-sm text-white/40 leading-relaxed">
              Be the neighbour someone is counting on.
            </p>
          </div>

          {/* Bottom — step tracker */}
          <div className="relative fade-up-2 flex flex-col gap-3">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 transition-opacity duration-300"
                style={{ opacity: step >= s.id ? 1 : 0.35 }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                  style={{
                    border: `1.5px solid ${step > s.id ? 'rgba(255,255,255,0.5)' : step === s.id ? '#ffffff' : 'rgba(255,255,255,0.25)'}`,
                    background: step > s.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                  }}
                >
                  {step > s.id ? (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="text-white font-bold" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>
                      {s.icon}
                    </span>
                  )}
                </div>
                <span
                  className="uppercase tracking-widest transition-all duration-300"
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: step === s.id ? 700 : 400,
                    color: step === s.id ? '#ffffff' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex flex-1 items-center justify-center px-6 py-8 bg-white/90 overflow-y-auto">
          <div className="w-full max-w-sm">

            {/* Mobile wordmark */}
            <div className="lg:hidden mb-6 fade-up flex items-center gap-2">
              <LiveDot />
              <span className="text-xs font-bold uppercase tracking-widest text-red-600">HelpLink</span>
            </div>

            {/* Progress bar */}
            <div className="fade-up mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-widest text-red-600">
                  Step {step} of {STEPS.length}
                </span>
                <span className="text-xs uppercase tracking-widest text-stone-400">
                  {STEPS[step - 1].label}
                </span>
              </div>
              <div className="h-0.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(step / STEPS.length) * 100}%`,
                    background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                  }}
                />
              </div>
            </div>

            {/* Heading */}
            <div className="fade-up-1 mb-5">
              <h1
                className="serif leading-tight mb-1 text-stone-900"
                style={{ fontSize: 'clamp(1.7rem, 4vw, 2.1rem)', letterSpacing: '-0.01em' }}
              >
                {step === 1 && <>Create your<br /><span className="serif italic text-red-600">account.</span></>}
                {step === 2 && <>How can we<br /><span className="serif italic text-red-600">reach you?</span></>}
                {step === 3 && <>Pin your<br /><span className="serif italic text-red-600">location.</span></>}
              </h1>
              <p className="text-sm text-stone-400 leading-relaxed">
                {step === 1 && 'Start with your basic details.'}
                {step === 2 && 'Your phone helps with local coordination.'}
                {step === 3 && 'Click on the map or use GPS to set your area.'}
              </p>
            </div>

            {/* ── Step 1: Account ── */}
            {step === 1 && (
              <form key="step1" className="step-panel flex flex-col gap-3" onSubmit={handleNext}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5">
                    Full Name *
                  </label>
                  <input className={inputCls} type="text" name="name" required placeholder="John Doe"
                    value={formData.name} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5">
                    Email Address *
                  </label>
                  <input className={inputCls} type="email" name="email" required placeholder="you@example.com"
                    value={formData.email} onChange={handleChange} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5">
                    Password *
                  </label>
                  <input className={inputCls} type="password" name="password" required placeholder="Minimum 6 characters"
                    value={formData.password} onChange={handleChange} />
                </div>
                <button type="submit" className={`mt-1 ${primaryBtn}`}>
                  Continue →
                </button>
              </form>
            )}

            {/* ── Step 2: Contact ── */}
            {step === 2 && (
              <form key="step2" className="step-panel flex flex-col gap-3" onSubmit={handleNext}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1.5">
                    Phone Number *
                  </label>
                  <input className={inputCls} type="tel" name="phoneNumber" required placeholder="10-digit mobile number"
                    value={formData.phoneNumber} onChange={handleChange} />
                </div>
                <div className="flex gap-3 mt-1">
                  <button type="button" onClick={handleBack} className={ghostBtn}>← Back</button>
                  <button type="submit" className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl border-none cursor-pointer transition-all duration-150 hover:-translate-y-px hover:shadow-lg hover:shadow-red-600/25 active:translate-y-0">
                    Continue →
                  </button>
                </div>
              </form>
            )}

            {/* ── Step 3: Location ── */}
            {step === 3 && (
              <form key="step3" className="step-panel flex flex-col gap-2.5" onSubmit={handleSubmit}>

                {/* GPS button */}
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="border-pulse w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 border-2 border-red-600/30 text-red-600 text-xs font-bold uppercase tracking-widest rounded-xl cursor-pointer transition-all duration-150 hover:bg-red-50 hover:border-red-600 hover:shadow-md hover:shadow-red-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {locating ? (
                    <>
                      <span className="spin-loader inline-block w-3.5 h-3.5 border-2 border-red-200 border-t-red-600 rounded-full" />
                      Detecting location…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Use My Current Location
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-stone-100" />
                  <span className="text-xs text-stone-300 font-medium tracking-wider">or pick on map</span>
                  <div className="flex-1 h-px bg-stone-100" />
                </div>

                {/* Map */}
                <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
                  <MapLocationPicker
                    onLocationSelect={(location, address) => {
                      setDetectedCoords(null);
                      handleLocationSelect(location, address);
                    }}
                    height="220px"
                    markerPosition={detectedCoords}
                  />
                </div>

                {/* Detected address */}
                {formData.address && (
                  <div className="fade-up flex items-start gap-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-green-700 leading-relaxed">
                      {formData.address.substring(0, 80)}…
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 mt-0.5">
                  <button type="button" onClick={handleBack} className={ghostBtn}>← Back</button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl border-none cursor-pointer transition-all duration-150 hover:-translate-y-px hover:shadow-lg hover:shadow-red-600/25 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="spin-loader inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
                        Creating…
                      </>
                    ) : 'Sign Up'}
                  </button>
                </div>
              </form>
            )}

            {/* Footer */}
            <div className="mt-5 text-center">
              <Link
                to="/login"
                className="text-sm text-stone-400 hover:text-stone-600 transition-colors duration-150"
              >
                Already have an account?{' '}
                <span className="font-bold text-red-600 hover:text-red-500">Sign in</span>
              </Link>
            </div>

            <p className="mt-3 text-center text-stone-300 text-xs leading-relaxed">
              For life-threatening emergencies always call{' '}
              <strong className="text-red-600">112</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;