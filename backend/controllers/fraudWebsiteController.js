const FraudWebsite = require('../models/FraudWebsite');
const { extractDomain } = require('../controllers/paymentGatewayController');

// @desc    Get all fraud websites
// @route   GET /api/admin/fraud-websites
// @access  Private/Admin
const getAllFraudWebsites = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    let query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const fraudWebsites = await FraudWebsite.find(query)
      .populate('addedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(fraudWebsites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add fraud website to blacklist
// @route   POST /api/admin/fraud-websites
// @access  Private/Admin
const addFraudWebsite = async (req, res) => {
  try {
    const { url, merchantName, reason, riskLevel, reportedBy } = req.body;

    if (!url || !merchantName || !reason) {
      return res.status(400).json({ message: 'URL, merchant name, and reason are required' });
    }

    const domain = extractDomain(url);

    // Check if already exists
    const existing = await FraudWebsite.findOne({ domain });
    if (existing) {
      return res.status(400).json({ 
        message: 'This domain is already in the blacklist',
        existingEntry: existing 
      });
    }

    const fraudWebsite = await FraudWebsite.create({
      domain,
      merchantName,
      reason,
      riskLevel: riskLevel || 'high',
      reportedBy: reportedBy || 'Admin',
      addedBy: req.user._id,
    });

    res.status(201).json({
      message: 'Fraud website added to blacklist successfully',
      fraudWebsite,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update fraud website
// @route   PUT /api/admin/fraud-websites/:id
// @access  Private/Admin
const updateFraudWebsite = async (req, res) => {
  try {
    const { merchantName, reason, riskLevel, isActive } = req.body;

    const fraudWebsite = await FraudWebsite.findById(req.params.id);

    if (!fraudWebsite) {
      return res.status(404).json({ message: 'Fraud website not found' });
    }

    if (merchantName) fraudWebsite.merchantName = merchantName;
    if (reason) fraudWebsite.reason = reason;
    if (riskLevel) fraudWebsite.riskLevel = riskLevel;
    if (isActive !== undefined) fraudWebsite.isActive = isActive;

    await fraudWebsite.save();

    res.json({
      message: 'Fraud website updated successfully',
      fraudWebsite,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete fraud website
// @route   DELETE /api/admin/fraud-websites/:id
// @access  Private/Admin
const deleteFraudWebsite = async (req, res) => {
  try {
    const fraudWebsite = await FraudWebsite.findById(req.params.id);

    if (!fraudWebsite) {
      return res.status(404).json({ message: 'Fraud website not found' });
    }

    await FraudWebsite.findByIdAndDelete(req.params.id);

    res.json({ message: 'Fraud website removed from blacklist' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get fraud website statistics
// @route   GET /api/admin/fraud-websites/stats
// @access  Private/Admin
const getFraudWebsiteStats = async (req, res) => {
  try {
    const total = await FraudWebsite.countDocuments();
    const active = await FraudWebsite.countDocuments({ isActive: true });
    const totalBlocked = await FraudWebsite.aggregate([
      { $group: { _id: null, total: { $sum: '$blockedTransactions' } } }
    ]);

    const byRiskLevel = await FraudWebsite.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
    ]);

    res.json({
      total,
      active,
      inactive: total - active,
      totalBlockedTransactions: totalBlocked[0]?.total || 0,
      byRiskLevel: byRiskLevel.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllFraudWebsites,
  addFraudWebsite,
  updateFraudWebsite,
  deleteFraudWebsite,
  getFraudWebsiteStats,
};
