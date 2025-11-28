const express = require('express');
const router = express.Router();
const { register, login, adminLogin, verifyIC, uploadIC, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../config/multer');

router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/verify-ic', verifyIC);
router.post('/upload-ic', upload.single('icImage'), uploadIC);
router.get('/profile', protect, getProfile);

module.exports = router;
