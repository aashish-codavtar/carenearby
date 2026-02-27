const mongoose = require('mongoose');

// MongoDB-backed OTP store – survives server restarts and works across multiple instances
const otpSchema = new mongoose.Schema({
  phone:     { type: String, required: true },
  otp:       { type: String, required: true },
  attempts:  { type: Number, default: 0 },        // failed verify attempts
  expiresAt: { type: Date,   required: true },
}, { timestamps: true });

// Lookup by phone
otpSchema.index({ phone: 1 });

// Auto-delete expired documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
