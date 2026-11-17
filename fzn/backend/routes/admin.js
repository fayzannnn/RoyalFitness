const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const isAdmin = require('../middleware/isadmin');

const Payment    = require('../models/Payment');
const Booking    = require('../models/Booking');
const TrainerHire= require('../models/TrainerHire');
const Review     = require('../models/Review');
const User       = require('../models/User');

// GET /api/admin/overview (unchanged)
router.get('/overview', auth, isAdmin, async (req, res) => {
  try {
    const totalMembers = await User.countDocuments({ role: 'user' });
    const bookings     = await Booking.countDocuments();
    const trainerHires = await TrainerHire.countDocuments();
    const revenueAgg   = await Payment.aggregate([{ $group: { _id: null, total: { $sum: "$price" } } }]);
    const revenue      = revenueAgg[0] ? revenueAgg[0].total : 0;
    const reviews      = await Review.countDocuments();
    return res.json({ totalMembers, bookings, trainerHires, revenue, reviews });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/admin/stats (unchanged)
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const payments = await Payment.aggregate([
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, revenue: { $sum: "$price" }, members: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const bookings = await Booking.aggregate([
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, classes: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const map = {};
    payments.forEach(p => {
      map[p._id] = { monthKey: p._id, monthLabel: monthLabelFromKey(p._id), members: p.members, revenue: p.revenue, classes: 0 };
    });
    bookings.forEach(b => {
      if (!map[b._id]) map[b._id] = { monthKey: b._id, monthLabel: monthLabelFromKey(b._id), members: 0, revenue: 0, classes: b.classes };
      else map[b._id].classes = b.classes;
    });
    const result = Object.values(map).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/admin/member/:email — full member profile for admin ─────────────
// Returns: user profile fields + all payment history + hired trainer
router.get('/member/:email', auth, isAdmin, async (req, res) => {
  try {
    const { email } = req.params;

    // 1. Get user record (profile details)
    const user = await User.findOne({ email }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 2. Get all payments for this user
    const userPayments = await Payment.find({ user: user._id }).sort({ date: -1 });

    // 3. Get hired trainer (latest)
    const hire = await TrainerHire.findOne({ user: user._id })
      .sort({ date: -1 })
      .populate('trainer');

    // 4. Get reviews by this user
    const userReviews = await Review.find({ user: user._id }).sort({ date: -1 });

    return res.json({
      user,
      payments:      userPayments,
      hiredTrainer:  hire ? hire.trainer : null,
      hireDate:      hire ? hire.date    : null,
      reviews:       userReviews,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

function monthLabelFromKey(ym) {
  try {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'short' });
  } catch { return ym; }
}

module.exports = router;