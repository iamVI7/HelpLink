const mongoose = require('mongoose');

// ── Counter Model ─────────────────────────────────────────────────────────────
// Stores the last-used sequence number for each named counter.
// _id is a human-readable string key (e.g. "requestId", "guestId").
// This collection is upserted atomically — safe for concurrent requests.
// ─────────────────────────────────────────────────────────────────────────────

const counterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model('Counter', counterSchema);