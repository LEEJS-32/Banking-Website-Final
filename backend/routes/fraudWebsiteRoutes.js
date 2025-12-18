const express = require('express');
const router = express.Router();
const {
  getAllFraudWebsites,
  addFraudWebsite,
  updateFraudWebsite,
  deleteFraudWebsite,
  getFraudWebsiteStats,
} = require('../controllers/fraudWebsiteController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

// Apply authentication and admin middleware
router.use(protect);
router.use(adminOnly);

router.get('/stats', getFraudWebsiteStats);
router.get('/', getAllFraudWebsites);
router.post('/', addFraudWebsite);
router.put('/:id', updateFraudWebsite);
router.delete('/:id', deleteFraudWebsite);

module.exports = router;
