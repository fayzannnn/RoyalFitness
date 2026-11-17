const mongoose = require('mongoose');

const trainerHireSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TrainerHire', trainerHireSchema);
