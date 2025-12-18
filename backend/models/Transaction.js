const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer', 'payment'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  recipientAccountNumber: {
    type: String,
  },
  recipientName: {
    type: String,
  },
  description: {
    type: String,
    trim: true,
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'blocked', 'expired'],
    default: 'completed',
  },
  blockReason: {
    type: String,
  },
  // Payment Gateway fields
  merchantUrl: {
    type: String,
  },
  merchantName: {
    type: String,
  },
  merchantDomain: {
    type: String,
  },
  orderId: {
    type: String,
  },
  sessionId: {
    type: String,
  },
  fraudWebsiteDetection: {
    detected: {
      type: Boolean,
      default: false,
    },
    domain: {
      type: String,
    },
    merchantName: {
      type: String,
    },
    reason: {
      type: String,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
    },
  },
  fraudDetection: {
    checked: {
      type: Boolean,
      default: false,
    },
    isFraud: {
      type: Boolean,
      default: false,
    },
    fraudProbability: {
      type: Number,
      default: 0,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'unknown'],
      default: 'low',
    },
    reasons: [{
      type: String,
    }],
    recommendation: {
      type: String,
      enum: ['APPROVE', 'REVIEW', 'BLOCK'],
      default: 'APPROVE',
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
});

// IMPORTANT:
// Payment gateway sessions must map to exactly one Transaction.
// We manage the unique index manually at startup after deduping legacy data.
transactionSchema.set('autoIndex', false);

// Index for pending transaction expiry
transactionSchema.index({ status: 1, expiresAt: 1 });

// Unique per payment session (sparse so non-gateway transactions are unaffected)
transactionSchema.index({ sessionId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Transaction', transactionSchema);
