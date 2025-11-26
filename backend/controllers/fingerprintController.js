const axios = require('axios');
const User = require('../models/User');

const FINGERPRINT_API = 'http://localhost:5002';

/**
 * Check if fingerprint scanner is connected
 */
exports.checkScanner = async (req, res) => {
  try {
    const response = await axios.get(`${FINGERPRINT_API}/health`);
    res.json(response.data);
  } catch (error) {
    console.error('Fingerprint scanner check error:', error.message);
    res.status(500).json({
      error: 'Failed to connect to fingerprint scanner',
      details: error.message,
    });
  }
};

/**
 * Enroll a fingerprint for the authenticated user
 */
exports.enrollFingerprint = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already enrolled
    if (user.fingerprintEnrolled) {
      return res.status(400).json({
        error: 'Fingerprint already enrolled. Remove existing fingerprint first.',
      });
    }

    // Call fingerprint API to enroll
    const response = await axios.post(`${FINGERPRINT_API}/enroll`, {
      userId: user.email,
    });

    if (response.data.success) {
      // Update user record
      user.fingerprintEnrolled = true;
      user.fingerprintEnrolledAt = new Date();
      user.fingerprintDevice = 'R307';
      user.biometricEnabled = true; // Also enable biometric flag
      await user.save();

      res.json({
        success: true,
        message: 'Fingerprint enrolled successfully',
        enrolledAt: user.fingerprintEnrolledAt,
      });
    } else {
      res.status(400).json({
        error: 'Failed to enroll fingerprint',
        details: response.data,
      });
    }
  } catch (error) {
    console.error('Fingerprint enrollment error:', error.message);
    
    // Handle specific error messages from fingerprint API
    if (error.response && error.response.data) {
      return res.status(error.response.status || 500).json({
        error: error.response.data.error || 'Failed to enroll fingerprint',
      });
    }
    
    res.status(500).json({
      error: 'Failed to enroll fingerprint',
      details: error.message,
    });
  }
};

/**
 * Verify fingerprint for the authenticated user
 */
exports.verifyFingerprint = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.fingerprintEnrolled) {
      return res.status(400).json({
        error: 'No fingerprint enrolled for this user',
      });
    }

    // Call fingerprint API to verify
    const response = await axios.post(`${FINGERPRINT_API}/verify`, {
      userId: user.email,
    });

    if (response.data.verified) {
      res.json({
        verified: true,
        message: 'Fingerprint verified successfully',
        score: response.data.score,
      });
    } else {
      res.status(401).json({
        verified: false,
        message: response.data.message || 'Fingerprint verification failed',
        score: response.data.score,
      });
    }
  } catch (error) {
    console.error('Fingerprint verification error:', error.message);
    
    // Handle specific error messages from fingerprint API
    if (error.response && error.response.data) {
      return res.status(error.response.status || 500).json({
        error: error.response.data.error || 'Failed to verify fingerprint',
      });
    }
    
    res.status(500).json({
      error: 'Failed to verify fingerprint',
      details: error.message,
    });
  }
};

/**
 * Remove fingerprint for the authenticated user
 */
exports.removeFingerprint = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.fingerprintEnrolled) {
      return res.status(400).json({
        error: 'No fingerprint enrolled for this user',
      });
    }

    // Call fingerprint API to remove
    const response = await axios.post(`${FINGERPRINT_API}/remove`, {
      userId: user.email,
    });

    if (response.data.success) {
      // Update user record
      user.fingerprintEnrolled = false;
      user.fingerprintEnrolledAt = null;
      user.fingerprintDevice = null;
      
      // Only disable biometric if no other biometric methods are enrolled
      if (user.biometricCredentials.length === 0) {
        user.biometricEnabled = false;
      }
      
      await user.save();

      res.json({
        success: true,
        message: 'Fingerprint removed successfully',
      });
    } else {
      res.status(400).json({
        error: 'Failed to remove fingerprint',
        details: response.data,
      });
    }
  } catch (error) {
    console.error('Fingerprint removal error:', error.message);
    
    // Handle specific error messages from fingerprint API
    if (error.response && error.response.data) {
      return res.status(error.response.status || 500).json({
        error: error.response.data.error || 'Failed to remove fingerprint',
      });
    }
    
    res.status(500).json({
      error: 'Failed to remove fingerprint',
      details: error.message,
    });
  }
};

/**
 * Get fingerprint enrollment status for the authenticated user
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      enrolled: user.fingerprintEnrolled || false,
      enrolledAt: user.fingerprintEnrolledAt,
      device: user.fingerprintDevice,
    });
  } catch (error) {
    console.error('Get fingerprint status error:', error.message);
    res.status(500).json({
      error: 'Failed to get fingerprint status',
      details: error.message,
    });
  }
};
