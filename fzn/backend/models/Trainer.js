const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  specialty:  { type: String, required: true },
  experience: { type: String, required: true },
  rating:     { type: Number, required: true, min: 1, max: 5 },
  photo:      { type: String, default: '' }, // base64 or URL
  bio:        { type: String, default: '' },
  createdAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('Trainer', trainerSchema);