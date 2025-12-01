const User = require('../models/User');
const Transaction = require('../models/Transaction');

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.countDocuments({ role: 'user' });
    
    // Get active users
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
    
    // Get total transactions
    const totalTransactions = await Transaction.countDocuments();
    
    // Get total transaction volume
    const transactionVolume = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);
    
    // Get recent transactions
    const recentTransactions = await Transaction.find()
      .populate('userId', 'firstName lastName email accountNumber')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Get transactions by type
    const transactionsByType = await Transaction.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]);
    
    // Get biometric enabled users
    const biometricUsers = await User.countDocuments({ biometricEnabled: true });

    res.json({
      totalUsers,
      activeUsers,
      totalTransactions,
      totalVolume: transactionVolume[0]?.total || 0,
      recentTransactions,
      transactionsByType,
      biometricUsers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's transactions
    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({ user, transactions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot modify admin accounts' });
    }
    
    user.isActive = isActive;
    
    // When activating a user, also reset any login attempt blocks
    if (isActive) {
      user.loginAttempts = 0;
      user.isLocked = false;
      user.lockUntil = null;
    }
    
    await user.save();
    
    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully${isActive && user.isLocked !== false ? '. Login blocks have been cleared.' : ''}`,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive,
        isLocked: user.isLocked,
        loginAttempts: user.loginAttempts,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user balance (credit/debit)
// @route   PUT /api/admin/users/:id/balance
// @access  Private/Admin
const updateUserBalance = async (req, res) => {
  try {
    const { amount, type, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }
    
    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ message: 'Type must be credit or debit' });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (type === 'credit') {
      user.balance += amount;
    } else {
      if (user.balance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      user.balance -= amount;
    }
    
    await user.save();
    
    // Create transaction record
    await Transaction.create({
      userId: user._id,
      type: type === 'credit' ? 'deposit' : 'withdrawal',
      amount,
      description: description || `Admin ${type} - ${req.user.email}`,
      status: 'completed',
    });
    
    res.json({
      message: `Balance ${type === 'credit' ? 'credited' : 'debited'} successfully`,
      newBalance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private/Admin
const getAllTransactions = async (req, res) => {
  try {
    const { status, type, startDate, endDate } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const transactions = await Transaction.find(query)
      .populate('userId', 'firstName lastName email accountNumber')
      .sort({ createdAt: -1 });
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin accounts' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unlock user account (clear login attempt blocks)
// @route   PUT /api/admin/users/:id/unlock
// @access  Private/Admin
const unlockUserAccount = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot modify admin accounts' });
    }
    
    // Reset login attempt locks
    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = null;
    await user.save();
    
    res.json({
      message: 'User account unlocked successfully. Login blocks have been cleared.',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isLocked: user.isLocked,
        loginAttempts: user.loginAttempts,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserBalance,
  getAllTransactions,
  deleteUser,
  unlockUserAccount,
};
