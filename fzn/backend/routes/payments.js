const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

const Payment = require('../models/Payment');
const User = require('../models/User');
const { getPlanPrice, addOneMonth } = require('../utils/membershipPlans');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// STEP 1: Create Razorpay order
// Frontend calls this first to get an order_id before opening the modal
router.post('/create-order', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    const price = getPlanPrice(plan);
    if (price === null) return res.status(400).json({ message: 'Invalid membership plan' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const amountInPaise = price * 100;

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
      price,
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !/^[0-9a-f]{64}$/i.test(razorpay_signature || '')) {
      return res.status(400).json({ message: 'Invalid payment details' });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = Buffer.from(crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex'), 'hex');
    const suppliedSignature = Buffer.from(razorpay_signature, 'hex');

    if (expectedSignature.length !== suppliedSignature.length ||
        !crypto.timingSafeEqual(expectedSignature, suppliedSignature)) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const order = await razorpay.orders.fetch(razorpay_order_id);
    const plan = order.notes && order.notes.plan;
    const price = getPlanPrice(plan);
    if (price === null ||
        order.notes.userId !== String(req.user.id) ||
        order.amount !== price * 100 ||
        order.currency !== 'INR' ||
        order.status !== 'paid') {
      return res.status(400).json({ message: 'Payment order does not match this account or plan' });
    }

    const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
    if (razorpayPayment.order_id !== order.id ||
        razorpayPayment.status !== 'captured' ||
        razorpayPayment.amount !== order.amount) {
      return res.status(400).json({ message: 'Payment has not been captured for this order' });
    }

    const existingPayment = await Payment.findOne({ providerId: razorpay_payment_id });
    if (existingPayment) {
      return res.status(409).json({ message: 'Payment has already been recorded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
    const expiry = addOneMonth(now);

    const payment = await Payment.create({
      user: user._id,
      name: user.fullname,
      email: user.email,
      plan,
      price: Number(price),
      date: now,
      expiry,
      providerId: razorpay_payment_id,
      status: 'paid',
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
// Cash reservations remain pending until an admin confirms receipt.
router.post('/cash', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    const price = getPlanPrice(plan);
    if (price === null) return res.status(400).json({ message: 'Invalid membership plan' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now    = new Date();
    const payment = await Payment.create({
      user:       user._id,
      name:       user.fullname,
      email:      user.email,
      plan,
      price:      Number(price),
      date:       now,
      providerId: 'CASH',
      status:     'pending',
    });

    return res.json({ success: true, message: 'Cash payment recorded', payment });
  } catch (err) {
    console.error('cash payment error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:paymentId/confirm-cash', auth, isAdmin, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.paymentId)) {
      return res.status(400).json({ message: 'Invalid payment ID' });
    }

    const now = new Date();
    const payment = await Payment.findOneAndUpdate(
      {
        _id: req.params.paymentId,
        providerId: 'CASH',
        status: 'pending',
      },
      {
        $set: {
          status: 'paid',
          date: now,
          expiry: addOneMonth(now),
        },
      },
      { new: true }
    );
    if (!payment) return res.status(404).json({ message: 'Pending cash payment not found' });

    return res.json({ success: true, message: 'Cash payment confirmed', payment });
  } catch (err) {
    console.error('cash payment confirmation error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;