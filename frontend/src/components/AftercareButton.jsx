/**
 * AftercareButton.jsx  — UPDATED
 *
 * CHANGES vs previous version:
 *   1. AftercareConsentModal's onSubmit now receives (consent, userNote, shareEmail).
 *      shareEmail=true  → user's registered email is passed to UniCare → full account created.
 *      shareEmail=false → email sent as null → UniCare creates temp guest account.
 *   2. For REGISTERED users, the redirect now goes to /onboarding/helplink on UniCare
 *      WITH or WITHOUT email based on shareEmail consent.
 *   3. Guest flow is completely unchanged.
 *   4. All existing styling, modal logic preserved.
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

  const buildPayload = (consent, userNote, shareEmail) => ({
    consent: {
      incident:   true,
      location:   consent.location,
      contact:    consent.contact,
      anonymous:  consent.anonymous,
    },
    ...(userNote && { userNote }),
    anonymous:  consent.anonymous,
    // Tell HelpLink backend whether to include the registered email in the
    // payload forwarded to UniCare. Backend checks this flag.
    shareEmail: shareEmail,
  });

  /**
   * onSubmit now receives a third arg: shareEmail (boolean)
   *   true  → include real email → UniCare creates/matches real account
   *   false → send email=null → UniCare creates temp guest account
   */
  const handleConsentSubmit = async (consent, userNote, shareEmail) => {
    setLoading(true);
    setError(null);

    try {
      const payload = buildPayload(consent, userNote, shareEmail);
      const res     = await sendToAftercare(requestId, payload);
      const data    = res.data;

      setModalOpen(false);

      if (data.isGuest || !shareEmail) {
        // ── GUEST or registered-but-opted-out-of-email → guest UniCare flow ──
        // For registered users who unchecked email, we redirect to the onboarding
        // page WITHOUT an email param. UniCare will create a temp guest account.
        if (isGuest) {
          // Pure guest: go to the read-only guest aftercare page
          const guestId = localStorage.getItem('guestId') || '';
          const qs      = guestId ? `?guestId=${encodeURIComponent(guestId)}` : '';
          window.location.href = `${UNICARE_BASE_URL}/aftercare/by-request/${data.requestId}${qs}`;
        } else {
          // Registered user who declined to share email → create guest account on UniCare
          const params = new URLSearchParams();
          const name   = user?.name || user?.fullName || '';
          if (name)           params.set('name',      name);
          if (data.requestId) params.set('requestId', String(data.requestId));
          if (data.incidentType) params.set('incident', data.incidentType);
          if (data.summary)      params.set('summary',  data.summary);
          // No email → UniCare will create a guest account and show credentials
          window.location.href = `${UNICARE_BASE_URL}/onboarding/helplink?${params.toString()}`;
        }

      } else {
        // ── REGISTERED + email consent given → full account flow ──────────
        const params = new URLSearchParams();
        const email  = user?.email || '';
        if (email)          params.set('email',     email);
        const name   = user?.name || user?.fullName || '';
        if (name)           params.set('name',      name);
        if (data.requestId) params.set('requestId', String(data.requestId));
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
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
          <p style={{ fontSize: '0.65rem', color: '#dc2626', margin: 0, fontWeight: 500, textAlign: 'center', maxWidth: 260 }}>
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