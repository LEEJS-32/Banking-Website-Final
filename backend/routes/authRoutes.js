const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  adminLogin, 
  verifyIC,
  verifyICDatabase,
  uploadIC,
  verifyICComplete,
  getProfile,
  verifyEmail,
  resendVerificationEmail
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../config/multer');

router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/verify-ic', verifyIC);
router.post('/verify-ic-database', verifyICDatabase);
router.post('/upload-ic', upload.single('icImage'), uploadIC);
router.post('/verify-ic-complete', verifyICComplete);
router.get('/profile', protect, getProfile);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

module.exports = router;
