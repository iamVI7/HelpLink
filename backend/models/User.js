const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },

  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },

  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Please add location coordinates'],
      validate: {
        validator: function (v) {
          return (
            v &&
            v.length === 2 &&
            typeof v[0] === 'number' &&
            typeof v[1] === 'number' &&
            v[0] >= -180 &&
            v[0] <= 180 &&
            v[1] >= -90 &&
            v[1] <= 90
          );
        },
        message: 'Coordinates must be valid [longitude, latitude]'
      }
    }
  },

  address: {
    type: String,
    required: [true, 'Please add an address'],
    trim: true
  },

  phoneNumber: {
    type: String,
    required: [true, 'Please add a phone number'],
    match: [/^[0-9]{10}$/, 'Please add a valid 10-digit phone number']
  },

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  isAvailable: {
    type: Boolean,
    default: true
  },

  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },

  totalRatings: {
    type: Number,
    default: 0
  },

  totalHelpGiven: {
    type: Number,
    default: 0
  },

  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: {
    type: Date
  },

  avatar: {
    type: String,
    default: function () {
      const seed = this.name || 'User';
      return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`;
    }
  },

  isActive: {
    type: Boolean,
    default: false
  },

  lastSeen: {
    type: Date
  },

  // ✅ NEW: OTP verification flag — defaults false, never blocks any existing flow
  isVerified: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});


// 📍 INDEXES (IMPORTANT FOR PERFORMANCE)
userSchema.index({ location: '2dsphere' });
userSchema.index({ isAvailable: 1 });


// 🔐 HASH PASSWORD (FIXED VERSION)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


// 🔑 MATCH PASSWORD METHOD (FOR LOGIN)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


module.exports = mongoose.model('User', userSchema);