const express  = require('express');
const router   = express.Router();
const Trainer  = require('../models/Trainer');
const TrainerHire = require('../models/TrainerHire');
const auth     = require('../middleware/auth');
const isAdmin  = require('../middleware/isAdmin');

// ── GET /api/trainers — list all trainers (public) ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const trainers = await Trainer.find().sort({ createdAt: -1 });
    return res.json(trainers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/trainers — admin adds a new trainer ──────────────────────────
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { name, specialty, experience, rating, photo, bio } = req.body;
    if (!name || !specialty || !experience || !rating)
      return res.status(400).json({ message: 'Name, specialty, experience and rating are required' });

    const trainer = await Trainer.create({
      name,
      specialty,
      experience,
      rating: Number(rating),
      photo:  photo || '',
      bio:    bio   || '',
    });
    return res.status(201).json({ message: 'Trainer added', trainer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/trainers/:id — admin removes a trainer ─────────────────────
router.delete('/:id', auth, isAdmin, async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
    await Trainer.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Trainer removed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/trainers/hire — user hires a trainer (unchanged) ─────────────
router.post('/hire', auth, async (req, res) => {
  try {
    const { trainerId } = req.body;
    if (!trainerId) return res.status(400).json({ message: 'trainerId required' });
    const t = await Trainer.findById(trainerId);
    if (!t) return res.status(404).json({ message: 'Trainer not found' });
    const hire = await TrainerHire.create({ user: req.user.id, trainer: trainerId });
    return res.json({ message: 'Trainer hired', hire });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/trainers/hired/me — user's latest hired trainer (unchanged) ───
router.get('/hired/me', auth, async (req, res) => {
  try {
    const last = await TrainerHire.findOne({ user: req.user.id })
      .sort({ date: -1 })
      .populate('trainer');
    return res.json(last);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/trainers/hires — admin: all hire records (unchanged) ──────────
router.get('/hires', auth, isAdmin, async (req, res) => {
  try {
    const hires = await TrainerHire.find()
      .sort({ date: -1 })
      .populate('user', 'fullname email')
      .populate('trainer');
    return res.json(hires);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;