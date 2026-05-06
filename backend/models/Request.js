const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  title: {
    type: String,
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
    enum: ['open', 'accepted', 'completed', 'cancelled'],
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

  // ── Guest SOS fields ──────────────────────────────────────────────────────
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

  // ── Unified request pipeline fields ──────────────────────────────────────
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

  // ── Emergency Profile Snapshot ────────────────────────────────────────────
  emergencyProfileSnapshot: {
    name:           { type: String,  default: null },
    phoneNumber:    { type: String,  default: null },
    rating:         { type: Number,  default: null },
    totalHelpGiven: { type: Number,  default: null },
    isVerified:     { type: Boolean, default: null },
    address:        { type: String,  default: null },
    bloodGroup:          { type: String,  default: null },
    allergies:           { type: [String], default: undefined },
    medicalConditions:   { type: [String], default: undefined },
    medications:         { type: [String], default: undefined },
    disabilityInfo:      { type: String,  default: null },
    emergencyContacts: {
      type: [{ name: String, relationship: String, phone: String }],
      default: undefined,
    },
    specialInstructions: { type: String, default: null },
    capturedAt: { type: Date, default: null },
  },

  // ── Public Sequential ID fields ───────────────────────────────────────────
  publicId: {
    type: String,
    unique: true,
    sparse: true,
    default: null,
  },
  actorType: {
    type: String,
    enum: ['user', 'guest'],
    default: null,
  },

  // ── Cancellation fields ───────────────────────────────────────────────────
  cancelledBy: {
    type: String,
    enum: ['guest', 'user', 'admin'],
    default: null,
  },
  cancellationReason: {
    type: String,
    maxlength: [300, 'Cancellation reason cannot exceed 300 characters'],
    default: null,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },

  // ── ✅ NEW: Real-time activity feed fields ────────────────────────────────
  //
  // notifiedCount        — running total of unique users alerted across ALL
  //                        broadcast + rebroadcast waves for this request.
  //                        Incremented atomically by notificationService and
  //                        rebroadcastService after each wave.
  //
  // nearestHelperDistance — distance in km of the closest available helper
  //                        found during the most recent broadcast wave.
  //                        null = no helpers found yet in range.
  //                        Updated each wave so the frontend always shows
  //                        the freshest proximity figure.
  // ─────────────────────────────────────────────────────────────────────────
  notifiedCount: {
    type: Number,
    default: 0,
  },
  nearestHelperDistance: {
    type: Number,   // km, e.g. 1.2
    default: null,
  },
  // ── END: Activity feed fields ─────────────────────────────────────────────

}, {
  timestamps: true
});

// Existing indexes — untouched
requestSchema.index({ location: '2dsphere' });
requestSchema.index({ status: 1, urgency: -1, createdAt: -1 });
requestSchema.index({ createdBy: 1, createdAt: -1 });
requestSchema.index({ acceptedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Request', requestSchema);