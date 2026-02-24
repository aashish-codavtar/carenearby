const mongoose = require('mongoose');

const pswProfileSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true,
    },

    // ── Qualification ─────────────────────────────────────────────────────────
    qualificationType: {
      type:    String,
      enum:    ['PSW', 'RPN', 'RN', 'OT', 'PT', 'DSW', 'HCA', 'Other'],
      default: 'PSW',
    },
    licenseNumber:  { type: String, default: '' },   // College registration number
    collegeName:    { type: String, default: '' },   // Issuing college / institution

    certifications:  { type: [String], default: [] },
    experienceYears: { type: Number,   default: 0 },

    // ── Documents (base64 data URLs uploaded by PSW) ─────────────────────────
    documents: {
      idProof:     { type: String, default: '' },
      certificate: { type: String, default: '' },
    },
    // ── Structured submitted documents with admin verification ────────────────
    submittedDocuments: [
      {
        docType:         { type: String, required: true },  // 'police_check', 'psw_certificate', etc.
        label:           { type: String, default: '' },
        dataUrl:         { type: String, default: '' },     // base64 data URL
        submittedAt:     { type: Date,   default: Date.now },
        verifiedByAdmin: { type: Boolean, default: false },
        verifiedAt:      { type: Date },
        rejectionNote:   { type: String, default: '' },
      },
    ],

    // ── Availability & Admin ──────────────────────────────────────────────────
    availability:    { type: Boolean, default: true },
    approvedByAdmin: { type: Boolean, default: false },
    rejectionReason: { type: String,  default: '' },
    bio:             { type: String,  default: '', trim: true },

    // ── Trust & matching ─────────────────────────────────────────────────────
    languages:          { type: [String], default: ['English'] },
    photoUrl:           { type: String,  default: '' },
    specialties:        { type: [String], default: [] },
    policeCheckCleared: { type: Boolean, default: false },

    // ── Additional verification flags ─────────────────────────────────────────
    firstAidCertified: { type: Boolean, default: false },
    driversLicense:    { type: Boolean, default: false },
    ownTransportation: { type: Boolean, default: false },
    insuranceVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PSWProfile', pswProfileSchema);
