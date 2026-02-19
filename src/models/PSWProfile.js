const mongoose = require('mongoose');

const pswProfileSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true,
    },
    certifications:  { type: [String], default: [] },
    experienceYears: { type: Number,   default: 0 },
    documents: {
      idProof:     { type: String, default: '' },
      certificate: { type: String, default: '' },
    },
    availability:    { type: Boolean, default: true },
    approvedByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PSWProfile', pswProfileSchema);
