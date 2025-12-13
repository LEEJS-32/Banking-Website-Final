const Transaction = require('../models/Transaction');
const User = require('../models/User');
const mongoose = require('mongoose');
const { checkFraud } = require('../services/fraudDetection');
const { checkRateLimit } = require('../middleware/rateLimit');

// @desc    Get all transactions for user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Deposit money
// @route   POST /api/transactions/deposit
// @access  Private
const deposit = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, description } = req.body;

    if (amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(req.user._id, parseFloat(amount));
    if (!rateLimitResult.allowed) {
      // Create blocked transaction record
      const user = await User.findById(req.user._id).session(session);
      await Transaction.create([{
        userId: req.user._id,
        type: 'deposit',
        amount: parseFloat(amount),
        description: description || 'Deposit',
        balanceAfter: user.balance,
        status: 'blocked',
        blockReason: rateLimitResult.reason,
      }], { session });
      
      await session.commitTransaction();
      return res.status(429).json({
        message: 'Transaction limit exceeded',
        blocked: true,
        reason: rateLimitResult.reason,
        blockedUntil: rateLimitResult.blockedUntil,
        minutesRemaining: rateLimitResult.minutesRemaining,
      });
    }

    // Update user balance
    const user = await User.findById(req.user._id).session(session);
    user.balance += parseFloat(amount);
    await user.save({ session });

    // Create transaction record
    const transaction = await Transaction.create([{
      userId: req.user._id,
      type: 'deposit',
      amount: parseFloat(amount),
      description: description || 'Deposit',
      balanceAfter: user.balance,
      status: 'completed',
    }], { session });

    await session.commitTransaction();
    res.status(201).json({
      transaction: transaction[0],
      newBalance: user.balance,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Withdraw money
// @route   POST /api/transactions/withdraw
// @access  Private
const withdraw = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, description } = req.body;

    if (amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(req.user._id, parseFloat(amount));
    if (!rateLimitResult.allowed) {
      // Create blocked transaction record
      const user = await User.findById(req.user._id).session(session);
      await Transaction.create([{
        userId: req.user._id,
        type: 'withdrawal',
        amount: parseFloat(amount),
        description: description || 'Withdrawal',
        balanceAfter: user.balance,
        status: 'blocked',
        blockReason: rateLimitResult.reason,
      }], { session });
      
      await session.commitTransaction();
      return res.status(429).json({
        message: 'Transaction limit exceeded',
        blocked: true,
        reason: rateLimitResult.reason,
        blockedUntil: rateLimitResult.blockedUntil,
        minutesRemaining: rateLimitResult.minutesRemaining,
      });
    }

    const user = await User.findById(req.user._id).session(session);

    if (user.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Insufficient funds' });
    }

    // Update user balance
    user.balance -= parseFloat(amount);
    await user.save({ session });

    // Create transaction record
    const transaction = await Transaction.create([{
      userId: req.user._id,
      type: 'withdrawal',
      amount: parseFloat(amount),
      description: description || 'Withdrawal',
      balanceAfter: user.balance,
      status: 'completed',
    }], { session });

    await session.commitTransaction();
    res.status(201).json({
      transaction: transaction[0],
      newBalance: user.balance,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Transfer money
// @route   POST /api/transactions/transfer
// @access  Private
const transfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, recipientAccountNumber, description } = req.body;

    if (amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    // Check rate limit BEFORE fraud detection
    const rateLimitResult = await checkRateLimit(req.user._id, parseFloat(amount));
    if (!rateLimitResult.allowed) {
      // Create blocked transaction record
      const sender = await User.findById(req.user._id).session(session);
      const recipient = await User.findOne({ accountNumber: recipientAccountNumber }).session(session);
      
      await Transaction.create([{
        userId: req.user._id,
        type: 'transfer',
        amount: parseFloat(amount),
        recipientId: recipient?._id,
        recipientAccountNumber: recipientAccountNumber,
        recipientName: recipient ? `${recipient.firstName} ${recipient.lastName}` : 'Unknown',
        description: description || 'Transfer',
        balanceAfter: sender.balance,
        status: 'blocked',
        blockReason: rateLimitResult.reason,
      }], { session });
      
      await session.commitTransaction();
      return res.status(429).json({
        message: 'Transaction limit exceeded',
        blocked: true,
        reason: rateLimitResult.reason,
        blockedUntil: rateLimitResult.blockedUntil,
        minutesRemaining: rateLimitResult.minutesRemaining,
      });
    }

    const sender = await User.findById(req.user._id).session(session);
    const recipient = await User.findOne({ accountNumber: recipientAccountNumber }).session(session);

    if (!recipient) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Recipient account not found' });
    }

    if (sender.accountNumber === recipientAccountNumber) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Cannot transfer to your own account' });
    }

    if (sender.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Insufficient funds' });
    }

    // Fraud Detection Check with correct 14-feature format
    const fraudResult = await checkFraud({
      amount,
      description: description || 'transfer',
      senderProfile: {
        gender: sender.gender || 'M',
        dateOfBirth: sender.dateOfBirth,
        bank: sender.bank || 'HSBC',
        country: sender.country || 'United Kingdom',
        shippingAddress: sender.shippingAddress || sender.country || 'United Kingdom',
      },
    });

    // If high-risk fraud detected, block the transaction
    if (fraudResult.is_fraud && fraudResult.risk_level === 'high') {
      // Save blocked transaction record before aborting
      await Transaction.create([{
        userId: sender._id,
        type: 'transfer',
        amount: -parseFloat(amount),
        recipientAccountNumber: recipient.accountNumber,
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        description: description || 'Transfer',
        balanceAfter: sender.balance, // Balance unchanged
        status: 'blocked',
        fraudDetection: {
          checked: true,
          isFraud: fraudResult.is_fraud,
          fraudProbability: fraudResult.fraud_probability,
          riskLevel: fraudResult.risk_level,
          reasons: fraudResult.reasons || [],
          recommendation: 'BLOCK',
        },
      }], { session });

      await session.commitTransaction();
      
      return res.status(403).json({
        message: 'Transaction blocked due to high fraud risk',
        fraudDetection: {
          isFraud: fraudResult.is_fraud,
          riskLevel: fraudResult.risk_level,
          probability: fraudResult.fraud_probability,
          reasons: fraudResult.reasons,
        },
      });
    }

    // Update balances
    sender.balance -= parseFloat(amount);
    recipient.balance += parseFloat(amount);

    await sender.save({ session });
    await recipient.save({ session });

    // Create transaction records with fraud detection info
    const senderTransaction = await Transaction.create([{
      userId: sender._id,
      type: 'transfer',
      amount: -parseFloat(amount),
      recipientAccountNumber: recipient.accountNumber,
      recipientName: `${recipient.firstName} ${recipient.lastName}`,
      description: description || 'Transfer',
      balanceAfter: sender.balance,
      status: (fraudResult.is_fraud && fraudResult.risk_level === 'medium') ? 'pending' : 'completed',
      fraudDetection: {
        checked: true,
        isFraud: fraudResult.is_fraud,
        fraudProbability: fraudResult.fraud_probability,
        riskLevel: fraudResult.risk_level,
        reasons: fraudResult.reasons || [],
        recommendation: fraudResult.recommendation || 'APPROVE',
      },
    }], { session });

    await Transaction.create([{
      userId: recipient._id,
      type: 'transfer',
      amount: parseFloat(amount),
      recipientAccountNumber: sender.accountNumber,
      recipientName: `${sender.firstName} ${sender.lastName}`,
      description: description || 'Transfer received',
      balanceAfter: recipient.balance,
      status: fraudResult.recommendation === 'REVIEW' ? 'pending' : 'completed',
    }], { session });

    await session.commitTransaction();
    
    const response = {
      transaction: senderTransaction[0],
      newBalance: sender.balance,
      fraudDetection: {
        checked: true,
        isFraud: fraudResult.is_fraud,
        riskLevel: fraudResult.risk_level,
        probability: fraudResult.fraud_probability,
        reasons: fraudResult.reasons || [],
      },
    };

    // Add warning for medium risk transactions
    if (fraudResult.is_fraud && fraudResult.risk_level === 'medium') {
      response.warning = {
        message: 'Transaction flagged for review due to medium risk',
        fraudDetection: {
          riskLevel: fraudResult.risk_level,
          probability: fraudResult.fraud_probability,
          reasons: fraudResult.reasons,
        },
      };
    }

    res.status(201).json(response);
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = {
  getTransactions,
  deposit,
  withdraw,
  transfer,
};
