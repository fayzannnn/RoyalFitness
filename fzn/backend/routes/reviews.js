const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');
const isAdmin  = require('../middleware/isAdmin');
const Review   = require('../models/Review');
const User     = require('../models/User');

// ── POST /api/reviews — user submits a review ──────────────────────────────
// Now also copies profilePhoto from user record into the review
router.post('/', auth, async (req, res) => {
  try {
    const { rating, text } = req.body;
    if (!rating) return res.status(400).json({ message: 'Rating required' });

    const user = await User.findById(req.user.id);
    const review = await Review.create({
      user:         req.user.id,
      fullname:     user.fullname,
      profilePhoto: user.profilePhoto || '', // snapshot photo at time of review
      rating,
      text,
    });
    return res.json({ message: 'Review submitted', review });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/reviews/public — featured reviews for landing page ─────────────
// Includes profilePhoto so landing page can show user's actual photo
router.get('/public', async (req, res) => {
  try {
    const reviews = await Review.find({ featured: true }).sort({ date: -1 });
    return res.json(reviews);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/reviews/my — user sees only their own reviews ────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const mine = await Review.find({ user: req.user.id }).sort({ date: -1 });
    return res.json(mine);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/reviews — admin sees all reviews ──────────────────────────────
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const all = await Review.find().sort({ date: -1 });
    return res.json(all);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── PATCH /api/reviews/:id/feature — admin toggles featured ───────────────
router.patch('/:id/feature', auth, isAdmin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    review.featured = !review.featured;
    await review.save();
    return res.json({
      message: `Review ${review.featured ? 'featured' : 'unfeatured'}`,
      review,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;