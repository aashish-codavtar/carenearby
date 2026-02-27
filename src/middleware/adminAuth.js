const jwt    = require('jsonwebtoken');
const Admin  = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const User   = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';


// Accepts both Admin-model tokens (web panel) and User-model tokens with role=ADMIN (mobile app)
async function authenticateAdminOrUser(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.adminId) {
      const admin = await Admin.findById(payload.adminId).lean();
      if (!admin) return res.status(401).json({ error: 'Admin not found' });
      if (!admin.isActive) return res.status(401).json({ error: 'Admin account is disabled' });
      req.admin = admin;
      req.adminId = admin._id;
      req.user = { _id: admin._id, role: 'ADMIN', name: admin.username };
      return next();
    } else if (payload.userId) {
      const user = await User.findById(payload.userId).lean();
      if (!user) return res.status(401).json({ error: 'User not found' });
      if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
      req.user = user;
      return next();
    }
    return res.status(401).json({ error: 'Invalid token payload' });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function authenticateAdmin(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const admin   = await Admin.findById(payload.adminId).lean();

    if (!admin) return res.status(401).json({ error: 'Admin not found' });
    if (!admin.isActive) return res.status(401).json({ error: 'Admin account is disabled' });

    req.admin = admin;
    req.adminId = admin._id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdminRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

async function logAudit(adminId, action, entityType, entityId, details = {}, req) {
  try {
    await AuditLog.create({
      adminId,
      action,
      entityType,
      entityId,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

module.exports = { authenticateAdmin, authenticateAdminOrUser, requireAdminRole, logAudit };
