const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isadmin');

// create booking (open to anyone)
router.post('/', async (req, res) => {
  try {
    const { name, contact, address, service, date } = req.body;
    const booking = await Booking.create({
      name, contact, address, service,
      date: date ? new Date(date) : new Date()
    });
    return res.json({ message: 'Booking created', booking });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// admin view all bookings
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const list = await Booking.find().sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
