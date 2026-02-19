const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    customerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    pswId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    serviceType: {
      type:     String,
      required: true,
      trim:     true,
    },
    hours: {
      type:     Number,
      required: true,
      min:      3,           // Business rule: minimum 3-hour booking
    },
    status: {
      type:    String,
      enum:    ['REQUESTED', 'ACCEPTED', 'STARTED', 'COMPLETED', 'CANCELLED'],
      default: 'REQUESTED',
    },
    scheduledAt: { type: Date,   required: true },
    // GeoJSON Point of the care location – used for radius matching
    location: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    price: { type: Number, required: true }, // CAD, stored as 'price', exposed as 'totalPrice'

    paymentStatus: {
      type:    String,
      enum:    ['PENDING', 'PAID', 'RELEASED'],
      default: 'PENDING',
    },
    stripePaymentIntentId: { type: String, default: null },
  },
  { timestamps: true }
);

// Required for $geoNear queries in the PSW nearby-jobs endpoint
bookingSchema.index({ location: '2dsphere' });

// ── Response transform ────────────────────────────────────────────────────────
// Renames internal field names to the public API shape that the mobile app
// expects: customerId → customer, pswId → psw, price → totalPrice.
// This fires whenever Express calls res.json() with a Booking document.
bookingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    // Populated ref OR raw ObjectId – expose under the friendly name
    if ('customerId' in ret) {
      ret.customer = ret.customerId;
      delete ret.customerId;
    }
    if ('pswId' in ret) {
      ret.psw = ret.pswId || undefined;
      delete ret.pswId;
    }
    // Rename stored 'price' field to 'totalPrice' in all API responses
    if ('price' in ret) {
      ret.totalPrice = ret.price;
      delete ret.price;
    }
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Booking', bookingSchema);
