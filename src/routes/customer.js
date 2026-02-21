const express   = require('express');
const { body }  = require('express-validator');
const mongoose  = require('mongoose');

const Booking               = require('../models/Booking');
const User                  = require('../models/User');
const PSWProfile            = require('../models/PSWProfile');
const { authenticate, requireRole } = require('../middleware/auth');
const validate              = require('../middleware/validate');

// Name sanitization (mirrors auth.js)
function sanitizeName(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\s+(And|&)\s*$/i, '')
    .replace(/^\s*(And|&)\s+/i, '')
    .trim();
}

const VALID_SERVICE_TYPES = [
  'Personal Care',
  'Companionship',
  'Meal Preparation',
  'Medication Reminders',
  'Light Housekeeping',
  'Mobility Assistance',
  'Post-Surgery Support',
];

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
      .isIn(VALID_SERVICE_TYPES).withMessage(`serviceType must be one of: ${VALID_SERVICE_TYPES.join(', ')}`),
    body('hours')
      .isInt({ min: 3, max: 12 }).withMessage('hours must be a whole number between 3 and 12'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('notes must be 500 characters or fewer'),
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
      const { serviceType, hours, scheduledAt, location, notes } = req.body;

      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ error: 'scheduledAt must be a future date' });
      }

      const price = Math.round(Number(hours) * HOURLY_RATE() * 100) / 100;

      const booking = await Booking.create({
        customerId:        req.user._id,
        serviceType,
        hours:             Number(hours),
        scheduledAt:       scheduledDate,
        location: {
          type:        'Point',
          coordinates: location.coordinates,
        },
        address:           req.body.address?.trim() || 'Greater Sudbury, ON',
        careRecipientName: req.body.careRecipientName?.trim() || '',
        urgency:           req.body.urgency || 'routine',
        price,
        notes:             notes || '',
        paymentStatus:     'PENDING',
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

      if (booking.ratingGiven) {
        return res.status(409).json({ error: 'You have already rated this booking.' });
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

      booking.ratingGiven = true;
      await booking.save();

      res.json({ message: 'Rating submitted', newRating: psw.rating });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── PATCH /bookings/:id/cancel ────────────────────────────────────────────────
// Customer cancels their own REQUESTED or ACCEPTED booking.
router.patch(
  '/bookings/:id/cancel',
  authenticate,
  requireRole('CUSTOMER'),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid booking ID' });
      }

      const booking = await Booking.findOneAndUpdate(
        { _id: id, customerId: req.user._id, status: { $in: ['REQUESTED', 'ACCEPTED'] } },
        { status: 'CANCELLED', paymentStatus: 'REFUNDED' },
        { new: true }
      ).populate('pswId', 'name phone');

      if (!booking) {
        return res.status(404).json({
          error: 'Booking not found or cannot be cancelled once service has started.',
        });
      }

      res.json({ message: 'Booking cancelled successfully', booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── PATCH /profile ────────────────────────────────────────────────────────────
// Update the authenticated user's own profile fields.
router.patch(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('name must be 2–80 characters'),
    body('email').optional().trim().isEmail().withMessage('invalid email'),
    body('address').optional().trim().isLength({ max: 200 }).withMessage('address too long'),
    body('emergencyContact.name').optional().trim().isLength({ max: 80 }),
    body('emergencyContact.phone').optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const allowed = ['name', 'email', 'address', 'emergencyContact', 'preferredLanguage', 'gender'];
      const updates = Object.fromEntries(
        Object.entries(req.body).filter(([k]) => allowed.includes(k))
      );
      // Sanitize name if provided
      if (updates.name) updates.name = sanitizeName(updates.name);

      const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-__v');
      res.json({ message: 'Profile updated', user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── GET /profile ──────────────────────────────────────────────────────────────
// Returns the authenticated user's own profile.
// PSW users also receive their PSWProfile (includes availability status).
router.get(
  '/profile',
  authenticate,
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('-__v -location').lean();
      if (!user) return res.status(404).json({ error: 'User not found' });

      let pswProfile = null;
      if (user.role === 'PSW') {
        pswProfile = await PSWProfile.findOne({ userId: user._id }).select('-__v -_id -userId').lean();
      }

      res.json({ user, pswProfile });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
