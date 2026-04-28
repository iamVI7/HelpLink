import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EmergencyProfileForm from '../components/EmergencyProfileForm';

// ─────────────────────────────────────────────────────────────────────────────
// EmergencyProfilePage
//
// Full-page layout for editing the emergency profile.
// Matches HelpLink's existing DM Sans + DM Serif Display aesthetic exactly.
// ─────────────────────────────────────────────────────────────────────────────

const EmergencyProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Ref passed down so the page can trigger validation on the form
  const formRef = useRef(null);

  const handleSaved = () => {
    // If user arrived here from the strong prompt, send them back
    const returnIntent = sessionStorage.getItem('ep_return_after_save');
    if (returnIntent) {
      sessionStorage.removeItem('ep_return_after_save');
      navigate(-1);
    }
    // Otherwise stay on page — form shows updated data on next load
  };

  return (
    <div
      className="min-h-screen pt-20 pb-16"
      style={{
        fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
        background: '#ffffff',
        position: 'relative',
      }}
    >
      {/* Grid background — matches all other pages */}
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

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes borderPulse {
          0%, 100% { border-color: rgba(220,38,38,0.3); }
          50%       { border-color: rgba(220,38,38,0.7); }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-5px); }
          40%       { transform: translateX(5px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }

        .fade-up   { animation: fadeUp 0.45s ease both; }
        .fade-up-1 { animation: fadeUp 0.45s 0.08s ease both; }
        .fade-up-2 { animation: fadeUp 0.45s 0.16s ease both; }
        .pulse-badge { animation: borderPulse 2s ease-in-out infinite; }

        /* ── Back button ── */
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 0;
          background: none;
          border: none;
          cursor: pointer;
          color: #78716c;
          transition: color 0.18s;
        }
        .back-btn:hover { color: #1a1714; }
        .back-btn:hover .back-circle {
          background: #f5f5f4;
          border-color: #d6d3d1;
        }
        .back-btn:active .back-circle {
          background: #e7e5e4;
          transform: scale(0.93);
        }
        .back-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1.5px solid #e7e5e4;
          background: #fafaf9;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.18s, border-color 0.18s, transform 0.12s;
        }
        .back-label {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        /* ── Validation error banner ── */
        .validation-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid rgba(220,38,38,0.25);
          background: rgba(220,38,38,0.04);
          margin-bottom: 20px;
          animation: shakeX 0.38s ease both;
        }
        .validation-banner-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          margin-top: 1px;
          color: #dc2626;
        }
        .validation-banner-text {
          font-size: 12px;
          color: #b91c1c;
          font-weight: 500;
          line-height: 1.5;
        }
        .validation-banner-title {
          font-weight: 700;
          display: block;
          margin-bottom: 1px;
        }

        /* ── Field-level error styling (injected via class) ── */
        .field-error input,
        .field-error textarea,
        .field-error select {
          border-color: #fca5a5 !important;
          background: rgba(220,38,38,0.03) !important;
        }
        .field-error-msg {
          font-size: 10px;
          color: #dc2626;
          font-weight: 600;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Hero header — matches CreateRequest style ── */}
        <section
          className="border-b border-stone-100 relative overflow-hidden mb-10"
          style={{ background: 'rgba(255,255,255,0.88)' }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              top: -100, right: -100, width: 400, height: 400,
              background: 'radial-gradient(circle, rgba(220,38,38,0.05) 0%, transparent 70%)',
            }}
          />

          <div className="relative max-w-3xl mx-auto px-6 md:px-12 py-12 md:py-14">

            {/* ── Back button + HelpLink badge — same row ── */}
            <div className="fade-up flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate(-1)}
                className="back-btn"
                aria-label="Go back"
              >
                <span className="back-circle">
                  <svg
                    width="14" height="14"
                    fill="none" stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 19l-7-7 7-7" />
                  </svg>
                </span>
                <span className="back-label">Back</span>
              </button>

              {/* Thin divider */}
              <span style={{ width: 1, height: 18, background: '#e7e5e4', display: 'inline-block', flexShrink: 0 }} aria-hidden="true" />

              <span
                className="pulse-badge uppercase text-[10px] font-bold tracking-[0.18em] px-3 py-1"
                style={{ border: '1px solid rgba(220,38,38,0.4)', color: '#dc2626' }}
              >
                HelpLink
              </span>
            </div>

            <div className="fade-up-1">
              <h1
                className="leading-none mb-3"
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                  color: '#1a1714',
                  letterSpacing: '-0.01em',
                }}
              >
                Emergency{' '}
                <span style={{ color: '#dc2626', fontStyle: 'italic' }}>Profile.</span>
              </h1>
              <p className="text-sm text-stone-400 leading-relaxed max-w-sm mt-2">
                This information helps responders assist you faster during emergencies.
                It is stored securely and shared only with your accepted helper.
              </p>
            </div>

            {/* Info pills */}
            <div className="fade-up-2 flex flex-wrap items-center gap-2 mt-5">
              {[
                { icon: '🔒', text: 'Secure & private' },
                { icon: '👁️', text: 'Shared with helper only' },
                { icon: '✏️', text: 'Update anytime' },
              ].map((p) => (
                <span
                  key={p.text}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-stone-200 bg-stone-50 text-[10px] font-semibold text-stone-500"
                >
                  <span>{p.icon}</span>
                  {p.text}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Form card ── */}
        <div className="max-w-3xl mx-auto px-6 md:px-12 fade-up-2">
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.15)' }}
                >
                  <span className="text-base">🩺</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 leading-snug">
                    {user?.name ? `${user.name.split(' ')[0]}'s` : 'Your'} Emergency Info
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Fill in as much or as little as you're comfortable sharing
                  </p>
                </div>
              </div>
            </div>

            {/* Form body */}
            <div className="px-6 sm:px-8 py-7">
              {/*
                Pass ref + onSaved down to EmergencyProfileForm.
                The form should call ref's validate() before submitting,
                and expose an imperative handle if needed — but validation
                can also live entirely inside the form. We expose the
                validationBannerSlot here so the banner renders above the form
                within the card for maximum visibility.
              */}
              <EmergencyProfileForm
                ref={formRef}
                onSaved={handleSaved}
                renderValidationBanner={({ hasError, errorFields }) =>
                  hasError ? (
                    <div className="validation-banner" role="alert" aria-live="assertive">
                      {/* Warning icon */}
                      <svg
                        className="validation-banner-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      <div className="validation-banner-text">
                        <span className="validation-banner-title">Entry required</span>
                        {errorFields && errorFields.length > 0
                          ? `Please fill in: ${errorFields.join(', ')}.`
                          : 'Please complete all required fields before saving.'}
                      </div>
                    </div>
                  ) : null
                }
              />
            </div>

          </div>

          {/* Footer note */}
          <p className="text-[10px] text-stone-300 text-center mt-6 tracking-wide leading-relaxed">
            Your profile is attached as a snapshot to each request you create.
            Updating it here does not change past requests — only future ones.
          </p>
        </div>

      </div>
    </div>
  );
};

export default EmergencyProfilePage;