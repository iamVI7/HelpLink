const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// EmergencyProfile
//
// Stores per-user emergency metadata that gets snapshotted onto every request
// at creation time.  All fields are OPTIONAL — a missing or partial profile
// never blocks a request from being created.
//
// Relationship: one-to-one with User (userId is unique).
// ─────────────────────────────────────────────────────────────────────────────

const emergencyProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,           // one profile per user
    },

    // ── Medical information ────────────────────────────────────────────────
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', null],
      default: null,
    },
    allergies: {
      type: [String],
      default: [],
    },
    medicalConditions: {
      type: [String],
      default: [],
    },
    medications: {
      type: [String],
      default: [],
    },
    disabilityInfo: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Emergency contacts ─────────────────────────────────────────────────
    emergencyContacts: [
      {
        name:         { type: String, trim: true },
        relationship: { type: String, trim: true },
        phone:        { type: String, trim: true },
      },
    ],

    // ── Additional context ─────────────────────────────────────────────────
    specialInstructions: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups by userId (already unique, but explicit for clarity)
emergencyProfileSchema.index({ userId: 1 });

module.exports = mongoose.model('EmergencyProfile', emergencyProfileSchema);