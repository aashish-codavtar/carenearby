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
  },
  { timestamps: true }
);

// Required for $geoNear and $near queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);
