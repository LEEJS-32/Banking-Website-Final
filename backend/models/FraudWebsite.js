const mongoose = require('mongoose');

const fraudWebsiteSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  merchantName: {
    type: String,
    required: true,
    trim: true,
  },
  reason: {
    type: String,
    required: true,
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high',
  },
  reportedBy: {
    type: String,
    default: 'System',
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  blockedTransactions: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster domain lookups
fraudWebsiteSchema.index({ domain: 1 });

module.exports = mongoose.model('FraudWebsite', fraudWebsiteSchema);
