const express  = require('express');
const mongoose = require('mongoose');

const Booking               = require('../models/Booking');
const PSWProfile            = require('../models/PSWProfile');
const User                  = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

const NEARBY_RADIUS_KM = () => parseFloat(process.env.NEARBY_RADIUS_KM) || 15;

// ── Helper: assert PSW is approved ───────────────────────────────────────────
async function assertApprovedPSW(userId, res) {
  const profile = await PSWProfile.findOne({ userId }).lean();
  if (!profile)                { res.status(403).json({ error: 'PSW profile not found. Contact admin.' }); return null; }
  if (!profile.approvedByAdmin){ res.status(403).json({ error: 'Your account is pending admin approval.' }); return null; }
  return profile;
}

// ── GET /jobs/nearby ──────────────────────────────────────────────────────────
// Returns REQUESTED bookings within NEARBY_RADIUS_KM of the PSW's saved location.
// Optional query params: ?lat=46.49&lng=-80.99
//   If provided, the PSW's location is updated before the search runs.
// Sorted by distance ASC, then customer rating DESC.
router.get(
  '/nearby',
  authenticate,
  requireRole('PSW'),
  async (req, res) => {
    try {
      const profile = await assertApprovedPSW(req.user._id, res);
      if (!profile) return;

      if (!profile.availability) {
        return res.status(403).json({
          error: 'Your availability is set to false. Update your profile to receive jobs.',
        });
      }

      // If the app sent current GPS coordinates, update the PSW's saved location
      const { lat, lng } = req.query;
      if (lat && lng) {
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          await User.findByIdAndUpdate(req.user._id, {
            location: { type: 'Point', coordinates: [parsedLng, parsedLat] },
          });
        }
      }

      const pswUser    = await User.findById(req.user._id).lean();
      // Fall back to Sudbury city centre if location hasn't been set yet
      const [pswLng, pswLat] = pswUser.location?.coordinates ?? [-80.9930, 46.4917];

      // $geoNear must be the first stage in an aggregation pipeline
      const bookings = await Booking.aggregate([
        {
          $geoNear: {
            near:          { type: 'Point', coordinates: [pswLng, pswLat] },
            distanceField: 'distanceMeters',
            maxDistance:   NEARBY_RADIUS_KM() * 1000,
            query:         { status: 'REQUESTED' },
            spherical:     true,
          },
        },
        {
          $lookup: {
            from:         'users',
            localField:   'customerId',
            foreignField: '_id',
            as:           'customer',
          },
        },
        { $unwind: '$customer' },
        {
          $project: {
            serviceType:  1,
            hours:        1,
            scheduledAt:  1,
            location:     1,
            status:       1,
            paymentStatus: 1,
            createdAt:    1,
            totalPrice:   '$price',  // expose as totalPrice
            distanceKm:   { $round: [{ $divide: ['$distanceMeters', 1000] }, 1] },
            'customer._id':    1,
            'customer.name':   1,
            'customer.phone':  1,
            'customer.rating': 1,
          },
        },
        // Closest first; break ties by customer rating (highest first)
        { $sort: { distanceMeters: 1, 'customer.rating': -1 } },
      ]);

      res.json({ bookings });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── POST /jobs/:id/accept ─────────────────────────────────────────────────────
// PSW claims a REQUESTED booking. Atomic findOneAndUpdate prevents double-accept.
router.post(
  '/:id/accept',
  authenticate,
  requireRole('PSW'),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid booking ID' });
      }

      const profile = await assertApprovedPSW(req.user._id, res);
      if (!profile) return;

      const booking = await Booking.findOneAndUpdate(
        { _id: req.params.id, status: 'REQUESTED' },
        { pswId: req.user._id, status: 'ACCEPTED' },
        { new: true }
      )
        .populate('customerId', 'name phone address')
        .populate('pswId', 'name phone');

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found or already claimed' });
      }

      res.json({ message: 'Job accepted', booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── POST /jobs/:id/start ──────────────────────────────────────────────────────
router.post(
  '/:id/start',
  authenticate,
  requireRole('PSW'),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid booking ID' });
      }

      const booking = await Booking.findOneAndUpdate(
        { _id: req.params.id, pswId: req.user._id, status: 'ACCEPTED' },
        { status: 'STARTED' },
        { new: true }
      )
        .populate('customerId', 'name phone address')
        .populate('pswId', 'name phone');

      if (!booking) {
        return res.status(404).json({
          error: 'Booking not found, not assigned to you, or not in ACCEPTED state',
        });
      }

      res.json({ message: 'Job started', booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── POST /jobs/:id/complete ───────────────────────────────────────────────────
router.post(
  '/:id/complete',
  authenticate,
  requireRole('PSW'),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid booking ID' });
      }

      const booking = await Booking.findOneAndUpdate(
        { _id: req.params.id, pswId: req.user._id, status: 'STARTED' },
        { status: 'COMPLETED', paymentStatus: 'RELEASED' },
        { new: true }
      )
        .populate('customerId', 'name phone')
        .populate('pswId', 'name phone');

      if (!booking) {
        return res.status(404).json({
          error: 'Booking not found, not assigned to you, or not in STARTED state',
        });
      }

      // Stripe (production): capture the authorised payment now
      // await stripe.paymentIntents.capture(booking.stripePaymentIntentId);

      res.json({ message: 'Job completed. Payment released to PSW.', booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── PATCH /jobs/availability ──────────────────────────────────────────────────
// Toggle PSW availability on/off.
router.patch(
  '/availability',
  authenticate,
  requireRole('PSW'),
  async (req, res) => {
    try {
      const { available } = req.body;
      if (typeof available !== 'boolean') {
        return res.status(400).json({ error: 'available must be true or false' });
      }

      const profile = await PSWProfile.findOneAndUpdate(
        { userId: req.user._id },
        { availability: available },
        { new: true }
      );

      if (!profile) return res.status(404).json({ error: 'PSW profile not found' });

      res.json({ message: `Availability set to ${available}`, availability: available });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── GET /jobs/my ──────────────────────────────────────────────────────────────
// List all jobs this PSW has accepted/started/completed.
router.get(
  '/my',
  authenticate,
  requireRole('PSW'),
  async (req, res) => {
    try {
      const bookings = await Booking.find({
        pswId:  req.user._id,
        status: { $in: ['ACCEPTED', 'STARTED', 'COMPLETED'] },
      })
        .sort({ createdAt: -1 })
        .populate('customerId', 'name phone rating address');

      res.json({ bookings });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
