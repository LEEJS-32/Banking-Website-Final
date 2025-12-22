const mongoose = require('mongoose');

const fraudDetectionSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    index: true,
  },
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
    min: 0,
    max: 1,
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
  // ML Model details
  modelVersion: {
    type: String,
  },
  threshold: {
    type: Number,
  },
  // Input features used
  features: {
    amount: Number,
    transactionHour: Number,
    merchantGroup: String,
    userAge: Number,
    userGender: String,
    countryOfTransaction: String,
    countryOfResidence: String,
    bank: String,
  },
  // SHAP values for explainability
  shapValues: [{
    feature: String,
    value: Number,
  }],
  checkedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('FraudDetection', fraudDetectionSchema);
