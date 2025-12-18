const mongoose = require('mongoose');

const pendingPaymentSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  merchantUrl: {
    type: String,
    required: true
  },
  merchantName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  returnUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired', 'cancelled'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from creation
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for automatic expiry cleanup
pendingPaymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Mark as expired if past expiration time
pendingPaymentSchema.methods.isExpired = function() {
  return this.status === 'pending' && new Date() > this.expiresAt;
};

// Static method to expire old pending payments
pendingPaymentSchema.statics.expireOldPayments = async function() {
  const result = await this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { status: 'expired' }
    }
  );
  return result.modifiedCount;
};

module.exports = mongoose.model('PendingPayment', pendingPaymentSchema);
