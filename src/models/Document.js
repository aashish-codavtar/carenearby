const mongoose = require('mongoose');

const DOCUMENT_TYPES = [
  'police_check',
  'psw_certificate',
  'first_aid_cert',
  'driver_license',
  'insurance',
  'id_proof',
  'photo',
  'resume',
  'other',
];

const documentSchema = new mongoose.Schema(
  {
    entityType: {
      type:     String,
      enum:     ['PSW', 'CUSTOMER', 'BOOKING', 'GENERAL'],
      required: true,
    },
    entityId: {
      type:     mongoose.Schema.Types.ObjectId,
      required: true,
    },
    docType: {
      type:     String,
      enum:     DOCUMENT_TYPES,
      required: true,
    },
    label: {
      type:    String,
      default: '',
    },
    fileName: {
      type:    String,
      required: true,
    },
    originalName: {
      type:    String,
      required: true,
    },
    mimeType: {
      type:    String,
      required: true,
    },
    size: {
      type:    Number,
      required: true,
    },
    storagePath: {
      type:    String,
      default: '',
    },
    url: {
      type:    String,
      default: '',
    },
    // Fallback: base64 data URL when no cloud storage is configured
    dataUrl: {
      type:    String,
      default: '',
    },
    status: {
      type:    String,
      enum:    ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    submittedAt: {
      type:    Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Admin',
    },
    rejectionReason: {
      type:    String,
      default: '',
    },
    notes: {
      type:    String,
      default: '',
    },
    expiresAt: {
      type: Date,
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

documentSchema.index({ entityType: 1, entityId: 1 });
documentSchema.index({ entityType: 1, docType: 1, status: 1 });
documentSchema.index({ status: 1, submittedAt: -1 });
documentSchema.index({ reviewedBy: 1 });

documentSchema.methods.approve = async function (adminId, note = '') {
  this.status       = 'APPROVED';
  this.reviewedAt   = new Date();
  this.reviewedBy   = adminId;
  this.rejectionReason = '';
  this.notes       = note;
  return this.save();
};

documentSchema.methods.reject = async function (adminId, reason) {
  this.status           = 'REJECTED';
  this.reviewedAt      = new Date();
  this.reviewedBy      = adminId;
  this.rejectionReason = reason || 'Rejected by admin';
  return this.save();
};

module.exports = mongoose.model('Document', documentSchema);

module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
