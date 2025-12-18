const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const biometricRoutes = require('./routes/biometricRoutes');
const fingerprintRoutes = require('./routes/fingerprintRoutes');
const adminRoutes = require('./routes/adminRoutes');
const gatewayRoutes = require('./routes/gatewayRoutes');
const fraudWebsiteRoutes = require('./routes/fraudWebsiteRoutes');

// Load env vars
dotenv.config();

const app = express();

// Middleware
// Enhanced CORS for external merchant integration
app.use(cors({
  origin: '*', // Allow all origins for payment gateway (production: whitelist specific merchants)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Enable extended for nested objects

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/biometric', biometricRoutes);
app.use('/api/fingerprint', fingerprintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gateway', gatewayRoutes);
app.use('/api/admin/fraud-websites', fraudWebsiteRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Banking API is running' });
});

// Error handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();
