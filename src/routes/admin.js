const express  = require('express');
const mongoose = require('mongoose');

const User       = require('../models/User');
const PSWProfile = require('../models/PSWProfile');
const Booking    = require('../models/Booking');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET /admin/psws ───────────────────────────────────────────────────────────
// List all PSWs with their profiles and approval status.
// Supports optional query: ?approved=true|false
router.get(
  '/psws',
  authenticate,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const userFilter = { role: 'PSW' };

      const psws = await User.find(userFilter).lean();

      const profiles = await PSWProfile.find({
        userId: { $in: psws.map((p) => p._id) },
      }).lean();

      const profileMap = Object.fromEntries(
        profiles.map((p) => [p.userId.toString(), p])
      );

      let result = psws.map((psw) => ({
        ...psw,
        profile: profileMap[psw._id.toString()] || null,
      }));

      // Optional filter by approval status
      if (req.query.approved !== undefined) {
        const approved = req.query.approved === 'true';
        result = result.filter(
          (p) => (p.profile?.approvedByAdmin ?? false) === approved
        );
      }

      res.json({ total: result.length, psws: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── POST /admin/psws/:id/approve ──────────────────────────────────────────────
// Approve a PSW. Creates their profile document if it doesn't exist yet.
router.post(
  '/psws/:id/approve',
  authenticate,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid PSW ID' });
      }

      const user = await User.findOne({ _id: id, role: 'PSW' });
      if (!user) return res.status(404).json({ error: 'PSW user not found' });

      const profile = await PSWProfile.findOneAndUpdate(
        { userId: id },
        { approvedByAdmin: true },
        { new: true, upsert: true }
      );

      user.isVerified = true;
      await user.save();

      res.json({ message: 'PSW approved successfully', profile });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── GET /admin/bookings ───────────────────────────────────────────────────────
// List all bookings with pagination. Optional filter: ?status=REQUESTED|ACCEPTED|...
router.get(
  '/bookings',
  authenticate,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const filter = {};
      if (status) {
        const VALID_STATUSES = ['REQUESTED', 'ACCEPTED', 'STARTED', 'COMPLETED', 'CANCELLED'];
        if (!VALID_STATUSES.includes(status)) {
          return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
        }
        filter.status = status;
      }

      const pageNum  = Math.max(1, parseInt(page,  10) || 1);
      const limitNum = Math.min(100, parseInt(limit, 10) || 20);

      const [bookings, total] = await Promise.all([
        Booking.find(filter)
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .populate('customerId', 'name phone')
          .populate('pswId',      'name phone rating'),
        Booking.countDocuments(filter),
      ]);

      res.json({
        total,
        page:  pageNum,
        pages: Math.ceil(total / limitNum),
        bookings,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
