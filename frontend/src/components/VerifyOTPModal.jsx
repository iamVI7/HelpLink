import React, { useState, useEffect, useRef } from 'react';
import { sendOTP, verifyOTP } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ── Tiny countdown hook ───────────────────────────────────────────────────────
const useCountdown = (seconds) => {
  const [remaining, setRemaining] = useState(0);
  const start = () => setRemaining(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [remaining]);
  return { remaining, start };
};

// ── OTP digit input ────────────────────────────────────────────────────────────
const OtpInput = ({ value, onChange, disabled }) => {
  const digits = (value + '      ').slice(0, 6).split('');
  const refs = Array.from({ length: 6 }, () => useRef(null));

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      const next = value.slice(0, idx) + value.slice(idx + 1);
      onChange(next);
      if (idx > 0) refs[idx - 1].current?.focus();
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    const next = (value + e.key).slice(0, 6);
    onChange(next.slice(0, idx) + e.key + value.slice(idx + 1));
    if (idx < 5) refs[idx + 1].current?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    refs[Math.min(pasted.length, 5)].current?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          disabled={disabled}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={i === 0 ? handlePaste : undefined}
          onChange={() => {}}
          onClick={() => refs[i].current?.select()}
          style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          className={[
            'w-10 h-12 text-center text-lg font-semibold rounded-xl border-2 outline-none transition-all duration-150',
            disabled
              ? 'bg-stone-50 text-stone-300 border-stone-100 cursor-not-allowed'
              : d.trim()
                ? 'border-red-500 bg-white text-stone-900'
                : 'border-stone-200 bg-white text-stone-900 focus:border-red-400',
          ].join(' ')}
        />
      ))}
    </div>
  );
};

