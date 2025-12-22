const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  accountNumber: {
    type: String,
    unique: true,
    required: true,
  },
  accountType: {
    type: String,
    enum: ['savings', 'checking'],
    default: 'checking',
  },
  balance: {
    type: Number,
    default: 0,
  },
  bank: {
    type: String,
    required: true,
    default: 'HSBC',
  },
  country: {
    type: String,
    required: true,
    default: 'United Kingdom',
  },
  shippingAddress: {
    type: String,
    default: 'United Kingdom',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
accountSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Account', accountSchema);
