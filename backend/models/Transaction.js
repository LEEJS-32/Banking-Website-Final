const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'transfer'],
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
    enum: ['pending', 'completed', 'failed', 'blocked'],
    default: 'completed',
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
});

module.exports = mongoose.model('Transaction', transactionSchema);
