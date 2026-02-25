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
    // Human-readable address (displayed in UI instead of raw coordinates)
    address:        { type: String, default: '', trim: true },

    price: { type: Number, required: true }, // CAD, stored as 'price', exposed as 'totalPrice'

    notes:       { type: String, default: '', trim: true },   // special instructions from customer
    ratingGiven: { type: Boolean, default: false },           // prevent duplicate ratings
    cancelledBy: { type: String, enum: ['CUSTOMER', 'PSW', 'ADMIN', null], default: null },

    // Care recipient (if different from account holder, e.g. booking for a parent)
    careRecipientName: { type: String, default: '', trim: true },

    // Urgency level
    urgency: {
      type:    String,
      enum:    ['routine', 'urgent', 'emergency'],
      default: 'routine',
    },

    paymentStatus: {
      type:    String,
      enum:    ['PENDING', 'PAID', 'RELEASED', 'REFUNDED', 'FAILED'],
      default: 'PENDING',
    },
    stripePaymentIntentId: { type: String, default: null },
  },
  { timestamps: true }
);

// Required for $geoNear queries in the PSW nearby-jobs endpoint
bookingSchema.index({ location: '2dsphere' });

bookingSchema.index({ customerId: 1, status: 1 });
bookingSchema.index({ pswId: 1, status: 1 });
bookingSchema.index({ status: 1, scheduledAt: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ scheduledAt: 1 });

// ── Response transform ────────────────────────────────────────────────────────
// Renames internal field names to the public API shape that the mobile app
// expects: customerId → customer, pswId → psw, price → totalPrice.
bookingSchema.set('toJSON', {
  transform: (_doc, ret) => {
    if ('customerId' in ret) {
      ret.customer = ret.customerId;
      delete ret.customerId;
    }
    if ('pswId' in ret) {
      ret.psw = ret.pswId || undefined;
      delete ret.pswId;
    }
    if ('price' in ret) {
      ret.totalPrice = ret.price;
      delete ret.price;
    }
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Booking', bookingSchema);
