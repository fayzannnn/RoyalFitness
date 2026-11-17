require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payments');
const bookingRoutes = require('./routes/bookings');
const trainerRoutes = require('./routes/trainers');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');

const Trainer = require('./models/Trainer');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes); 

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
 
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('MongoDB connected');

    // Seed trainers if none exist
    const count = await Trainer.countDocuments();
    if (count === 0) {
      await Trainer.create([
        { name: "Amit Sharma", specialty: "Strength Training", experience: "5 years", rating: 4.8 },
        { name: "Deon D Silva", specialty: "Weight Loss & Cardio", experience: "4 years", rating: 4.7 },
        { name: "Rohit Chavan", specialty: "Muscle Building", experience: "6 years", rating: 4.9 }
      ]);
      console.log('Seeded default trainers');
    }

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Mongo connection error', err);
  });
