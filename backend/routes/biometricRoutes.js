const express = require('express');
const router = express.Router();
const {
  enrollBiometric,
  removeBiometric,
  verifyBiometric,
  getBiometricStatus,
  getRegistrationChallenge,
} = require('../controllers/biometricController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/status', getBiometricStatus);
router.get('/challenge/register', getRegistrationChallenge);
router.post('/enroll', enrollBiometric);
router.post('/verify', verifyBiometric);
router.delete('/remove/:credentialId', removeBiometric);

module.exports = router;
