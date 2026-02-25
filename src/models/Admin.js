const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    username: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      lowercase: true,
    },
    passwordHash: {
      type:     String,
      required: true,
    },
    email: {
      type:     String,
      unique:   true,
      trim:     true,
      lowercase: true,
    },
    role: {
      type:    String,
      enum:   ['ADMIN', 'SUPER_ADMIN'],
      default: 'ADMIN',
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    permissions: {
      canApprovePSW:      { type: Boolean, default: true },
      canVerifyDocuments: { type: Boolean, default: true },
      canManageBookings:  { type: Boolean, default: true },
      canViewAnalytics:   { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

adminSchema.index({ username: 1 });
adminSchema.index({ email: 1 });

adminSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

adminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('Admin', adminSchema);
