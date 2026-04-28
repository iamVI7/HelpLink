const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes    = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const userRoutes    = require('./routes/userRoutes');
const statsRoutes   = require('./routes/statsRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const emergencyProfileRoutes = require('./routes/emergencyProfileRoutes');
const profileRoutes = require('./routes/profileRoutes');

// Ensure models are registered with Mongoose on startup
require('./models/Warning');
require('./models/EmergencyProfile'); // ← NEW: register EmergencyProfile model

// Connect to database
connectDB();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to API routes
app.use('/api/', limiter);


// Routes
app.use('/api/auth',     authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/stats',    statsRoutes);
app.use('/api/emergency-profile', emergencyProfileRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'HelpLink API is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;