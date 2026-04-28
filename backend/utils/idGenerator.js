const Counter = require('../models/Counter');

// ── getNextSequence ───────────────────────────────────────────────────────────
// Atomically increments the counter for `name` and returns the new value.
// Uses upsert so the document is created on first call — no manual seeding needed.
// ─────────────────────────────────────────────────────────────────────────────
const getNextSequence = async (name) => {
  const result = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
};

// ── generateRequestId ─────────────────────────────────────────────────────────
// Returns a human-readable public request ID, e.g. HL-REQ-000001
// ─────────────────────────────────────────────────────────────────────────────
const generateRequestId = async () => {
  const seq = await getNextSequence('requestId');
  return `HL-REQ-${String(seq).padStart(6, '0')}`;
};

// ── generateGuestId ───────────────────────────────────────────────────────────
// Returns a human-readable guest ID, e.g. HL-GUEST-000001
// ─────────────────────────────────────────────────────────────────────────────
const generateGuestId = async () => {
  const seq = await getNextSequence('guestId');
  return `HL-GUEST-${String(seq).padStart(6, '0')}`;
};

module.exports = { getNextSequence, generateRequestId, generateGuestId };