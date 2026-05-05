import React, { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// CancelRequestModal
//
// Props:
//   isOpen      — boolean, controls visibility
//   onClose     — () => void, called when user dismisses without cancelling
//   onConfirm   — (reason: string) => Promise<void>, called with selected reason
//   isLoading   — boolean, shows spinner on confirm button while API call runs
// ─────────────────────────────────────────────────────────────────────────────

const REASONS = [
  { id: 'no_longer_needed',  emoji: '✅', label: 'I no longer need help' },
  { id: 'found_help',        emoji: '🏠', label: 'I found help on my own' },
  { id: 'too_slow',          emoji: '⏱️', label: "It's taking too long" },
  { id: 'wrong_request',     emoji: '❌', label: 'I made a mistake / wrong request' },
  { id: 'other',             emoji: '📝', label: 'Other' },
];

const CancelRequestModal = ({ isOpen, onClose, onConfirm, isLoading = false }) => {
  const [selected, setSelected]   = useState(null);
  const [otherText, setOtherText] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected(null);
      setOtherText('');
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape' && !isLoading) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isLoading, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleConfirm = useCallback(() => {
    if (!selected || isLoading) return;
    const reason = selected === 'other'
      ? (otherText.trim() || 'Other')
      : REASONS.find(r => r.id === selected)?.label || selected;
    onConfirm(reason);
  }, [selected, otherText, isLoading, onConfirm]);

  const canConfirm = selected !== null && (selected !== 'other' || otherText.trim().length > 0);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');

        @keyframes crm-backdrop-in { from{opacity:0} to{opacity:1} }
        @keyframes crm-sheet-in    { from{opacity:0;transform:translateY(32px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes crm-spin        { to{transform:rotate(360deg)} }

        .crm-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(4px);
          display: flex; align-items: flex-end; justify-content: center;
          animation: crm-backdrop-in 0.2s ease both;
          padding: 0;
        }
        @media (min-width: 480px) {
          .crm-backdrop { align-items: center; padding: 1rem; }
        }

        .crm-sheet {
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border-radius: 1.5rem 1.5rem 0 0;
          padding: 1.5rem 1.5rem 2rem;
          animation: crm-sheet-in 0.3s cubic-bezier(0.22,1,0.36,1) both;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04);
          font-family: 'Outfit', 'Helvetica Neue', sans-serif;
          box-sizing: border-box;
          max-height: 92vh;
          overflow-y: auto;
        }
        @media (min-width: 480px) {
          .crm-sheet { border-radius: 1.5rem; }
        }

        .crm-drag-handle {
          width: 40px; height: 4px;
          background: #e5e7eb; border-radius: 999px;
          margin: 0 auto 1.25rem;
        }
        @media (min-width: 480px) { .crm-drag-handle { display: none; } }

        .crm-reason-btn {
          width: 100%;
          display: flex; align-items: center; gap: 0.875rem;
          padding: 0.875rem 1rem;
          border-radius: 0.875rem;
          border: 1.5px solid #e5e7eb;
          background: #fff;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
          text-align: left;
        }
        .crm-reason-btn:hover:not(:disabled) {
          border-color: rgba(220,38,38,0.35);
          background: rgba(254,242,242,0.5);
        }
        .crm-reason-btn.selected {
          border-color: #dc2626;
          background: rgba(254,242,242,0.6);
          box-shadow: 0 0 0 3px rgba(220,38,38,0.1);
        }
        .crm-reason-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .crm-other-input {
          width: 100%; padding: 0.75rem 1rem;
          border: 1.5px solid #e5e7eb; border-radius: 0.75rem;
          background: #fff; color: #111827;
          font-size: 0.85rem; font-family: 'Outfit', sans-serif;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box; resize: none;
        }
        .crm-other-input:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.08);
        }
        .crm-other-input::placeholder { color: #9ca3af; }

        .crm-confirm-btn {
          width: 100%; padding: 0.9rem 1rem;
          background: #dc2626; color: #fff;
          border: none; border-radius: 0.875rem;
          font-size: 0.875rem; font-weight: 700;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s, transform 0.12s, opacity 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .crm-confirm-btn:hover:not(:disabled) {
          background: #b91c1c;
          box-shadow: 0 4px 16px rgba(220,38,38,0.35);
          transform: translateY(-1px);
        }
        .crm-confirm-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        .crm-dismiss-btn {
          width: 100%; padding: 0.75rem 1rem;
          background: transparent; color: #6b7280;
          border: 1.5px solid #e5e7eb; border-radius: 0.875rem;
          font-size: 0.85rem; font-weight: 500;
          font-family: 'Outfit', sans-serif;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .crm-dismiss-btn:hover:not(:disabled) {
          background: #f9fafb; border-color: #d1d5db;
        }
        .crm-dismiss-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      {/* Backdrop — clicking closes */}
      <div
        className="crm-backdrop"
        onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crm-title"
      >
        <div className="crm-sheet">
          {/* Drag handle — mobile affordance */}
          <div className="crm-drag-handle" />

          {/* Header */}
          <div style={{ marginBottom: '1.25rem' }}>
            {/* Icon */}
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(220,38,38,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '0.875rem',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>

            <h2
              id="crm-title"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.3rem', fontWeight: 700,
                color: '#111827', margin: '0 0 0.375rem',
                letterSpacing: '-0.02em', lineHeight: 1.2,
              }}
            >
              Cancel your request?
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.6 }}>
              Please let us know why you're cancelling. This helps us improve HelpLink.
            </p>
          </div>

          {/* Reason list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={isLoading}
                className={`crm-reason-btn${selected === r.id ? ' selected' : ''}`}
                onClick={() => setSelected(r.id)}
              >
                {/* Radio indicator */}
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${selected === r.id ? '#dc2626' : '#d1d5db'}`,
                  background: selected === r.id ? '#dc2626' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {selected === r.id && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                  )}
                </div>

                {/* Emoji */}
                <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>{r.emoji}</span>

                {/* Label */}
                <span style={{
                  fontSize: '0.875rem', fontWeight: selected === r.id ? 600 : 500,
                  color: selected === r.id ? '#111827' : '#374151',
                  transition: 'color 0.15s, font-weight 0.15s',
                }}>
                  {r.label}
                </span>
              </button>
            ))}
          </div>

          {/* "Other" free-text input — only shown when Other is selected */}
          {selected === 'other' && (
            <div style={{ marginBottom: '1rem', animation: 'crm-sheet-in 0.2s ease both' }}>
              <textarea
                className="crm-other-input"
                placeholder="Please describe your reason…"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                rows={3}
                maxLength={200}
                disabled={isLoading}
                autoFocus
              />
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.65rem', color: '#9ca3af', textAlign: 'right' }}>
                {otherText.length}/200
              </p>
            </div>
          )}

          {/* Warning note */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
            padding: '0.625rem 0.875rem',
            background: 'rgba(254,243,199,0.7)',
            border: '1px solid rgba(234,179,8,0.25)',
            borderRadius: '0.625rem',
            marginBottom: '1.25rem',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#92400e', lineHeight: 1.5 }}>
              This will notify nearby helpers to stop responding. This action cannot be undone.
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <button
              type="button"
              className="crm-confirm-btn"
              disabled={!canConfirm || isLoading}
              onClick={handleConfirm}
            >
              {isLoading ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ animation: 'crm-spin 0.85s linear infinite', flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                  </svg>
                  Cancelling…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Confirm Cancellation
                </>
              )}
            </button>

            <button
              type="button"
              className="crm-dismiss-btn"
              disabled={isLoading}
              onClick={onClose}
            >
              Keep my request active
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CancelRequestModal;