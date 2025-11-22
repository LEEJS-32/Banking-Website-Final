const express = require('express');
const router = express.Router();
const {
  getTransactions,
  deposit,
  withdraw,
  transfer,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getTransactions);
router.post('/deposit', deposit);
router.post('/withdraw', withdraw);
router.post('/transfer', transfer);

module.exports = router;
