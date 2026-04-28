import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEmergencyProfile } from '../services/emergencyProfileService';

// ─────────────────────────────────────────────────────────────────────────────
// EmergencyProfilePrompt
//
// Two modes:
//
//  mode="soft"   — Soft banner shown after login on the dashboard.
//                  Dismissible via Skip. Stored in sessionStorage so it
//                  only shows once per session, not every page load.
//
//  mode="strong" — Modal shown before first request/SOS creation.
//                  Has [Fill Now] and [Skip Anyway] buttons.
//                  onSkip() must be provided — called when user skips.
//                  onComplete() called after profile saved (optional).
//
// Both modes:
//   • Never block the user
//   • Never show if profile already exists
//   • Never crash if API fails
// ─────────────────────────────────────────────────────────────────────────────

const SOFT_DISMISS_KEY = 'ep_soft_dismissed';

// ── Soft banner ───────────────────────────────────────────────────────────────
export const SoftPrompt = ({ onDismiss }) => {
  const navigate = useNavigate();

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border"
      style={{
        borderColor: 'rgba(220,38,38,0.2)',
        background: 'rgba(254,242,242,0.6)',
        fontFamily: "'DM Sans', sans-serif",
        animation: 'fadeUp 0.35s ease both',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-base shrink-0">🩺</span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-stone-800 leading-snug">
            Add your Emergency Info
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">
            Helps responders assist you faster. Takes 2 minutes.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate('/emergency-profile')}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all hover:shadow-md hover:shadow-red-600/20"
        >
          Set Up
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 border border-stone-200 text-stone-500 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-stone-50 transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

// ── Strong modal ──────────────────────────────────────────────────────────────
export const StrongPrompt = ({ onSkip, onComplete }) => {
  const navigate = useNavigate();

  const handleFillNow = () => {
    // Navigate to profile page; pass a callback intent via sessionStorage
    sessionStorage.setItem('ep_return_after_save', '1');
    navigate('/emergency-profile');
    onComplete?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(26,23,20,0.45)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="bg-white border border-stone-200 rounded-2xl w-full max-w-sm p-6 sm:p-8 shadow-2xl"
        style={{ animation: 'modalIn 0.18s ease both', fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.15)' }}
        >
          <span className="text-xl">🩺</span>
        </div>

        {/* Label */}
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-red-600 mb-2">
          Recommended
        </p>

        {/* Heading */}
        <h3
          className="text-xl text-stone-900 mb-2 leading-snug"
          style={{ fontFamily: "'DM Serif Display', Georgia, serif", letterSpacing: '-0.01em' }}
        >
          Add Emergency Info?
        </h3>

        {/* Body */}
        <p className="text-sm text-stone-400 leading-relaxed">
          Your blood group, allergies, and emergency contacts help responders act faster if something goes wrong. It only takes 2 minutes.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-7">
          <button
            onClick={onSkip}
            className="flex-1 px-4 py-2.5 border border-stone-200 text-stone-600 text-xs font-semibold tracking-wide uppercase rounded-xl hover:bg-stone-50 transition-colors"
          >
            Skip Anyway
          </button>
          <button
            onClick={handleFillNow}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold tracking-wide uppercase rounded-xl transition-all hover:shadow-lg hover:shadow-red-600/20"
          >
            Fill Now
          </button>
        </div>

        <p className="text-[10px] text-stone-300 text-center mt-4 tracking-wide">
          You can always update this from your profile settings.
        </p>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// useEmergencyProfilePrompt
//
// Hook that manages whether to show the soft or strong prompt.
// Usage:
//   const { showSoft, showStrong, dismissSoft, skipStrong, profileChecked } =
//     useEmergencyProfilePrompt(isAuthenticated);
// ─────────────────────────────────────────────────────────────────────────────
export const useEmergencyProfilePrompt = (isAuthenticated) => {
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasProfile,     setHasProfile]     = useState(false);
  const [softDismissed,  setSoftDismissed]  = useState(
    () => !!sessionStorage.getItem(SOFT_DISMISS_KEY)
  );
  const [strongVisible,  setStrongVisible]  = useState(false);

  // Check once when user logs in
  useEffect(() => {
    if (!isAuthenticated) {
      setProfileChecked(false);
      setHasProfile(false);
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        const profile = await getEmergencyProfile();
        if (!cancelled) {
          const exists = !!(
            profile &&
            (profile.bloodGroup ||
              profile.allergies?.length ||
              profile.medicalConditions?.length ||
              profile.emergencyContacts?.length)
          );
          setHasProfile(exists);
        }
      } catch {
        // silently ignore — don't show prompt on API errors
        if (!cancelled) setHasProfile(true);
      } finally {
        if (!cancelled) setProfileChecked(true);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const dismissSoft = () => {
    sessionStorage.setItem(SOFT_DISMISS_KEY, '1');
    setSoftDismissed(true);
  };

  const showStrongPrompt = () => setStrongVisible(true);
  const skipStrong       = () => setStrongVisible(false);

  // Soft: show after login if no profile yet and not dismissed this session
  const showSoft =
    profileChecked && !hasProfile && !softDismissed && isAuthenticated;

  // Strong: controlled externally via showStrongPrompt()
  const showStrong =
    profileChecked && !hasProfile && strongVisible && isAuthenticated;

  return {
    profileChecked,
    hasProfile,
    showSoft,
    showStrong,
    dismissSoft,
    showStrongPrompt,
    skipStrong,
    markProfileFilled: () => setHasProfile(true),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Default export — combined controller component (optional convenience wrapper)
// ─────────────────────────────────────────────────────────────────────────────
const EmergencyProfilePrompt = ({ mode = 'soft', onSkip, onComplete, onDismiss }) => {
  if (mode === 'strong') {
    return <StrongPrompt onSkip={onSkip} onComplete={onComplete} />;
  }
  return <SoftPrompt onDismiss={onDismiss} />;
};

export default EmergencyProfilePrompt;