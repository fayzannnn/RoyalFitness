const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String },
  email: { type: String },
  plan: { type: String, required: true },
  price: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  expiry: { type: Date }, // membership expiry date
  providerId: { type: String, default: null }
});

module.exports = mongoose.model('Payment', paymentSchema);
