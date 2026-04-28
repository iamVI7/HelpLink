// ─────────────────────────────────────────────────────────────
// utils/otpStore.js  — In-memory OTP store (no Redis required)
// Structure: Map { phoneNumber → { otp, expiresAt } }
// ─────────────────────────────────────────────────────────────

const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate and store a 6-digit OTP for the given phone number.
 * Overwrites any existing OTP for the same number.
 */
const generateOTP = (phoneNumber) => {
  if (otpStore.has(phoneNumber)) {
  const record = otpStore.get(phoneNumber);

  if (Date.now() < record.expiresAt) {
    return record.otp;
  }

  // expired → delete
  otpStore.delete(phoneNumber);
}
  // ✅ Generate new OTP
const otp = Math.floor(100000 + Math.random() * 900000).toString();

const expiresAt = Date.now() + OTP_TTL_MS;
otpStore.set(phoneNumber, { otp, expiresAt });

return otp;
};

/**
 * Verify the OTP for a phone number.
 * Returns { valid: true } or { valid: false, reason: string }
 */
const verifyOTP = (phoneNumber, inputOtp) => {
  const record = otpStore.get(phoneNumber);

  if (!record) {
    return { valid: false, reason: 'No OTP found for this number. Please request a new one.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phoneNumber);
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }

  if (record.otp !== inputOtp.toString().trim()) {
    return { valid: false, reason: 'Invalid OTP. Please try again.' };
  }

  // ✅ Valid — clean up immediately (one-time use)
  otpStore.delete(phoneNumber);
  return { valid: true };
};

/**
 * Clear expired entries periodically (prevents memory leak in long-running server).
 * Runs every 10 minutes.
 */
setInterval(() => {
  const now = Date.now();
  for (const [phone, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(phone);
    }
  }
}, 10 * 60 * 1000);

module.exports = { generateOTP, verifyOTP, otpStore };