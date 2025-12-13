const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  accountNumber: {
    type: String,
    unique: true,
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  accountType: {
    type: String,
    enum: ['savings', 'checking'],
    default: 'checking',
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Fraud Detection Fields
  gender: {
    type: String,
    enum: ['M', 'F'],
    default: 'M',
  },
  dateOfBirth: {
    type: Date,
  },
  bank: {
    type: String,
    default: 'HSBC',
  },
  country: {
    type: String,
    default: 'United Kingdom',
  },
  shippingAddress: {
    type: String,
    default: 'United Kingdom',
  },
  // Malaysian IC eKYC
  icNumber: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but enforces uniqueness for non-null
  },
  icVerified: {
    type: Boolean,
    default: false,
  },
  icVerifiedAt: {
    type: Date,
  },
  birthPlace: {
    type: String,
  },
  biometricCredentials: [{
    credentialId: String,
    publicKey: String,
    counter: Number,
    deviceName: String,
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
  }],
  biometricEnabled: {
    type: Boolean,
    default: false,
  },
  // Fingerprint Scanner (R307)
  fingerprintEnrolled: {
    type: Boolean,
    default: false,
  },
  fingerprintEnrolledAt: {
    type: Date,
  },
  fingerprintDevice: {
    type: String,
    default: 'R307',
  },
  // Failed Login Attempts Tracking
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  // Email Verification
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationExpires: {
    type: Date,
  },
  // Rate Limiting for Transaction Frequency
  recentTransactions: [{
    timestamp: {
      type: Date,
      default: Date.now,
    },
    amount: Number,
    weight: {
      type: Number,
      default: 1, // Transactions > RM1000 = weight 2
    },
  }],
  transactionBlockedUntil: {
    type: Date,
  },
  transactionBlockReason: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
