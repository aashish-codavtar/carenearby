const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['CUSTOMER', 'PSW', 'ADMIN'],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['M', 'F', 'NB', 'prefer_not_to_say', null],
      default: null,
    },
    preferredLanguage: {
      type: String,
      default: 'English',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    // GeoJSON Point – [longitude, latitude]
    location: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    emergencyContact: {
      name:  String,
      phone: String,
    },
    // Rolling average (maintained on each rating write)
    rating:      { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    isVerified:  { type: Boolean, default: false },
    // PSW onboarding completion flag
    onboardingComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Required for $geoNear and $near queries
userSchema.index({ location: '2dsphere' });

userSchema.index({ role: 1, isVerified: 1 });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ email: 1 });
userSchema.index({ rating: -1 });

module.exports = mongoose.model('User', userSchema);
