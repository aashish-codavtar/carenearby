const mongoose = require('mongoose');

const ACTION_TYPES = [
  'PSW_APPROVED',
  'PSW_REJECTED',
  'DOCUMENT_APPROVED',
  'DOCUMENT_REJECTED',
  'BOOKING_CANCELLED',
  'PAYMENT_RELEASED',
  'SETTINGS_CHANGED',
  'ADMIN_LOGIN',
  'ADMIN_LOGOUT',
];

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Admin',
      required: true,
    },
    action: {
      type:     String,
      enum:     ACTION_TYPES,
      required: true,
    },
    entityType: {
      type: String,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
module.exports.ACTION_TYPES = ACTION_TYPES;
