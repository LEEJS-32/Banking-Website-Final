const express = require('express');
const router = express.Router();
const {
  getTransactions,
  deposit,
  withdraw,
  transfer,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const { checkTransactionBlock, getRateLimitStatus } = require('../middleware/rateLimit');

router.use(protect);

// Rate limit status check
router.get('/rate-limit-status', getRateLimitStatus);

// Apply transaction block check to all transaction routes
router.get('/', getTransactions);
router.post('/deposit', checkTransactionBlock, deposit);
router.post('/withdraw', checkTransactionBlock, withdraw);
router.post('/transfer', checkTransactionBlock, transfer);

module.exports = router;
