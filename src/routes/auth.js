const express = require('express');
const { body } = require('express-validator');
const jwt      = require('jsonwebtoken');

const User               = require('../models/User');
const PSWProfile         = require('../models/PSWProfile');
const { generateOTP, verifyOTP } = require('../utils/otp');
const validate           = require('../middleware/validate');

const router = express.Router();

// ── POST /auth/login ──────────────────────────────────────────────────────────
// Initiate phone OTP. Creates the user on first call (register + login in one step).
// Body: { phone, name?, role? }
//   - First-time users must supply name + role (CUSTOMER | PSW)
//   - Returning users only need phone
router.post(
  '/login',
  [
    body('phone')
      .trim()
      .notEmpty().withMessage('phone is required'),
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('name must not be blank if provided'),
    body('role')
      .optional()
      .isIn(['CUSTOMER', 'PSW']).withMessage('role must be CUSTOMER or PSW'),
  ],
  validate,
  async (req, res) => {
    try {
      const { phone, name, role } = req.body;

      let user = await User.findOne({ phone });

      if (!user) {
        // New user – registration fields required
        if (!name || !role) {
          return res.status(400).json({
            error: 'First-time users must provide name and role (CUSTOMER or PSW)',
          });
        }
        user = await User.create({ phone, name, role });

        // Create an empty PSW profile so admin can approve later
        if (role === 'PSW') {
          await PSWProfile.create({ userId: user._id });
        }
      }

      generateOTP(phone);

      res.json({ message: 'OTP sent', phone });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── POST /auth/verify ─────────────────────────────────────────────────────────
// Verify OTP and return a JWT.
// Body: { phone, otp }
router.post(
  '/verify',
  [
    body('phone').trim().notEmpty().withMessage('phone is required'),
    body('otp')
      .trim()
      .isLength({ min: 6, max: 6 }).withMessage('otp must be exactly 6 digits')
      .isNumeric().withMessage('otp must be numeric'),
  ],
  validate,
  async (req, res) => {
    try {
      const { phone, otp } = req.body;

      const user = await User.findOne({ phone });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const result = await verifyOTP(phone, otp);
      if (!result.valid) {
        return res.status(400).json({ error: result.error });
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        token,
        user: {
          id:    user._id,
          name:  user.name,
          role:  user.role,
          phone: user.phone,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
