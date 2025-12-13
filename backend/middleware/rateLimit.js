const User = require('../models/User');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// Rate limiting configuration
const RATE_LIMITS = {
  RAPID_FIRE: {
    count: 3,
    windowMinutes: 5,
    blockMinutes: 30,
  },
  HOURLY: {
    count: 10,
    windowMinutes: 60,
    blockMinutes: 30,
  },
  HIGH_VALUE_THRESHOLD: 1000, // Transactions > RM1000 count as 2
};

/**
 * Check if user is currently blocked from transactions
 */
const checkTransactionBlock = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(req.user._id).session(session);

    // Check if user is currently blocked
    if (user.transactionBlockedUntil && new Date() < user.transactionBlockedUntil) {
      const minutesLeft = Math.ceil((user.transactionBlockedUntil - new Date()) / 60000);
      
      // Create a blocked transaction record for this attempt
      const { amount, recipientAccountNumber, description } = req.body;
      const transactionType = req.path.includes('deposit') ? 'deposit' : 
                            req.path.includes('withdraw') ? 'withdrawal' : 'transfer';
      
      const transactionData = {
        userId: req.user._id,
        type: transactionType,
        amount: parseFloat(amount) || 0,
        description: description || `Blocked ${transactionType}`,
        balanceAfter: user.balance,
        status: 'blocked',
        blockReason: user.transactionBlockReason,
      };

      // Add recipient info for transfers
      if (transactionType === 'transfer' && recipientAccountNumber) {
        const recipient = await User.findOne({ accountNumber: recipientAccountNumber }).session(session);
        if (recipient) {
          transactionData.recipientId = recipient._id;
          transactionData.recipientAccountNumber = recipientAccountNumber;
          transactionData.recipientName = `${recipient.firstName} ${recipient.lastName}`;
        }
      }

      await Transaction.create([transactionData], { session });
      await session.commitTransaction();

      return res.status(429).json({
        message: 'Too many transactions. Please try again later.',
        blocked: true,
        reason: user.transactionBlockReason,
        blockedUntil: user.transactionBlockedUntil,
        minutesRemaining: minutesLeft,
      });
    }

    // Clear block if expired
    if (user.transactionBlockedUntil && new Date() >= user.transactionBlockedUntil) {
      user.transactionBlockedUntil = undefined;
      user.transactionBlockReason = undefined;
      await user.save({ session });
    }

    await session.commitTransaction();
    next();
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Check rate limits before transaction
 */
const checkRateLimit = async (userId, amount, fraudScore = 0) => {
  try {
    const user = await User.findById(userId);
    const now = new Date();

    // Clean up old transactions (older than 1 hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    user.recentTransactions = user.recentTransactions.filter(
      t => new Date(t.timestamp) > oneHourAgo
    );

    // Calculate transaction weight (high-value transactions count as 2)
    const weight = amount > RATE_LIMITS.HIGH_VALUE_THRESHOLD ? 2 : 1;

    // Adjust limits based on fraud score (high fraud users get lower limits)
    const rapidFireLimit = fraudScore > 0.7 ? 2 : RATE_LIMITS.RAPID_FIRE.count;
    const hourlyLimit = fraudScore > 0.7 ? 7 : RATE_LIMITS.HOURLY.count;

    // Check rapid fire (last 5 minutes)
    const fiveMinutesAgo = new Date(now.getTime() - RATE_LIMITS.RAPID_FIRE.windowMinutes * 60 * 1000);
    const recentCount = user.recentTransactions
      .filter(t => new Date(t.timestamp) > fiveMinutesAgo)
      .reduce((sum, t) => sum + (t.weight || 1), 0);

    if (recentCount + weight > rapidFireLimit) {
      // Block user for 30 minutes
      user.transactionBlockedUntil = new Date(now.getTime() + RATE_LIMITS.RAPID_FIRE.blockMinutes * 60 * 1000);
      user.transactionBlockReason = `Too many transactions in short time (${recentCount + weight}/${rapidFireLimit} in 5 minutes)`;
      await user.save();

      return {
        allowed: false,
        reason: user.transactionBlockReason,
        blockedUntil: user.transactionBlockedUntil,
        minutesRemaining: RATE_LIMITS.RAPID_FIRE.blockMinutes,
      };
    }

    // Check hourly limit
    const totalCount = user.recentTransactions.reduce((sum, t) => sum + (t.weight || 1), 0);

    if (totalCount + weight > hourlyLimit) {
      // Block user for 30 minutes
      user.transactionBlockedUntil = new Date(now.getTime() + RATE_LIMITS.HOURLY.blockMinutes * 60 * 1000);
      user.transactionBlockReason = `Transaction limit exceeded (${totalCount + weight}/${hourlyLimit} per hour)`;
      await user.save();

      return {
        allowed: false,
        reason: user.transactionBlockReason,
        blockedUntil: user.transactionBlockedUntil,
        minutesRemaining: RATE_LIMITS.HOURLY.blockMinutes,
      };
    }

    // Add current transaction to recent list
    user.recentTransactions.push({
      timestamp: now,
      amount: amount,
      weight: weight,
    });

    await user.save();

    return {
      allowed: true,
      recentCount: recentCount + weight,
      totalCount: totalCount + weight,
      remainingRapid: rapidFireLimit - (recentCount + weight),
      remainingHourly: hourlyLimit - (totalCount + weight),
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true }; // Fail open to not block legitimate transactions
  }
};

/**
 * Get user's current rate limit status
 */
const getRateLimitStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const now = new Date();

    // Clean up old transactions
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    user.recentTransactions = user.recentTransactions.filter(
      t => new Date(t.timestamp) > oneHourAgo
    );

    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const recentCount = user.recentTransactions
      .filter(t => new Date(t.timestamp) > fiveMinutesAgo)
      .reduce((sum, t) => sum + (t.weight || 1), 0);

    const totalCount = user.recentTransactions.reduce((sum, t) => sum + (t.weight || 1), 0);

    const isBlocked = user.transactionBlockedUntil && now < user.transactionBlockedUntil;

    res.json({
      isBlocked,
      blockedUntil: user.transactionBlockedUntil,
      blockReason: user.transactionBlockReason,
      minutesRemaining: isBlocked ? Math.ceil((user.transactionBlockedUntil - now) / 60000) : 0,
      limits: {
        rapidFire: {
          current: recentCount,
          max: RATE_LIMITS.RAPID_FIRE.count,
          remaining: Math.max(0, RATE_LIMITS.RAPID_FIRE.count - recentCount),
          windowMinutes: RATE_LIMITS.RAPID_FIRE.windowMinutes,
        },
        hourly: {
          current: totalCount,
          max: RATE_LIMITS.HOURLY.count,
          remaining: Math.max(0, RATE_LIMITS.HOURLY.count - totalCount),
          windowMinutes: RATE_LIMITS.HOURLY.windowMinutes,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  checkTransactionBlock,
  checkRateLimit,
  getRateLimitStatus,
  RATE_LIMITS,
};
