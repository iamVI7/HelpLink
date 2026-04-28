/**
 * AftercareButton.jsx
 *
 * Reusable "Continue to Aftercare" button used in both:
 *   - TrackingPage      (logged-in users)
 *   - GuestTracking     (guest users)
 *
 * Behaviour:
 *   1. Calls POST /api/requests/:id/aftercare  (backend decides payload based on auth)
 *   2. On success, redirects to UniCare aftercare page
 *   3. Shows a loading spinner while the request is in flight
 *   4. Shows an inline error message if the request fails (does NOT crash the page)
 *
 * Props:
 *   requestId  {string}  – MongoDB _id of the completed request
 *   style      {object}  – optional extra inline styles for the wrapper button
 */

import React, { useState } from 'react';
import { sendToAftercare } from '../services/api';

const UNICARE_AFTERCARE_URL = 'http://localhost:3000/aftercare';

const AftercareButton = ({ requestId, style = {} }) => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleAftercare = async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);

    try {
      await sendToAftercare(requestId);
      // Redirect to UniCare — hard navigate so UniCare gets a clean page load
      window.location.href = UNICARE_AFTERCARE_URL;
    } catch (err) {
      console.error('Aftercare error:', err);
      setError('Could not connect to aftercare. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <button
        onClick={handleAftercare}
        disabled={loading || !requestId}
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          gap:            '0.55rem',
          padding:        '11px 26px',
          borderRadius:   '999px',
          background:     loading
            ? 'rgba(21,128,61,0.55)'
            : 'linear-gradient(135deg, #15803d, #16a34a)',
          border:         'none',
          color:          '#fff',
          fontSize:       '0.78rem',
          fontWeight:     700,
          textTransform:  'uppercase',
          letterSpacing:  '0.12em',
          cursor:         loading ? 'default' : 'pointer',
          opacity:        loading ? 0.75 : 1,
          boxShadow:      loading
            ? 'none'
            : '0 6px 20px rgba(21,128,61,0.28)',
          transition:     'all 0.18s ease',
          fontFamily:     "'Outfit', sans-serif",
          ...style,
        }}
      >
        {loading ? (
          <>
            {/* Tiny spinner */}
            <svg
              width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              style={{ animation: 'aftercare_spin 0.85s linear infinite', flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
            Connecting…
          </>
        ) : (
          <>
            {/* Heart-pulse icon */}
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Continue to Aftercare
          </>
        )}
      </button>

      {/* Inline error — small, non-intrusive */}
      {error && (
        <p style={{
          fontSize:   '0.65rem',
          color:      '#dc2626',
          margin:     0,
          fontWeight: 500,
          textAlign:  'center',
          maxWidth:   260,
        }}>
          ⚠️ {error}
        </p>
      )}

      {/* Keyframe injected once per mount — safe because it's idempotent */}
      <style>{`
        @keyframes aftercare_spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AftercareButton;