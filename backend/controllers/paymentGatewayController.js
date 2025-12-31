const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Account = require('../models/Account');
const FraudWebsite = require('../models/FraudWebsite');
const PendingPayment = require('../models/PendingPayment');
const mongoose = require('mongoose');
const { checkRateLimit } = require('../middleware/rateLimit');
const { checkFraud } = require('../services/fraudDetection');

/**
 * Extract domain from URL
 */
const extractDomain = (url) => {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.toLowerCase().replace('www.', '');
  } catch (error) {
    return url.toLowerCase().replace('www.', '');
  }
};

/**
 * Check if merchant domain is blacklisted
 */
const checkMerchantDomain = async (merchantUrl) => {
  try {
    const domain = extractDomain(merchantUrl);
    
    // Check if domain is blacklisted
    const fraudWebsite = await FraudWebsite.findOne({ 
      domain: domain,
      isActive: true 
    });

    if (fraudWebsite) {
      // Increment blocked transaction count
      fraudWebsite.blockedTransactions += 1;
      await fraudWebsite.save();

      return {
        isFraud: true,
        fraudWebsite: fraudWebsite,
        reason: fraudWebsite.reason,
        riskLevel: fraudWebsite.riskLevel,
      };
    }

    return { isFraud: false };
  } catch (error) {
    console.error('Domain check error:', error);
    return { isFraud: false }; // Fail open - allow transaction if check fails
  }
};

/**
 * @desc    Initiate payment gateway transaction
 * @route   POST /api/gateway/initiate
 * @access  Public (called by external websites)
 */
