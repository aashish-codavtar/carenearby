const express  = require('express');
const mongoose = require('mongoose');

const User       = require('../models/User');
const PSWProfile = require('../models/PSWProfile');
const Booking    = require('../models/Booking');
const Document   = require('../models/Document');
const { authenticate, requireRole } = require('../middleware/auth');
const { authenticateAdmin, authenticateAdminOrUser, requireAdminRole, logAudit } = require('../middleware/adminAuth');

const router = express.Router();

// ── GET /admin/psws ───────────────────────────────────────────────────────────
// List all PSWs with their profiles and approval status.
// Supports optional query: ?approved=true|false
router.get(
  '/psws',
  authenticateAdminOrUser,
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
  authenticateAdminOrUser,
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

// ── POST /admin/psws/:id/reject ───────────────────────────────────────────────
// Reject (or de-approve) a PSW with an optional reason.
router.post(
  '/psws/:id/reject',
  authenticateAdminOrUser,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid PSW ID' });
      }

      const user = await User.findOne({ _id: id, role: 'PSW' });
      if (!user) return res.status(404).json({ error: 'PSW user not found' });

      await PSWProfile.findOneAndUpdate(
        { userId: id },
        { approvedByAdmin: false, rejectionReason: reason || 'Application not approved.' },
        { upsert: true, new: true }
      );

      user.isVerified = false;
      await user.save();

      res.json({ message: 'PSW rejected', reason: reason || 'Application not approved.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── GET /admin/psws/:id ───────────────────────────────────────────────────────
// Get full detail for one PSW including submitted documents.
router.get(
  '/psws/:id',
  authenticateAdminOrUser,
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid PSW ID' });
      }

      const user = await User.findOne({ _id: id, role: 'PSW' }).lean();
      if (!user) return res.status(404).json({ error: 'PSW not found' });

      const profile = await PSWProfile.findOne({ userId: id }).lean();

      res.json({ psw: { ...user, profile } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── POST /admin/psws/:id/verify-document ──────────────────────────────────────
// Admin verifies or rejects a specific submitted document.
// Body: { docType: string, verified: boolean, rejectionNote?: string }
router.post(
  '/psws/:id/verify-document',
  authenticateAdminOrUser,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { docType, verified, rejectionNote } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid PSW ID' });
      }
      if (!docType) return res.status(400).json({ error: 'docType is required' });

      const profile = await PSWProfile.findOne({ userId: id });
      if (!profile) return res.status(404).json({ error: 'PSW profile not found' });

      const doc = profile.submittedDocuments.find(d => d.docType === docType);
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      doc.verifiedByAdmin = !!verified;
      doc.verifiedAt      = verified ? new Date() : undefined;
      doc.rejectionNote   = rejectionNote || '';
      await profile.save();

      res.json({ message: verified ? 'Document verified' : 'Document rejected', docType });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── PATCH /admin/psws/:id/police-check ────────────────────────────────────────
// Admin toggles policeCheckCleared for a PSW.
// Body: { cleared: boolean }
router.patch(
  '/psws/:id/police-check',
  authenticateAdminOrUser,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { cleared } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid PSW ID' });
      }

      const profile = await PSWProfile.findOneAndUpdate(
        { userId: id },
        { policeCheckCleared: !!cleared },
        { new: true }
      );
      if (!profile) return res.status(404).json({ error: 'PSW profile not found' });

      res.json({ message: `Police check ${cleared ? 'cleared' : 'uncleared'}`, policeCheckCleared: profile.policeCheckCleared });
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
  authenticateAdminOrUser,
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

// ── Document Management Endpoints ─────────────────────────────────────────────

// GET /admin/documents - List all documents with filters
router.get(
  '/documents',
  authenticateAdminOrUser,
  async (req, res) => {
    try {
      const { status, docType, entityType, page = 1, limit = 20 } = req.query;

      const filter = {};
      if (status) filter.status = status;
      if (docType) filter.docType = docType;
      if (entityType) filter.entityType = entityType;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, parseInt(limit, 10) || 20);

      const [documents, total] = await Promise.all([
        Document.find(filter)
          .sort({ submittedAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .populate('reviewedBy', 'username')
          .lean(),
        Document.countDocuments(filter),
      ]);

      res.json({
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        documents,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /admin/documents/pending - Get pending documents count
router.get(
  '/documents/pending',
  authenticateAdminOrUser,
  async (req, res) => {
    try {
      const count = await Document.countDocuments({ status: 'PENDING', isActive: true });
      res.json({ pendingCount: count });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /admin/documents/:id - Get document detail
router.get(
  '/documents/:id',
  authenticateAdminOrUser,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }

      const document = await Document.findById(id)
        .populate('reviewedBy', 'username')
        .lean();

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.json({ document });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /admin/documents/:id/approve - Approve a document
router.post(
  '/documents/:id/approve',
  authenticateAdminOrUser,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      await document.approve(req.user._id, notes || '');
      await logAudit(req.user._id, 'DOCUMENT_APPROVED', 'Document', document._id, { docType: document.docType }, req);

      res.json({ message: 'Document approved', document });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /admin/documents/:id/reject - Reject a document
router.post(
  '/documents/:id/reject',
  authenticateAdminOrUser,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }

      if (!reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const document = await Document.findById(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      await document.reject(req.user._id, reason);
      await logAudit(req.user._id, 'DOCUMENT_REJECTED', 'Document', document._id, { docType: document.docType, reason }, req);

      res.json({ message: 'Document rejected', document });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /admin/documents/psw/:pswId - Get all documents for a PSW
router.get(
  '/documents/psw/:pswId',
  authenticateAdminOrUser,
  async (req, res) => {
    try {
      const { pswId } = req.params;

      if (!mongoose.isValidObjectId(pswId)) {
        return res.status(400).json({ error: 'Invalid PSW ID' });
      }

      const profile = await PSWProfile.findOne({ userId: pswId });
      if (!profile) {
        return res.status(404).json({ error: 'PSW profile not found' });
      }

      const documents = await Document.find({
        entityType: 'PSW',
        entityId: profile._id,
        isActive: true,
      })
        .sort({ submittedAt: -1 })
        .lean();

      res.json({ documents });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ── Audit Log Endpoints ─────────────────────────────────────────────────────

router.get(
  '/audit-logs',
  authenticateAdminOrUser,
  async (req, res) => {
    try {
      const { action, page = 1, limit = 50 } = req.query;
      const AuditLog = require('../models/AuditLog');

      const filter = {};
      if (action) filter.action = action;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, parseInt(limit, 10) || 50);

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .populate('adminId', 'username')
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      res.json({
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        logs,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
