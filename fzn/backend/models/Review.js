const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullname: { type: String },
  profilePhoto: { type: String, default: '' },
  rating: { type: Number, required: true },
  text: { type: String },
  date: { type: Date, default: Date.now },
  featured: { type: Boolean, default: false }, // admin toggles this to show on landing page
});

module.exports = mongoose.model('Review', reviewSchema);