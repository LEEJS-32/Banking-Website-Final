const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUserStatus,
  updateUserBalance,
  getAllTransactions,
  deleteUser,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

// Apply authentication and admin middleware to all routes
router.use(protect);
router.use(adminOnly);

// Dashboard
router.get('/dashboard', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/balance', updateUserBalance);
router.delete('/users/:id', deleteUser);

// Transaction management
router.get('/transactions', getAllTransactions);

module.exports = router;
