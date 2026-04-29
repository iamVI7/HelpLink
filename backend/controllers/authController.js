const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateOTP, verifyOTP: verifyOTPStore, otpStore } = require('../utils/otpStore');


// 🔐 Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};


// 📦 Format User Response
// ✅ isVerified included so frontend always receives it
const formatUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  location: user.location,
  address: user.address,
  phoneNumber: user.phoneNumber,
  isAvailable: user.isAvailable,
  rating: user.rating,
  totalHelpGiven: user.totalHelpGiven,
  role: user.role,
  isVerified: user.isVerified  // ✅ NEW — safe addition, no breakage
});


// ==============================
// @desc    Register User
// ==============================
const registerUser = async (req, res) => {
  try {
    let { name, email, password, location, address, phoneNumber } = req.body;

    if (!name || !email || !password || !location || !address || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    email = email.toLowerCase().trim();

    if (
      !location.coordinates ||
      location.coordinates.length !== 2 ||
      typeof location.coordinates[0] !== 'number' ||
      typeof location.coordinates[1] !== 'number'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location coordinates'
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      location: {
        type: 'Point',
        coordinates: location.coordinates
      },
      address,
      phoneNumber
    });

    res.status(201).json({
      success: true,
      ...formatUserResponse(user),
      token: generateToken(user._id)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// ==============================
// @desc    Login User
// ==============================
const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email. Please register first.'
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated by admin'
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.'
      });
    }

    res.json({
      success: true,
      ...formatUserResponse(user),
      token: generateToken(user._id)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// ==============================
// @desc    Get Profile
// ==============================
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'User not found or deactivated'
      });
    }

    res.json({
      success: true,
      ...user.toObject()
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// ==============================
// @desc    Update Availability
// ==============================
const updateAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isAvailable must be true or false'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isAvailable },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      ...user.toObject()
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// ==============================
// @desc    Get All Users (Admin)
// ==============================
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ==============================
// @desc    Delete User (Admin)
// ==============================
const deleteUserAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin user'
      });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// ==============================
// @desc    Restore User (Admin)
// ==============================
const restoreUserAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isDeleted = false;
    user.deletedAt = null;
    await user.save();

    res.json({
      success: true,
      message: 'User restored successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// ==============================
// @desc    Send OTP  ← NEW
// @route   POST /api/auth/send-otp
// @access  Private (logged-in users only)
// ==============================
const sendOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber || !/^[0-9]{10}$/.test(phoneNumber.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number'
      });
    }

    // Guard: already verified — no need to re-send
    const user = await User.findById(req.user._id);
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Your number is already verified'
      });
    }

    // 🔒 Ensure user is requesting OTP for their own number
if (user.phoneNumber !== phoneNumber.trim()) {
  return res.status(400).json({
    success: false,
    message: 'Phone number mismatch'
  });
}

const existing = otpStore.get(user.phoneNumber);

if (existing && Date.now() < existing.expiresAt) {
  return res.status(400).json({
    success: false,
    message: 'OTP already sent. Please wait before retrying.'
  });
}

const otp = generateOTP(user.phoneNumber);

    // 📋 Console log for demo (replace with SMS API in production)
    console.log(`\n========================================`);
    console.log(`📱 OTP for ${user.phoneNumber}: ${otp}`);
    console.log(`  ⏳ Expires in 5 minutes`);
    console.log(`========================================\n`);

    res.json({
      success: true,
      message: 'OTP sent successfully. Check server console for the OTP (demo mode).'
    });

  } catch (error) {
    console.error('sendOTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// ==============================
// @desc    Verify OTP  ← NEW
// @route   POST /api/auth/verify-otp
// @access  Private (logged-in users only)
// ==============================
const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    // ✅ Fetch user FIRST
    const user = await User.findById(req.user._id);

    // 🔒 Prevent verifying different number
    if (user.phoneNumber !== phoneNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Phone number mismatch'
      });
    }

    // 🔒 Prevent re-verification
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User already verified'
      });
    }

    // ✅ Verify OTP
    const result = verifyOTPStore(user.phoneNumber, otp);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.reason
      });
    }

    // ✅ Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { isVerified: true },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Phone number verified successfully!',
      isVerified: updatedUser.isVerified
    });

  } catch (error) {
    console.error('verifyOTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateAvailability,
  getAllUsers,
  deleteUserAdmin,
  restoreUserAdmin,
  sendOTP,    // ✅ NEW
  verifyOTP   // ✅ NEW
};