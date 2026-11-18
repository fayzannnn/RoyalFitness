const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },

  // ── Profile fields ─────────────────────────────────────────────────────────
  phone:        { type: String, default: '' },
  dob:          { type: String, default: '' },
  gender:       { type: String, default: '' },
  goal:         { type: String, default: '' },
  profilePhoto: { type: String, default: '' },

  // ── Google OAuth ───────────────────────────────────────────────────────────
  googleId:     { type: String, default: null },   // Google's unique user ID
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },

  // ── Email verification ─────────────────────────────────────────────────────
  isVerified:   { type: Boolean, default: false },
  verifyToken:  { type: String,  default: null  }, // UUID token sent in email link
  verifyTokenExpires: { type: Date, default: null },

  // ── Password reset OTP ─────────────────────────────────────────────────────
  resetOTP:       { type: String, default: null },
  resetOTPExpiry: { type: Date,   default: null }, // OTP valid for 10 minutes
});

module.exports = mongoose.model('User', userSchema);