// ── Main Modal ─────────────────────────────────────────────────────────────────
const VerifyOTPModal = ({ onClose }) => {
  const { user, refreshUser } = useAuth();

  const [step, setStep]       = useState('phone'); // 'phone' | 'otp' | 'success'
  const [phone, setPhone]     = useState(user?.phoneNumber || '');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const { remaining, start: startCountdown } = useCountdown(60);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSendOTP = async () => {
    setError('');
    if (!/^[0-9]{10}$/.test(phone.trim())) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    try {
      await sendOTP(phone.trim());
      setStep('otp');
      startCountdown();
      toast.success('OTP sent! Check the server console.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      await verifyOTP(phone.trim(), otp);
      await refreshUser();
      setStep('success');
      toast.success("Phone verified! You're now trusted. ✔");
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect OTP. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (remaining > 0) return;
    setOtp('');
    setError('');
    setLoading(true);
    try {
      await sendOTP(phone.trim());
      startCountdown();
      toast.success('OTP resent!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabel =
    step === 'phone' ? 'STEP 1 OF 2' :
    step === 'otp'   ? 'STEP 2 OF 2' :
                       'VERIFIED';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');

        .vmodal-backdrop {
          animation: vBackdropIn 0.2s ease both;
        }
        @keyframes vBackdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        .vmodal-card {
          animation: vCardIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes vCardIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.97); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        .vmodal-step {
          animation: vStepIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes vStepIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .vmodal-success-icon {
          animation: vSuccessPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes vSuccessPop {
          from { transform: scale(0.4); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }

        .vmodal-serif { font-family: 'DM Serif Display', Georgia, serif; }
        .vmodal-sans  { font-family: 'DM Sans', 'Helvetica Neue', sans-serif; }

        .vmodal-btn-primary {
          position: relative;
          overflow: hidden;
          transition: all 0.15s ease;
        }
        .vmodal-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(220, 38, 38, 0.3);
        }
        .vmodal-btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="vmodal-backdrop fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Card — matches the confirm-action modal proportions */}
      <div
        className="vmodal-card vmodal-sans fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70]
                   w-[calc(100%-1.5rem)] max-w-sm
                   bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden"
      >

        {/* ── STEP: Phone ── */}
        {step === 'phone' && (
          <div className="vmodal-step px-7 py-7">
            {/* Label */}
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500 mb-3">
              Verify Account
            </p>

            {/* Heading */}
            <p className="vmodal-serif text-[1.45rem] leading-tight text-stone-900 mb-2">
              Confirm your phone number
            </p>

            {/* Body */}
            <p className="text-sm text-stone-400 leading-relaxed mb-6">
              We'll send a 6-digit code to verify your identity and add a{' '}
              <span className="text-stone-600 font-medium">Verified</span> badge to your profile.
            </p>

            {/* Phone field */}
            <div className="flex items-center gap-2 mb-2">
              <div className="vmodal-sans px-3 py-2.5 text-sm font-semibold text-stone-500 bg-stone-50 border border-stone-200 rounded-xl whitespace-nowrap select-none">
                +91
              </div>
              <input
                type="tel"
                value={phone}
                disabled
                placeholder="10-digit number"
                maxLength={10}
                className="vmodal-sans flex-1 min-w-0 px-3.5 py-2.5 text-sm font-medium text-stone-800
                           border border-stone-200 rounded-xl outline-none
                           focus:border-red-400 focus:ring-2 focus:ring-red-100
                           disabled:bg-stone-50 disabled:text-stone-500 disabled:cursor-not-allowed
                           transition-all"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={onClose}
                className="vmodal-sans flex-1 py-2.5 text-xs font-semibold tracking-wide text-stone-500
                           border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendOTP}
                disabled={loading || phone.length !== 10}
                className="vmodal-btn-primary vmodal-sans flex-1 py-2.5 text-xs font-bold uppercase tracking-widest
                           rounded-full bg-red-600 text-white
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Sending…
                    </span>
                  : 'Send OTP'
                }
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: OTP entry ── */}
        {step === 'otp' && (
          <div className="vmodal-step px-7 py-7">
            {/* Label */}
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500 mb-3">
              Enter Code
            </p>

            {/* Heading */}
            <p className="vmodal-serif text-[1.45rem] leading-tight text-stone-900 mb-2">
              Check your messages
            </p>

            {/* Body */}
            <p className="text-sm text-stone-400 leading-relaxed mb-1">
              A 6-digit code was sent to{' '}
              <span className="text-stone-700 font-semibold">+91 {phone}</span>.
            </p>

            {/* Demo notice */}
            <p className="text-xs text-amber-600 font-medium mb-6">
              Demo mode — check the server console for the code.
            </p>

            {/* OTP boxes */}
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />

            {/* Error */}
            {error && (
              <p className="text-xs text-red-500 mt-3 font-medium flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="vmodal-sans flex-1 py-2.5 text-xs font-semibold tracking-wide text-stone-500
                           border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="vmodal-btn-primary vmodal-sans flex-1 py-2.5 text-xs font-bold uppercase tracking-widest
                           rounded-full bg-red-600 text-white
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Verifying…
                    </span>
                  : 'Verify'
                }
              </button>
            </div>

            {/* Resend */}
            <div className="flex justify-center mt-4">
              <button
                onClick={handleResend}
                disabled={remaining > 0 || loading}
                className={`vmodal-sans text-xs font-semibold transition-colors ${
                  remaining > 0
                    ? 'text-stone-300 cursor-default'
                    : 'text-red-500 hover:text-red-600'
                }`}
              >
                {remaining > 0 ? `Resend in ${remaining}s` : 'Resend code'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: Success ── */}
        {step === 'success' && (
          <div className="vmodal-step px-7 py-9 flex flex-col items-center text-center">
            {/* Icon */}
            <div className="vmodal-success-icon w-14 h-14 rounded-full bg-green-500 flex items-center justify-center mb-5 shadow-lg shadow-green-500/25">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Label */}
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500 mb-2">
              All Done
            </p>

            {/* Heading */}
            <p className="vmodal-serif text-[1.45rem] leading-tight text-stone-900 mb-2">
              You're verified!
            </p>

            {/* Body */}
            <p className="text-sm text-stone-400 leading-relaxed mb-7 max-w-[230px]">
              Your phone number has been confirmed. A{' '}
              <span className="text-stone-600 font-medium">Verified</span> badge now appears on your profile.
            </p>

            <button
              onClick={onClose}
              className="vmodal-btn-primary vmodal-sans w-full py-2.5 text-xs font-bold uppercase tracking-widest
                         rounded-full bg-stone-900 text-white hover:bg-stone-800"
            >
              Done
            </button>
          </div>
        )}

        {/* Footer */}
        {step !== 'success' && (
          <div className="px-7 py-3 border-t border-stone-100 bg-stone-50/60">
            <p className="vmodal-sans text-[10px] text-stone-400 text-center tracking-wide">
              🔒 Your number is never shared or sold.
            </p>
          </div>
        )}

      </div>
    </>
  );
};

export default VerifyOTPModal;