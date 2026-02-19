const express   = require('express');
const { body }  = require('express-validator');
const mongoose  = require('mongoose');

const Booking               = require('../models/Booking');
const User                  = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');
const validate              = require('../middleware/validate');

const router = express.Router();

const HOURLY_RATE = () => parseFloat(process.env.HOURLY_RATE) || 25; // CAD

// ── POST /bookings ────────────────────────────────────────────────────────────
// Create a new care booking.
// Minimum 3 hours; price is computed server-side from HOURLY_RATE.
router.post(
  '/bookings',
  authenticate,
  requireRole('CUSTOMER'),
  [
    body('serviceType')
      .trim()
      .notEmpty().withMessage('serviceType is required'),
    body('hours')
      .isFloat({ min: 3 }).withMessage('hours must be at least 3'),
    body('scheduledAt')
      .isISO8601().withMessage('scheduledAt must be a valid ISO 8601 date'),
    body('location.coordinates')
      .isArray({ min: 2, max: 2 }).withMessage('location.coordinates must be [longitude, latitude]'),
    body('location.coordinates.*')
      .isFloat().withMessage('coordinates must be numbers'),
  ],
  validate,
  async (req, res) => {
    try {
      const { serviceType, hours, scheduledAt, location } = req.body;

      const price = Math.round(hours * HOURLY_RATE() * 100) / 100; // round to 2 dp

      const booking = await Booking.create({
        customerId: req.user._id,
        serviceType,
        hours,
        scheduledAt: new Date(scheduledAt),
        location: {
          type:        'Point',
          coordinates: location.coordinates, // [lng, lat]
        },
        price,
        paymentStatus: 'PENDING',
        // Stripe (production): create paymentIntent here then set stripePaymentIntentId
        // const intent = await stripe.paymentIntents.create({ amount: price*100, currency:'cad', ... });
        // stripePaymentIntentId: intent.id,
      });

      res.status(201).json({ booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── GET /bookings/my ──────────────────────────────────────────────────────────
// List the authenticated customer's own bookings, newest first.
router.get(
  '/bookings/my',
  authenticate,
  requireRole('CUSTOMER'),
  async (req, res) => {
    try {
      const bookings = await Booking.find({ customerId: req.user._id })
        .sort({ createdAt: -1 })
        .populate('customerId', 'name phone rating')
        .populate('pswId', 'name phone rating');

      res.json({ bookings });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── POST /ratings ─────────────────────────────────────────────────────────────
// Rate a PSW 1-5 stars after a COMPLETED booking.
// One rating per completed booking is enforced by checking the booking status.
router.post(
  '/ratings',
  authenticate,
  requireRole('CUSTOMER'),
  [
    body('bookingId')
      .notEmpty().withMessage('bookingId is required'),
    body('rating')
      .isInt({ min: 1, max: 5 }).withMessage('rating must be an integer between 1 and 5'),
  ],
  validate,
  async (req, res) => {
    try {
      const { bookingId, rating } = req.body;

      if (!mongoose.isValidObjectId(bookingId)) {
        return res.status(400).json({ error: 'Invalid bookingId' });
      }

      const booking = await Booking.findOne({
        _id:        bookingId,
        customerId: req.user._id,
        status:     'COMPLETED',
      });

      if (!booking) {
        return res.status(404).json({
          error: 'Completed booking not found. Only completed bookings can be rated.',
        });
      }

      if (!booking.pswId) {
        return res.status(400).json({ error: 'No PSW assigned to this booking' });
      }

      const psw = await User.findById(booking.pswId);
      if (!psw) return res.status(404).json({ error: 'PSW not found' });

      // Incremental rolling average: newAvg = (oldAvg * count + newRating) / (count + 1)
      const total       = psw.rating * psw.ratingCount + Number(rating);
      psw.ratingCount  += 1;
      psw.rating        = Math.round((total / psw.ratingCount) * 10) / 10;
      await psw.save();

      res.json({ message: 'Rating submitted', newRating: psw.rating });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
