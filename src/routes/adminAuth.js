const express    = require('express');
const jwt        = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Admin      = require('../models/Admin');
const { authenticateAdmin, logAudit } = require('../middleware/adminAuth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

router.post(
  '/bootstrap',
  async (req, res) => {
    try {
      const adminCount = await Admin.countDocuments();
      if (adminCount > 0) {
        return res.status(400).json({ error: 'Admin already exists' });
      }

      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const admin = await Admin.create({
        username: username.toLowerCase(),
        passwordHash: password,
        email: 'admin@carenearby.com',
        role: 'SUPER_ADMIN',
        isActive: true,
        permissions: {
          canApprovePSW: true,
          canVerifyDocuments: true,
          canManageBookings: true,
          canViewAnalytics: true,
        },
      });

      res.json({ message: 'Admin created', username: admin.username });
    } catch (err) {
      console.error('Bootstrap error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, password } = req.body;

      const admin = await Admin.findOne({ username: username.toLowerCase() });
      if (!admin) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!admin.isActive) {
        return res.status(401).json({ error: 'Account is disabled' });
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      admin.lastLogin = new Date();
      await admin.save();

      const token = jwt.sign(
        { adminId: admin._id, role: admin.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      await logAudit(admin._id, 'ADMIN_LOGIN', null, null, { username: admin.username }, req);

      res.json({
        token,
        admin: admin.toJSON(),
        expiresIn: 604800,
      });
    } catch (err) {
      console.error('Admin login error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.post(
  '/logout',
  authenticateAdmin,
  async (req, res) => {
    await logAudit(req.adminId, 'ADMIN_LOGOUT', null, null, {}, req);
    res.json({ message: 'Logged out successfully' });
  }
);

router.get(
  '/me',
  authenticateAdmin,
  async (req, res) => {
    res.json({ admin: req.admin });
  }
);

router.post(
  '/change-password',
  authenticateAdmin,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      const admin = await Admin.findById(req.adminId);
      const isMatch = await admin.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      admin.passwordHash = newPassword;
      await admin.save();

      res.json({ message: 'Password changed successfully' });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
