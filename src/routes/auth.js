const express = require('express');
const { body } = require('express-validator');
const jwt      = require('jsonwebtoken');

const User               = require('../models/User');
const PSWProfile         = require('../models/PSWProfile');
const { generateOTP, verifyOTP } = require('../utils/otp');
const validate           = require('../middleware/validate');
const { authenticate }   = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ── Name sanitizer ────────────────────────────────────────────────────────────
// Title-cases each word, collapses extra spaces, strips leading/trailing "and"/"&"
function sanitizeName(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  return raw
    .trim()
    .replace(/\s+/g, ' ')                             // collapse multiple spaces
    .replace(/\b\w/g, c => c.toUpperCase())           // title-case every word
    .replace(/\s+(And|&)\s*$/i, '')                   // remove trailing "and" / "&"
    .replace(/^\s*(And|&)\s+/i, '')                   // remove leading "and" / "&"
    .trim();
}

// ── Phone normalizer ──────────────────────────────────────────────────────────
// Ensures we always store E.164 (+1XXXXXXXXXX for Canadian numbers).
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  return phone; // already in E.164 or international
}

// ── POST /auth/login ──────────────────────────────────────────────────────────
// Initiate phone OTP. Creates the user on first call (register + login in one).
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
      const { phone: rawPhone, name: rawName, role } = req.body;
      const phone = normalizePhone(rawPhone);
      const name  = rawName ? sanitizeName(rawName) : undefined;

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
      const { otp } = req.body;
      const phone   = normalizePhone(req.body.phone);

      const user = await User.findOne({ phone });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const result = await verifyOTP(phone, otp);
      if (!result.valid) {
        return res.status(400).json({ error: result.error });
      }

      const token = jwt.sign(
        { userId: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      // Fetch PSW onboarding status
      let onboardingComplete = user.onboardingComplete;
      if (user.role === 'PSW' && !onboardingComplete) {
        const profile = await PSWProfile.findOne({ userId: user._id });
        // Onboarding is complete if qualificationType was set beyond the default bare creation
        onboardingComplete = !!(profile && profile.licenseNumber);
      }

      res.json({
        token,
        user: {
          id:                 user._id,
          name:               user.name,
          role:               user.role,
          phone:              user.phone,
          onboardingComplete: onboardingComplete,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── POST /auth/psw-profile ────────────────────────────────────────────────────
// PSW submits their qualification details after OTP verification.
// Called during onboarding for new PSW users. Also used to update profile later.
// Requires JWT auth.
router.post(
  '/psw-profile',
  authenticate,
  [
    body('qualificationType')
      .optional()
      .isIn(['PSW', 'RPN', 'RN', 'OT', 'PT', 'DSW', 'HCA', 'Other'])
      .withMessage('Invalid qualification type'),
    body('experienceYears')
      .optional()
      .isInt({ min: 0, max: 50 }).withMessage('experienceYears must be 0–50'),
  ],
  validate,
  async (req, res) => {
    try {
      if (req.user.role !== 'PSW') {
        return res.status(403).json({ error: 'Only PSW accounts can submit credentials' });
      }

      const {
        qualificationType,
        licenseNumber,
        collegeName,
        experienceYears,
        specialties,
        certifications,
        firstAidCertified,
        driversLicense,
        ownTransportation,
        bio,
        languages,
      } = req.body;

      const update = {};
      if (qualificationType  !== undefined) update.qualificationType  = qualificationType;
      if (licenseNumber      !== undefined) update.licenseNumber      = licenseNumber.trim();
      if (collegeName        !== undefined) update.collegeName        = collegeName.trim();
      if (experienceYears    !== undefined) update.experienceYears    = Number(experienceYears);
      if (Array.isArray(specialties))       update.specialties        = specialties;
      if (Array.isArray(certifications))    update.certifications     = certifications;
      if (firstAidCertified  !== undefined) update.firstAidCertified  = Boolean(firstAidCertified);
      if (driversLicense     !== undefined) update.driversLicense     = Boolean(driversLicense);
      if (ownTransportation  !== undefined) update.ownTransportation  = Boolean(ownTransportation);
      if (bio                !== undefined) update.bio                = bio.trim();
      if (Array.isArray(languages))         update.languages          = languages;

      const profile = await PSWProfile.findOneAndUpdate(
        { userId: req.user._id },
        update,
        { new: true, upsert: true }
      );

      // Mark onboarding as complete on the User record
      await User.findByIdAndUpdate(req.user._id, { onboardingComplete: true });

      res.json({ message: 'PSW profile updated', profile });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
