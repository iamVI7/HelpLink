/**
 * AftercareButton.jsx
 *
 * FIX: Passes userId as ?uid= query param in the redirect URL instead of
 * relying on localStorage timing across origins. localStorage.setItem in
 * HelpLink is not reliably read by UniCare before the page loads.
 *
 * Guest flow is completely unchanged.
 */

import React, { useState } from 'react';
import { sendToAftercare } from '../services/api';
import AftercareConsentModal from './AftercareConsentModal';
import { useAuth } from '../context/AuthContext';

const UNICARE_BASE_URL = import.meta.env.VITE_UNICARE_URL || 'http://localhost:3000';

const AftercareButton = ({ requestId, isGuest = false, style = {} }) => {
  const { user } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const handleButtonClick = () => {
    if (!requestId) return;
    setError(null);
    setModalOpen(true);
  };

  const buildPayload = (consent, userNote) => ({
    consent: {
      incident:  true,
      location:  consent.location,
      contact:   consent.contact,
      anonymous: consent.anonymous,
    },
    ...(userNote && { userNote }),
    anonymous: consent.anonymous,
  });

  const handleConsentSubmit = async (consent, userNote) => {
    setLoading(true);
    setError(null);

    try {
      const payload = buildPayload(consent, userNote);
      const res     = await sendToAftercare(requestId, payload);
      const data    = res.data;

      setModalOpen(false);

      if (data.isGuest) {
        // ── Guest: redirect with guestId query param (unchanged) ──────────
        const guestId = localStorage.getItem('guestId') || '';
        const qs      = guestId ? `?guestId=${encodeURIComponent(guestId)}` : '';
        window.location.href = `${UNICARE_BASE_URL}/aftercare/by-request/${data.requestId}${qs}`;
      } else {
        // ── Logged-in user: pass userId in URL so UniCare can scope fetch ──
        // Using URL param is reliable — no localStorage timing issues across
        // different origins/ports.
        const userId = user?._id || user?.id || '';
        const qs     = userId ? `?uid=${encodeURIComponent(String(userId))}` : '';
        window.location.href = `${UNICARE_BASE_URL}/aftercare/my${qs}`;
      }

    } catch (err) {
      console.error('Aftercare error:', err);
      setError('Could not connect to aftercare. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.5rem' }}>
        <button
          onClick={handleButtonClick}
          disabled={!requestId}
          style={{
            display:       'inline-flex',
            alignItems:    'center',
            gap:           '0.55rem',
            padding:       '11px 26px',
            borderRadius:  '999px',
            background:    'linear-gradient(135deg, #15803d, #16a34a)',
            border:        'none',
            color:         '#fff',
            fontSize:      '0.78rem',
            fontWeight:    700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            cursor:        requestId ? 'pointer' : 'default',
            opacity:       requestId ? 1 : 0.6,
            boxShadow:     '0 6px 20px rgba(21,128,61,0.28)',
            transition:    'all 0.18s ease',
            fontFamily:    "'Outfit', sans-serif",
            ...style,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0 }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Continue to Aftercare
        </button>

        {error && (
          <p style={{ fontSize:'0.65rem', color:'#dc2626', margin:0, fontWeight:500, textAlign:'center', maxWidth:260 }}>
            ⚠️ {error}
          </p>
        )}
      </div>

      <AftercareConsentModal
        isOpen={modalOpen}
        isGuest={isGuest}
        onClose={() => !loading && setModalOpen(false)}
        onSubmit={handleConsentSubmit}
        loading={loading}
      />
    </>
  );
};

export default AftercareButton;