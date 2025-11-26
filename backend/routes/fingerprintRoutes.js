const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  checkScanner,
  enrollFingerprint,
  verifyFingerprint,
  removeFingerprint,
  getStatus,
} = require('../controllers/fingerprintController');

// All routes require authentication
router.use(protect);

// GET /api/fingerprint/health - Check scanner status
router.get('/health', checkScanner);

// GET /api/fingerprint/status - Get enrollment status
router.get('/status', getStatus);

// POST /api/fingerprint/enroll - Enroll fingerprint
router.post('/enroll', enrollFingerprint);

// POST /api/fingerprint/verify - Verify fingerprint
router.post('/verify', verifyFingerprint);

// DELETE /api/fingerprint/remove - Remove fingerprint
router.delete('/remove', removeFingerprint);

module.exports = router;
