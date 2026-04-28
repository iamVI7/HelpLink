const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  title: {
    type: String,
    // ✅ NOT required for guest SOS — title auto-generated in controller
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    // ❌ REMOVED 'tools'
    enum: ['blood', 'medical', 'emergency', 'other', 'critical', 'accident'],
    default: 'other'
  },
  urgency: {
    type: String,
    enum: ['high', 'medium', 'low', 'critical'],
    default: 'medium'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: function (v) {
          if (!v || v.length === 0) return true;
          return (
            v.length === 2 &&
            typeof v[0] === 'number' &&
            typeof v[1] === 'number' &&
            v[0] >= -180 && v[0] <= 180 &&
            v[1] >= -90  && v[1] <= 90
          );
        },
        message: 'Coordinates must be valid [longitude, latitude] numbers'
      }
    }
  },
  address: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['open', 'accepted', 'completed'],
    default: 'open'
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  rated: {
    type: Boolean,
    default: false
  },
  isSOS: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 24 * 60 * 60 * 1000)
  },

  // ── Guest SOS fields ─────────────────────────────────────────────────────
  requesterType: {
    type: String,
    enum: ['user', 'guest'],
    default: 'user'
  },
  guestId: {
    type: String,
    default: null
  },

  // ── Smart rebroadcast fields ──────────────────────────────────────────────
  radius: {
    type: Number,
    default: 5000
  },
  rebroadcastCount: {
    type: Number,
    default: 0
  },
  lastBroadcastedAt: {
    type: Date,
    default: Date.now
  },

  // ── Incident media ────────────────────────────────────────────────────────
  media: {
    images: [
      {
        url: String,
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    uploadedBy: {
      type: String,
      enum: ['guest', 'user'],
      default: 'user'
    }
  },

  // ✅ ADDED — unified request pipeline fields
  isGuest: {
    type: Boolean,
    default: false
  },
  isEnhanced: {
    type: Boolean,
    default: false
  },
  locationStatus: {
    type: String,
    enum: ['available', 'unavailable'],
    default: 'available'
  },

  // ── NEW: Emergency Profile Snapshot ──────────────────────────────────────
  // Captured at request-creation time from the requester's EmergencyProfile.
  // Entirely OPTIONAL — null for guests and users without a profile.
  // Stored as a plain sub-document (not a ref) so it is permanently
  // preserved even if the user's profile is later updated or deleted.
  emergencyProfileSnapshot: {
    // From User model
    name:           { type: String,  default: null },
    phoneNumber:    { type: String,  default: null },
    rating:         { type: Number,  default: null },
    totalHelpGiven: { type: Number,  default: null },
    isVerified:     { type: Boolean, default: null },
    address:        { type: String,  default: null },

    // From EmergencyProfile model
    bloodGroup:          { type: String,  default: null },
    allergies:           { type: [String], default: undefined },
    medicalConditions:   { type: [String], default: undefined },
    medications:         { type: [String], default: undefined },
    disabilityInfo:      { type: String,  default: null },
    emergencyContacts:   {
      type: [
        {
          name:         String,
          relationship: String,
          phone:        String,
        }
      ],
      default: undefined,
    },
    specialInstructions: { type: String, default: null },

    // Timestamp of when the snapshot was captured
    capturedAt: { type: Date, default: null },
  },
  // ── END: Emergency Profile Snapshot ──────────────────────────────────────

  // ── NEW: Public Sequential ID fields ─────────────────────────────────────
  // publicId  — human-readable ID shown to users, e.g. HL-REQ-000001
  // actorType — mirrors requesterType but uses the new "user"/"guest" naming
  //             required by the spec; kept separate so requesterType is
  //             untouched and all existing queries continue to work.
  // ─────────────────────────────────────────────────────────────────────────
  publicId: {
    type: String,
    unique: true,
    sparse: true, // allows null on legacy documents without breaking uniqueness
    default: null,
  },
  actorType: {
    type: String,
    enum: ['user', 'guest'],
    default: null,
  },
  // ── END: Public Sequential ID fields ─────────────────────────────────────

}, {
  timestamps: true
});

// Existing indexes — untouched
requestSchema.index({ location: '2dsphere' });
requestSchema.index({ status: 1, urgency: -1, createdAt: -1 });
requestSchema.index({ createdBy: 1, createdAt: -1 });
requestSchema.index({ acceptedBy: 1, createdAt: -1 });

// ✅ NEW — index for fast publicId lookups (tracking page)
requestSchema.index({ publicId: 1 });

module.exports = mongoose.model('Request', requestSchema);