const initiatePayment = async (req, res) => {
  try {
    const { merchantUrl, amount, orderId, merchantName, description, returnUrl } = req.body;

    if (!merchantUrl || !amount || !merchantName) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: merchantUrl, amount, merchantName' 
      });
    }

    // Validate amount
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid amount' 
      });
    }

    // Generate payment session ID
    const sessionId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check merchant domain
    const domainCheck = await checkMerchantDomain(merchantUrl);
    
    // Build frontend payment URL (where user will be redirected)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const paymentUrl = `${frontendUrl}/payment/${sessionId}?` + 
      new URLSearchParams({
        merchantUrl,
        merchantName,
        amount,
        orderId: orderId || '',
        description: description || '',
        returnUrl: returnUrl || ''
      }).toString();

    res.json({
      success: true,
      sessionId,
      merchantUrl,
      merchantName,
      amount,
      orderId,
      description,
      returnUrl,
      domain: extractDomain(merchantUrl),
      paymentUrl, // URL to redirect user to
      domainCheck: domainCheck.isFraud ? {
        isFraud: true,
        reason: domainCheck.reason,
        riskLevel: domainCheck.riskLevel,
      } : { isFraud: false }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Process payment through gateway
 * @route   POST /api/gateway/process
 * @access  Private
 */
const processPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      merchantUrl, 
      merchantName, 
      amount, 
      orderId, 
      description,
      sessionId,
      pendingPaymentId
    } = req.body;

    if (!merchantUrl || !amount || !merchantName || !sessionId) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if this session has already been completed
    const completedTransaction = await Transaction.findOne({ sessionId, status: 'completed' });
    if (completedTransaction) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: 'This payment has already been completed. Please initiate a new payment.',
        alreadyPaid: true
      });
    }

    const parsedAmount = parseFloat(amount);

    if (parsedAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(req.user._id, parsedAmount);
    if (!rateLimitResult.allowed) {
      await session.abortTransaction();
      return res.status(429).json({
        message: 'Transaction limit exceeded',
        blocked: true,
        reason: rateLimitResult.reason,
        blockedUntil: rateLimitResult.blockedUntil,
        minutesRemaining: rateLimitResult.minutesRemaining,
      });
    }

    // CRITICAL: Find existing pending transaction early so we can update it
    // for fraud blocks and success paths without violating the unique sessionId index.
    // Search WITHOUT session to avoid transaction isolation issues.
    let existingPending = null;

    if (pendingPaymentId) {
      existingPending = await Transaction.findById(pendingPaymentId);
      console.log(`Found pending by ID: ${existingPending ? existingPending._id : 'NOT FOUND'}`);
    }

    if (!existingPending) {
      existingPending = await Transaction.findOne({ sessionId, status: 'pending' });
      console.log(`Found pending by sessionId: ${existingPending ? existingPending._id : 'NOT FOUND'}`);
    }

    if (!existingPending) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'No pending payment found for this session. Please refresh and try again.',
        noPending: true,
      });
    }

    // Check merchant domain for fraud
    const domainCheck = await checkMerchantDomain(merchantUrl);
    const domain = extractDomain(merchantUrl);

    if (domainCheck.isFraud) {
      // Update existing pending transaction -> blocked
      const user = await User.findById(req.user._id).session(session);
      const account = await Account.findOne({ userId: user._id, isPrimary: true }).session(session);

      if (!account) {
        await session.abortTransaction();
        return res.status(404).json({ message: 'No account found for this user' });
      }

      existingPending.status = 'blocked';
      existingPending.balanceAfter = account.balance;
      existingPending.blockReason = `Fraudulent merchant detected: ${domainCheck.reason}`;
      existingPending.expiresAt = undefined; // no longer an "abandoned" pending session
      existingPending.fraudWebsiteDetection = {
        detected: true,
        domain,
        merchantName,
        reason: domainCheck.reason,
        riskLevel: domainCheck.riskLevel,
      };

      await existingPending.save({ session });

      await session.commitTransaction();

      return res.status(403).json({
        success: false,
        blocked: true,
        message: 'Transaction blocked - Fraudulent merchant detected',
        reason: domainCheck.reason,
        riskLevel: domainCheck.riskLevel,
        domain: domain,
      });
    }

    // Process payment
    const user = await User.findById(req.user._id).session(session);
    const account = await Account.findOne({ userId: user._id, isPrimary: true }).session(session);

    if (!account) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'No account found for this user' });
    }

    if (account.balance < parsedAmount) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Insufficient funds' });
    }

    // Fraud detection (ML) - same logic as money transfer
    const fraudResult = await checkFraud({
      amount: parsedAmount,
      description: description || `payment to ${merchantName}`,
      senderProfile: {
        gender: user.gender || 'M',
        dateOfBirth: user.dateOfBirth,
        bank: account.bank || 'HSBC',
        country: account.country || 'United Kingdom',
        shippingAddress: account.shippingAddress || account.country || 'United Kingdom',
      },
    });

    if (fraudResult.is_fraud && fraudResult.risk_level === 'high') {
      // Block payment; do NOT deduct funds
      existingPending.status = 'blocked';
      existingPending.balanceAfter = account.balance;
      existingPending.blockReason = (fraudResult?.reasons?.length)
        ? `Transaction blocked due to high fraud risk: ${fraudResult.reasons[0]}`
        : 'Transaction blocked due to high fraud risk';
      existingPending.expiresAt = undefined;
      existingPending.fraudDetection = {
        checked: true,
        isFraud: fraudResult.is_fraud,
        fraudProbability: fraudResult.fraud_probability,
        riskLevel: fraudResult.risk_level,
        reasons: fraudResult.reasons || [],
        recommendation: 'BLOCK',
      };

      await existingPending.save({ session });
      await session.commitTransaction();

      return res.status(403).json({
        success: false,
        blocked: true,
        message: 'Transaction blocked due to high fraud risk',
        reason: (fraudResult.reasons && fraudResult.reasons[0]) || 'High fraud risk detected',
        fraudDetection: {
          isFraud: fraudResult.is_fraud,
          riskLevel: fraudResult.risk_level,
          probability: fraudResult.fraud_probability,
          reasons: fraudResult.reasons || [],
        },
      });
    }

    // Deduct balance from account
    account.balance -= parsedAmount;
    await account.save({ session });

    // Update accountId in the pending transaction
    if (!existingPending.accountId) {
      existingPending.accountId = account._id;
    }

    // Update the existing pending transaction with fraud detection + final status
    const shouldReview =
      (fraudResult.is_fraud && fraudResult.risk_level === 'medium') ||
      fraudResult.recommendation === 'REVIEW';

    existingPending.status = shouldReview ? 'pending' : 'completed';
    existingPending.balanceAfter = account.balance;
    existingPending.expiresAt = undefined;
    existingPending.fraudDetection = {
      checked: true,
      isFraud: fraudResult.is_fraud,
      fraudProbability: fraudResult.fraud_probability,
      riskLevel: fraudResult.risk_level,
      reasons: fraudResult.reasons || [],
      recommendation: shouldReview ? 'REVIEW' : (fraudResult.recommendation || 'APPROVE'),
    };

    if (!shouldReview) {
      existingPending.completedAt = new Date();
    }

    await existingPending.save({ session });

    // Safety cleanup: if duplicates exist from earlier races, remove them now.
    await Transaction.deleteMany({
      sessionId,
      status: 'pending',
      _id: { $ne: existingPending._id },
    }).session(session);
    
    console.log(`✓ Updated pending transaction ${existingPending._id} to completed`);
    
    const transaction = existingPending;

    await session.commitTransaction();

    res.json({
      success: true,
      message: shouldReview ? 'Payment submitted for review' : 'Payment successful',
      transaction: transaction,
      newBalance: account.balance,
      sessionId: sessionId,
      fraudDetection: {
        checked: true,
        isFraud: fraudResult.is_fraud,
        riskLevel: fraudResult.risk_level,
        probability: fraudResult.fraud_probability,
        reasons: fraudResult.reasons || [],
        recommendation: shouldReview ? 'REVIEW' : (fraudResult.recommendation || 'APPROVE'),
      },
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get payment session details
 * @route   GET /api/gateway/session/:sessionId
 * @access  Private
 */
const getPaymentSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // In production, you'd store session data in Redis or database
    // For now, we'll return a basic response
    res.json({
      sessionId,
      message: 'Payment session retrieved',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Create pending payment record
 * @route   POST /api/gateway/pending
 * @access  Private
 */
const createPendingPayment = async (req, res) => {
  try {
    const {
      sessionId,
      merchantUrl,
      merchantName,
      amount,
      orderId,
      description,
      returnUrl
    } = req.body;

    if (!sessionId || !merchantUrl || !merchantName || !amount || !orderId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await User.findById(req.user._id);
    const account = await Account.findOne({ userId: user._id, isPrimary: true });

    if (!account) {
      return res.status(404).json({ message: 'No account found for this user' });
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Atomic upsert keyed by sessionId. With the unique sparse index on sessionId,
    // this guarantees there is only ever ONE Transaction per payment session.
    const pendingTransaction = await Transaction.findOneAndUpdate(
      { sessionId },
      {
        $set: { expiresAt },
        $setOnInsert: {
          sessionId,
          userId: req.user._id,
          accountId: account._id,
          type: 'payment',
          amount: parseFloat(amount),
          description: description || `Payment to ${merchantName}`,
          merchantUrl,
          merchantName,
          merchantDomain: extractDomain(merchantUrl),
          orderId,
          balanceAfter: account.balance,
          status: 'pending',
        },
      },
      { new: true, upsert: true }
    );

    // If the transaction already existed and is not pending, we still return its id
    // (so the caller can display status / prevent creating duplicates).
    res.json({
      success: true,
      pendingPaymentId: pendingTransaction._id,
      expiresAt: pendingTransaction.expiresAt,
      alreadyExists: pendingTransaction.status !== 'pending',
    });
  } catch (error) {
    console.error('Error creating pending payment:', error);
    // Duplicate key can occur under heavy concurrency; return the existing session.
    if (error.code === 11000 && req.body?.sessionId) {
      const existingTransaction = await Transaction.findOne({ sessionId: req.body.sessionId });
      if (existingTransaction) {
        return res.json({
          success: true,
          pendingPaymentId: existingTransaction._id,
          expiresAt: existingTransaction.expiresAt,
          alreadyExists: true,
        });
      }
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all pending payments (Admin)
 * @route   GET /api/gateway/pending-payments
 * @access  Private/Admin
 */
const getPendingPayments = async (req, res) => {
  try {
    // Expire old payments first
    await PendingPayment.expireOldPayments();

    const pendingPayments = await PendingPayment.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      pendingPayments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Cancel pending payment
 * @route   PUT /api/gateway/pending/:id/cancel
 * @access  Private
 */
const cancelPendingPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const pendingPayment = await PendingPayment.findById(id);

    if (!pendingPayment) {
      return res.status(404).json({ message: 'Pending payment not found' });
    }

    // Check if user owns this payment or is admin
    if (pendingPayment.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (pendingPayment.status !== 'pending') {
      return res.status(400).json({ message: 'Payment cannot be cancelled' });
    }

    pendingPayment.status = 'cancelled';
    await pendingPayment.save();

    res.json({
      success: true,
      message: 'Payment cancelled'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  initiatePayment,
  processPayment,
  getPaymentSession,
  createPendingPayment,
  getPendingPayments,
  cancelPendingPayment,
  checkMerchantDomain,
  extractDomain,
};
