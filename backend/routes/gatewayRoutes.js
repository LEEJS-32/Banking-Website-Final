const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  processPayment,
  getPaymentSession,
  createPendingPayment,
  getPendingPayments,
  cancelPendingPayment,
} = require('../controllers/paymentGatewayController');
const { protect } = require('../middleware/auth');
const { checkTransactionBlock } = require('../middleware/rateLimit');

// Public route - external websites can call this
router.post('/initiate', initiatePayment);

// Protected routes - require user authentication
router.post('/process', protect, checkTransactionBlock, processPayment);
router.get('/session/:sessionId', protect, getPaymentSession);
router.post('/pending', protect, createPendingPayment);
router.get('/pending-payments', protect, getPendingPayments);
router.put('/pending/:id/cancel', protect, cancelPendingPayment);

module.exports = router;
