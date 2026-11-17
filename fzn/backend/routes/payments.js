const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');

const Payment = require('../models/Payment');
const User = require('../models/User');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// STEP 1: Create Razorpay order
// Frontend calls this first to get an order_id before opening the modal
router.post('/create-order', auth, async (req, res) => {
  try {
    const { plan, price } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // price comes in as rupees (e.g. 999), Razorpay needs paise (99900)
    const amountInPaise = Math.round(Number(price) * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${user._id}_${Date.now()}`,
      notes: { userId: String(user._id), plan },
    });

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('create-order error:', err);
    return res.status(500).json({ message: 'Could not create payment order' });
  }
});

// STEP 2: Verify payment and save to DB
// Frontend calls this after user completes payment in the Razorpay modal
router.post('/verify', auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan,
      price,
    } = req.body;

    // Verify HMAC signature — proves Razorpay actually processed the payment
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Same expiry logic as your old /pay route
    const now = new Date();
    const expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + 1);

    // Save to your existing Payment model — all same fields
    const payment = await Payment.create({
      user: user._id,
      name: user.fullname,
      email: user.email,
      plan,
      price: Number(price),
      date: now,
      expiry,
      providerId: razorpay_payment_id,  // your model already has this field!
    });

    return res.json({ success: true, message: 'Payment recorded', payment });
  } catch (err) {
    console.error('verify error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/payments — unchanged from your original
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const all = await Payment.find().sort({ date: -1 }).populate('user', 'fullname email profilePhoto');
      return res.json(all);
    } else {
      const mine = await Payment.find({ user: req.user.id }).sort({ date: -1 });
      return res.json(mine);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/payments/cash — records a cash payment ─────────────────────────
// Used when user chooses to pay at the front desk
// Saves payment with providerId: "CASH" so admin can identify it
router.post('/cash', auth, async (req, res) => {
  try {
    const { plan, price } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now    = new Date();
    const expiry = new Date(now);
    expiry.setMonth(expiry.getMonth() + 1); // 1 month from today

    const payment = await Payment.create({
      user:       user._id,
      name:       user.fullname,
      email:      user.email,
      plan,
      price:      Number(price),
      date:       now,
      expiry,
      providerId: 'CASH', // clearly marked as cash payment
    });

    return res.json({ success: true, message: 'Cash payment recorded', payment });
  } catch (err) {
    console.error('cash payment error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;