/**
 * MedicalImportConsent.jsx
 *
 * Consent modal that appears ONLY for logged-in users AFTER they have been
 * redirected back to HelpLink (or are still on HelpLink) and explicitly choose
 * to share their medical profile with UniCare.
 *
 * PRIVACY RULES (enforced here):
 *   • Medical data is NEVER sent automatically.
 *   • The transfer only happens when the user clicks "Yes, share my profile".
 *   • Guest users never see this component (parent should guard with `user` check).
 *
 * Props:
 *   isOpen    {boolean}         – controls visibility
 *   onClose   {function}        – called when user dismisses / clicks No
 *   onSuccess {function}        – called after successful transfer (optional)
 */

import React, { useState } from 'react';
import { sendMedicalProfile } from '../services/api';

const MedicalImportConsent = ({ isOpen, onClose, onSuccess }) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const handleConfirm = async () => {
    setStatus('loading');
    setErrorMsg('');

    try {
      await sendMedicalProfile();
      setStatus('success');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Medical profile transfer error:', err);
      setErrorMsg(
        err?.response?.data?.message ||
        'Failed to send profile. Please try again.'
      );
      setStatus('error');
    }
  };

  const handleClose = () => {
    // Reset state so the modal is clean if reopened
    setStatus('idle');
    setErrorMsg('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        onClick={status === 'loading' ? undefined : handleClose}
        style={{
          position:        'fixed',
          inset:           0,
          background:      'rgba(0,0,0,0.45)',
          backdropFilter:  'blur(4px)',
          zIndex:          9998,
          animation:       'mc_fadeIn 0.2s ease both',
        }}
      />

      {/* ── Modal card ────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mc-title"
        style={{
          position:      'fixed',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%, -50%)',
          zIndex:        9999,
          width:         'min(92vw, 420px)',
          background:    'rgba(255,255,255,0.97)',
          borderRadius:  '1.75rem',
          padding:       '2rem 2rem 1.75rem',
          boxShadow:     '0 24px 80px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
          border:        '1px solid rgba(255,255,255,0.9)',
          fontFamily:    "'Outfit', 'Helvetica Neue', sans-serif",
          animation:     'mc_cardIn 0.28s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            width:        64,
            height:       64,
            borderRadius: '50%',
            background:   status === 'success'
              ? 'rgba(240,253,244,0.9)'
              : 'rgba(239,246,255,0.9)',
            border:       `1.5px solid ${status === 'success' ? 'rgba(74,222,128,0.4)' : 'rgba(59,130,246,0.3)'}`,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            fontSize:     '1.8rem',
          }}>
            {status === 'success' ? '✅' : status === 'error' ? '⚠️' : '🏥'}
          </div>
        </div>

        {/* ── SUCCESS STATE ──────────────────────────────────────────────── */}
        {status === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <h2 id="mc-title" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#15803d', marginBottom: '0.6rem' }}>
              Profile shared!
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.65, marginBottom: '1.5rem' }}>
              Your medical profile has been sent to UniCare securely. The aftercare team
              now has the information they need to support you.
            </p>
            <button
              onClick={handleClose}
              style={{
                padding:       '10px 28px',
                borderRadius:  '999px',
                background:    'linear-gradient(135deg, #15803d, #16a34a)',
                border:        'none',
                color:         '#fff',
                fontSize:      '0.75rem',
                fontWeight:    700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                cursor:        'pointer',
                boxShadow:     '0 4px 14px rgba(21,128,61,0.25)',
              }}
            >
              Done
            </button>
          </div>
        )}

        {/* ── DEFAULT / ERROR STATE ──────────────────────────────────────── */}
        {status !== 'success' && (
          <>
            <h2
              id="mc-title"
              style={{
                fontSize:    '1.15rem',
                fontWeight:  700,
                color:       '#111827',
                textAlign:   'center',
                marginBottom: '0.65rem',
                lineHeight:  1.3,
              }}
            >
              Import your medical profile?
            </h2>

            <p style={{
              fontSize:     '0.8rem',
              color:        '#6b7280',
              textAlign:    'center',
              lineHeight:   1.7,
              marginBottom: '0.5rem',
            }}>
              UniCare can provide better aftercare if they have access to your
              medical details — blood group, allergies, conditions, medications,
              and emergency contacts.
            </p>

            {/* Privacy note */}
            <div style={{
              display:       'flex',
              alignItems:    'flex-start',
              gap:           '0.5rem',
              padding:       '0.65rem 0.85rem',
              borderRadius:  '0.75rem',
              background:    'rgba(239,246,255,0.7)',
              border:        '1px solid rgba(59,130,246,0.18)',
              marginBottom:  '1.4rem',
            }}>
              <span style={{ fontSize: '0.85rem', flexShrink: 0, marginTop: 1 }}>🔒</span>
              <p style={{ fontSize: '0.68rem', color: '#3b82f6', margin: 0, lineHeight: 1.6 }}>
                Your data is sent securely and only used by UniCare for your
                aftercare. HelpLink does not store a copy of this transfer.
              </p>
            </div>

            {/* Error message */}
            {status === 'error' && errorMsg && (
              <p style={{
                fontSize:     '0.7rem',
                color:        '#dc2626',
                textAlign:    'center',
                marginBottom: '1rem',
                fontWeight:   500,
              }}>
                ⚠️ {errorMsg}
              </p>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {/* NO — decline */}
              <button
                onClick={handleClose}
                disabled={status === 'loading'}
                style={{
                  flex:          1,
                  padding:       '11px 0',
                  borderRadius:  '999px',
                  background:    'rgba(255,255,255,0.9)',
                  border:        '1px solid rgba(0,0,0,0.1)',
                  color:         '#6b7280',
                  fontSize:      '0.75rem',
                  fontWeight:    700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor:        status === 'loading' ? 'default' : 'pointer',
                  opacity:       status === 'loading' ? 0.5 : 1,
                  transition:    'background 0.15s',
                }}
              >
                No, skip
              </button>

              {/* YES — confirm */}
              <button
                onClick={handleConfirm}
                disabled={status === 'loading'}
                style={{
                  flex:          1,
                  padding:       '11px 0',
                  borderRadius:  '999px',
                  background:    status === 'loading'
                    ? 'rgba(37,99,235,0.55)'
                    : 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                  border:        'none',
                  color:         '#fff',
                  fontSize:      '0.75rem',
                  fontWeight:    700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor:        status === 'loading' ? 'default' : 'pointer',
                  boxShadow:     status === 'loading' ? 'none' : '0 4px 14px rgba(37,99,235,0.3)',
                  display:       'inline-flex',
                  alignItems:    'center',
                  justifyContent: 'center',
                  gap:           '0.45rem',
                  transition:    'all 0.15s',
                }}
              >
                {status === 'loading' ? (
                  <>
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5"
                      style={{ animation: 'mc_spin 0.85s linear infinite' }}
                    >
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  'Yes, share my profile'
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Scoped keyframes */}
      <style>{`
        @keyframes mc_fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes mc_cardIn  { from{opacity:0;transform:translate(-50%,-46%) scale(0.96)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
        @keyframes mc_spin    { to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
};

export default MedicalImportConsent;