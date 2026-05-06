/**
 * AftercareConsentModal.jsx
 *
 * FIX: Renders via ReactDOM.createPortal into document.body so that
 * position:fixed is never clipped by a parent with CSS transform/filter
 * (which is present in TrackingPage and GuestTracking animations).
 *
 * UI restyled to match Dashboard design system:
 *   – Fonts: Fraunces (headings) + DM Sans (body), matching dashboard imports
 *   – Palette: stone/warm neutrals (#f7f5f2, #1c1917, #f5f3f0) matching dashboard
 *   – CheckRows: content-card style with #f7f5f2 bg, stone borders, same hover
 *   – Buttons: action-pill style (uppercase, tracked, pill radius) — green preserved
 *   – Textarea: matches dashboard input aesthetics
 *   – Animation: slideUp/cardIn matching dashboard entrance animations
 *   – Backdrop: consistent with dashboard overlay patterns
 *
 * All props and functionality are unchanged.
 *
 * Props:
 *   isOpen   {boolean}   – controls visibility
 *   isGuest  {boolean}   – shows anonymous checkbox for guests
 *   onClose  {function}  – called on Cancel / backdrop click
 *   onSubmit {function}  – called with (consent, userNote) on confirm
 *   loading  {boolean}   – spinner on submit button while API is in flight
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const AftercareConsentModal = ({ isOpen, isGuest, onClose, onSubmit, loading }) => {
  const [consent, setConsent] = useState({
    incident:  true,
    location:  true,
    contact:   true,
    anonymous: false,
  });
  const [userNote, setUserNote] = useState('');

  // Reset state every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setConsent({ incident: true, location: true, contact: true, anonymous: false });
      setUserNote('');
    }
  }, [isOpen]);

  const toggle = (key) => {
    if (key === 'incident') return; // required — cannot be unchecked
    setConsent(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = () => onSubmit(consent, userNote.trim());

  // ── Don't render anything if closed ──────────────────────────────────────
  if (!isOpen) return null;

  // ── Portal target — always document.body ─────────────────────────────────
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!portalTarget) return null;

  const modalContent = (
    <>
      {/* ── Google Fonts — same import as Dashboard ──────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes acm_fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes acm_cardIn {
          from { opacity: 0; transform: translate(-50%, -47%) scale(0.97); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes acm_spin {
          to { transform: rotate(360deg); }
        }
        @keyframes acm_pulse {
          0%,100% { border-color: rgba(21,128,61,0.25); }
          50%      { border-color: rgba(21,128,61,0.5); }
        }

        .acm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(28, 25, 23, 0.6);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          z-index: 2147483646;
          animation: acm_fadeIn 0.2s ease both;
        }

        .acm-card {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2147483647;
          width: min(94vw, 460px);
          max-height: 90vh;
          overflow-y: auto;
          background: #ffffff;
          border-radius: 24px;
          padding: 2rem 2rem 1.75rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 24px 64px rgba(0,0,0,0.14);
          border: 1px solid rgba(0,0,0,0.05);
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
          color: #1c1917;
          animation: acm_cardIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        /* Scrollbar — matches .right-sticky in dashboard */
        .acm-card::-webkit-scrollbar { width: 4px; }
        .acm-card::-webkit-scrollbar-track { background: transparent; margin: 8px 0; }
        .acm-card::-webkit-scrollbar-thumb { background: transparent; border-radius: 10px; }
        .acm-card:hover::-webkit-scrollbar-thumb { background: #ddd8d2; }

        .acm-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 13px;
          border-radius: 100px;
          border: 1px solid rgba(21,128,61,0.3);
          color: #15803d;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          background: rgba(240,253,244,0.7);
          animation: acm_pulse 2.4s ease-in-out infinite;
        }

        .acm-title {
          font-family: 'Fraunces', Georgia, serif;
          font-size: clamp(1.3rem, 4vw, 1.65rem);
          font-weight: 600;
          line-height: 1.15;
          letter-spacing: -0.015em;
          color: #1c1917;
          margin: 0.5rem 0 0.35rem;
        }

        .acm-subtitle {
          font-size: 0.8rem;
          color: #78716c;
          margin: 0 0 1.4rem;
          line-height: 1.65;
        }

        /* CheckRow — content-card style matching dashboard */
        .acm-check-row {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          padding: 0.75rem 0.9rem;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.07);
          cursor: pointer;
          transition: background 0.14s, border-color 0.14s;
          user-select: none;
        }
        .acm-check-row.checked {
          background: rgba(240,253,244,0.7);
          border-color: rgba(74,222,128,0.35);
        }
        .acm-check-row.unchecked {
          background: #f7f5f2;
          border-color: rgba(0,0,0,0.07);
        }
        .acm-check-row.unchecked:hover {
          background: #f0ece8;
        }
        .acm-check-row.required {
          cursor: default;
        }
        .acm-check-row.purple.checked {
          background: rgba(245,243,255,0.7);
          border-color: rgba(124,58,237,0.25);
        }

        .acm-check-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #1c1917;
          margin: 0;
          line-height: 1.3;
        }
        .acm-check-sub {
          font-size: 0.7rem;
          color: #78716c;
          margin: 2px 0 0;
          line-height: 1.5;
        }
        .acm-required-tag {
          font-size: 0.6rem;
          color: #a8a29e;
          font-weight: 400;
          margin-left: 6px;
          text-transform: none;
          letter-spacing: 0;
        }

        /* Section label — matches dashboard SectionLabel */
        .acm-section-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #78716c;
          display: block;
          margin-bottom: 0.4rem;
        }

        /* Textarea — matches dashboard input aesthetic */
        .acm-textarea {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.1);
          padding: 0.75rem 0.9rem;
          font-size: 0.8rem;
          color: #1c1917;
          resize: none;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          box-sizing: border-box;
          background: #f7f5f2;
          line-height: 1.65;
          transition: border-color 0.15s, background 0.15s;
        }
        .acm-textarea::placeholder { color: #a8a29e; }
        .acm-textarea:focus {
          border-color: rgba(21,128,61,0.4);
          background: #ffffff;
        }

        /* Buttons — action-pill style from dashboard */
        .acm-btn {
          flex: 1;
          padding: 11px 0;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          cursor: pointer;
          border: none;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.16s, box-shadow 0.16s, transform 0.1s, opacity 0.15s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }
        .acm-btn-cancel {
          background: #f7f5f2;
          border: 1px solid rgba(0,0,0,0.1);
          color: #78716c;
        }
        .acm-btn-cancel:hover:not(:disabled) {
          background: #ede9e4;
          color: #44403c;
        }
        .acm-btn-cancel:active:not(:disabled) { transform: scale(0.98); }
        .acm-btn-submit {
          background: linear-gradient(135deg, #15803d, #16a34a);
          color: #fff;
          box-shadow: 0 4px 14px rgba(21,128,61,0.28);
        }
        .acm-btn-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #166534, #15803d);
          box-shadow: 0 6px 20px rgba(21,128,61,0.36);
          transform: translateY(-1px);
        }
        .acm-btn-submit:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
        .acm-btn-submit:disabled {
          background: rgba(21,128,61,0.5);
          box-shadow: none;
          cursor: default;
        }
        .acm-btn-cancel:disabled { opacity: 0.5; cursor: default; }

        /* Divider — matches dashboard footer hr */
        .acm-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #ddd8d2 30%, #ddd8d2 70%, transparent);
          margin: 1.4rem 0 1.5rem;
        }
      `}</style>

      {/* ── Backdrop ──────────────────────────────────────────────────── */}
      <div
        className="acm-backdrop"
        onClick={loading ? undefined : onClose}
      />

      {/* ── Modal card ────────────────────────────────────────────────── */}
      <div
        className="acm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="acm-title"
      >
        {/* Badge — mirrors dashboard-badge pattern */}
        <div style={{ marginBottom: '0.9rem' }}>
          <span className="acm-badge">Aftercare</span>
        </div>

        {/* Title — Fraunces, same as dashboard h1 */}
        <h2 id="acm-title" className="acm-title">
          Choose what{' '}
          <span style={{ color: '#15803d', fontStyle: 'italic' }}>to share.</span>
        </h2>
        <p className="acm-subtitle">
          Your aftercare team will only receive the information you select below.
        </p>

        {/* ── Checkboxes ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1.25rem' }}>
          <CheckRow
            checked={consent.incident}
            onChange={() => toggle('incident')}
            label="Incident details"
            sub="Type and description of the emergency"
            required
          />
          <CheckRow
            checked={consent.location}
            onChange={() => toggle('location')}
            label="Location"
            sub="GPS coordinates at the time of the SOS"
          />
          <CheckRow
            checked={consent.contact}
            onChange={() => toggle('contact')}
            label="Contact info"
            sub="Name visible to the aftercare team"
          />
          {isGuest && (
            <CheckRow
              checked={consent.anonymous}
              onChange={() => toggle('anonymous')}
              label="Stay anonymous"
              sub="Your name will not be shared"
              accent="#7c3aed"
              purple
            />
          )}
        </div>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div className="acm-divider" />

        {/* ── Textarea ────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="acm-section-label" htmlFor="acm-note">
            Add a note{' '}
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
          </label>
          <textarea
            id="acm-note"
            className="acm-textarea"
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            maxLength={200}
            placeholder="e.g. I have a nut allergy, or I may need follow-up support…"
            rows={3}
          />
          <p style={{ fontSize: '0.6rem', color: '#a8a29e', textAlign: 'right', margin: '0.25rem 0 0' }}>
            {userNote.length}/200
          </p>
        </div>

        {/* ── Buttons ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="acm-btn acm-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="acm-btn acm-btn-submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: 'acm_spin 0.85s linear infinite', flexShrink: 0 }}
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                </svg>
                Sending…
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                Continue to Aftercare
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );

  // ── Render into document.body via portal ──────────────────────────────────
  return createPortal(modalContent, portalTarget);
};

// ── CheckRow sub-component ────────────────────────────────────────────────────
const CheckRow = ({ checked, onChange, label, sub, required = false, accent = '#15803d', purple = false }) => (
  <label
    className={[
      'acm-check-row',
      checked ? 'checked' : 'unchecked',
      required ? 'required' : '',
      purple ? 'purple' : '',
    ].join(' ')}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={required}
      style={{
        marginTop: 3,
        accentColor: accent,
        flexShrink: 0,
        cursor: required ? 'default' : 'pointer',
      }}
    />
    <div>
      <p className="acm-check-label">
        {label}
        {required && <span className="acm-required-tag">required</span>}
      </p>
      <p className="acm-check-sub">{sub}</p>
    </div>
  </label>
);

export default AftercareConsentModal;