const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const auth     = require('../middleware/auth');
const User     = require('../models/User');
const { sendVerificationEmail, sendOTPEmail, sendWelcomeEmail } = require('../utils/mailer');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Helper: generate 6-digit OTP ────────────────────────────────────────────
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// ── POST /api/auth/register ──────────────────────────────────────────────────
// Registers user and sends verification email
router.post('/register', async (req, res) => {
  try {
    const { fullname, email, password } = req.body;
    if (!fullname || !email || !password)
      return res.status(400).json({ message: 'Missing fields' });

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: 'Invalid email format' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hashed     = await bcrypt.hash(password, 10);
    const role        = 'user';
    const verifyToken = crypto.randomBytes(32).toString('hex'); // unique token
    const verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await new User({
      fullname, email, password: hashed, role,
      isVerified: false,
      verifyToken,
      verifyTokenExpires,
    }).save();

    await sendVerificationEmail(email, fullname, verifyToken);
    return res.json({ message: 'Registered! Please check your email to verify your account.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/auth/verify-email ───────────────────────────────────────────────
// User clicks link in email → this verifies their account
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Token missing' });

    const user = await User.findOne({
      verifyToken: token,
      verifyTokenExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired verification link' });

    user.isVerified  = true;
    user.verifyToken = null;
    user.verifyTokenExpires = null;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.fullname);

    // Return JSON — frontend VerifyEmail.jsx handles the UI
    return res.json({ message: 'Email verified successfully!', verified: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

console.log("LOGIN DATA:", { email, password: password ? "received" : "missing" });

if (!email || !password)
  return res.status(400).json({ message: 'Missing fields' });

const user = await User.findOne({ email });

console.log("USER FOUND:", !!user);

if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    // Block unverified users from logging in
    if (!user.isVerified)
      return res.status(403).json({
        message: 'Please verify your email first. Check your inbox for the verification link.',
        notVerified: true,
      });

    const ok = await bcrypt.compare(password, user.password);

console.log("PASSWORD MATCH:", ok);

if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        fullname:     user.fullname,
        email:        user.email,
        role:         user.role,
        phone:        user.phone        || '',
        dob:          user.dob          || '',
        gender:       user.gender       || '',
        goal:         user.goal         || '',
        profilePhoto: user.profilePhoto || '',
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/auth/resend-verification ───────────────────────────────────────
// In case user didn't receive the email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)          return res.status(404).json({ message: 'Email not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Email already verified' });

    const verifyToken  = crypto.randomBytes(32).toString('hex');
    user.verifyToken   = verifyToken;
    user.verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    await sendVerificationEmail(email, user.fullname, verifyToken);

    return res.json({ message: 'Verification email resent. Check your inbox.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/auth/google ─────────────────────────────────────────────────────
// Called when user clicks "Sign in with Google" on the frontend
// Verifies Google token, finds or creates user, returns JWT
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: 'Google credential missing' });

    // 1. Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: 'Google account email not verified' });
    }

    // 2. Find existing user by email or googleId
    let user = await User.findOne({ $or: [{ email }, { googleId }] });

    if (user) {
      // Existing user — link Google account if not already linked
      if (!user.googleId) {
        user.googleId     = googleId;
        user.authProvider = 'google';
        user.isVerified   = true; // Google already verified the email
        if (!user.profilePhoto && picture) user.profilePhoto = picture;
        await user.save();
      }
    } else {
      // New user — create account from Google profile
      user = await new User({
        fullname:     name,
        email,
        password:     require('crypto').randomBytes(32).toString('hex'), // random unusable password
        role:         'user',
        googleId,
        authProvider: 'google',
        isVerified:   true,          // Google already verified email
        profilePhoto: picture || '', // use Google profile photo
      }).save();

      // Send welcome email for new Google sign-ups
      try { await sendWelcomeEmail(email, name); } catch (_) {}
    }

    // 3. Generate JWT — same as regular login
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        fullname:     user.fullname,
        email:        user.email,
        role:         user.role,
        phone:        user.phone        || '',
        dob:          user.dob          || '',
        gender:       user.gender       || '',
        goal:         user.goal         || '',
        profilePhoto: user.profilePhoto || '',
      },
    });
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(500).json({ message: 'Google sign-in failed. Please try again.' });
  }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
// Generates OTP and sends it to the user's real email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    // Always respond OK to prevent email enumeration attacks
    if (!user) return res.json({ message: 'If that email exists, an OTP has been sent.' });

    const otp    = generateOTP();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    user.resetOTP       = otp;
    user.resetOTPExpiry = expiry;
    await user.save();

    await sendOTPEmail(email, user.fullname, otp);
    return res.json({ message: 'OTP sent to your email. Valid for 10 minutes.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
// Verifies the OTP is correct and not expired
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.resetOTP)
      return res.status(400).json({ message: 'OTP not found. Please request a new one.' });

    if (new Date() > user.resetOTPExpiry)
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

    if (user.resetOTP !== otp)
      return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });

    return res.json({ message: 'OTP verified', verified: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
// Sets the new password after OTP is verified
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const user = await User.findOne({ email });
    if (!user || !user.resetOTP)
      return res.status(400).json({ message: 'Invalid request' });

    if (new Date() > user.resetOTPExpiry)
      return res.status(400).json({ message: 'OTP expired. Please start over.' });

    if (user.resetOTP !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });

    user.password       = await bcrypt.hash(newPassword, 10);
    user.resetOTP       = null;
    user.resetOTPExpiry = null;
    await user.save();

    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
router.put('/profile', auth, async (req, res) => {
  try {
    const { fullname, phone, dob, gender, goal, profilePhoto } = req.body;
    const updateFields = {};
    if (fullname     !== undefined) updateFields.fullname     = fullname;
    if (phone        !== undefined) updateFields.phone        = phone;
    if (dob          !== undefined) updateFields.dob          = dob;
    if (gender       !== undefined) updateFields.gender       = gender;
    if (goal         !== undefined) updateFields.goal         = goal;
    if (profilePhoto !== undefined) updateFields.profilePhoto = profilePhoto;

    const updated = await User.findByIdAndUpdate(req.user.id, updateFields, { new: true }).select('-password');
    return res.json({ message: 'Profile saved', user: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;