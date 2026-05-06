/**
 * REPLACEMENT for frontend/src/components/AftercareButton.jsx
 *
 * WHAT CHANGED vs the existing file:
 *
 *   1. For REGISTERED USERS, instead of redirecting to /aftercare/my?uid=...,
 *      this now redirects to /onboarding/helplink on UniCare, passing the user's
 *      email + name as URL params. UniCare then performs the conditional
 *      onboarding (find-or-create account, auto-login).
 *
 *   2. For GUEST USERS, the flow is unchanged — redirects to
 *      /aftercare/by-request/:requestId?guestId=...
 *      (guests do not need a UniCare account for that page)
 *
 *   3. All existing styling, modal logic, and API call are preserved.
 *
 * NO OTHER FILES in HelpLink need to change.
 * ──────────────────────────────────────────────────────────────────
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
        // ── GUEST: unchanged redirect to guest aftercare page ─────────────
        const guestId = localStorage.getItem('guestId') || '';
        const qs      = guestId ? `?guestId=${encodeURIComponent(guestId)}` : '';
        window.location.href = `${UNICARE_BASE_URL}/aftercare/by-request/${data.requestId}${qs}`;

      } else {
        // ── REGISTERED: redirect to UniCare onboarding/helplink ───────────
        // UniCare will find-or-create the account and auto-login the user.
        const params = new URLSearchParams();

        // Pass email so UniCare can find/create the account
        const email = user?.email || '';
        if (email) params.set('email', email);

        // Pass name for account creation fallback
        const name = user?.name || user?.fullName || '';
        if (name) params.set('name', name);

        // Pass requestId to link recovery data
        if (data.requestId) params.set('requestId', String(data.requestId));

        // Pass incident info for the transfer payload
        // These are populated if available in the response
        if (data.incidentType) params.set('incident', data.incidentType);
        if (data.summary)      params.set('summary',  data.summary);

        window.location.href = `${UNICARE_BASE_URL}/onboarding/helplink?${params.toString()}`;
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