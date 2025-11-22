const User = require('../models/User');
const crypto = require('crypto');

// Generate challenge for biometric enrollment/verification
const generateChallenge = () => {
  return crypto.randomBytes(32).toString('base64');
};

// @desc    Enroll biometric credential
// @route   POST /api/biometric/enroll
// @access  Private
const enrollBiometric = async (req, res) => {
  try {
    const { credentialId, publicKey, deviceName } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if credential already exists
    const existingCredential = user.biometricCredentials.find(
      cred => cred.credentialId === credentialId
    );

    if (existingCredential) {
      return res.status(400).json({ message: 'This biometric credential is already enrolled' });
    }

    // Add new credential
    user.biometricCredentials.push({
      credentialId,
      publicKey,
      counter: 0,
      deviceName: deviceName || 'Unknown Device',
    });

    user.biometricEnabled = true;
    await user.save();

    res.status(201).json({
      message: 'Biometric enrolled successfully',
      biometricEnabled: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove biometric credential
// @route   DELETE /api/biometric/remove/:credentialId
// @access  Private
const removeBiometric = async (req, res) => {
  try {
    const { credentialId } = req.params;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Store initial count
    const initialCount = user.biometricCredentials.length;

    // Filter out the credential
    user.biometricCredentials = user.biometricCredentials.filter(
      cred => cred.credentialId !== credentialId
    );

    // Check if any credential was actually removed
    if (user.biometricCredentials.length === initialCount) {
      return res.status(404).json({ message: 'Biometric credential not found' });
    }

    // Disable biometric if no credentials left
    if (user.biometricCredentials.length === 0) {
      user.biometricEnabled = false;
    }

    await user.save();

    res.json({
      message: 'Biometric credential removed successfully',
      biometricEnabled: user.biometricEnabled,
      remainingCredentials: user.biometricCredentials.length,
    });
  } catch (error) {
    console.error('Error removing biometric:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify biometric for transaction
// @route   POST /api/biometric/verify
// @access  Private
const verifyBiometric = async (req, res) => {
  try {
    const { credentialId, signature } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the credential
    const credential = user.biometricCredentials.find(
      cred => cred.credentialId === credentialId
    );

    if (!credential) {
      return res.status(404).json({ message: 'Biometric credential not found' });
    }

    // In a real implementation, you would verify the signature here
    // For this demo, we'll accept the presence of credentialId as verification
    
    res.json({
      verified: true,
      message: 'Biometric verification successful',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get biometric status
// @route   GET /api/biometric/status
// @access  Private
const getBiometricStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('biometricEnabled biometricCredentials');

    res.json({
      biometricEnabled: user.biometricEnabled,
      credentials: user.biometricCredentials.map(cred => ({
        credentialId: cred.credentialId,
        deviceName: cred.deviceName,
        enrolledAt: cred.enrolledAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate registration challenge
// @route   GET /api/biometric/challenge/register
// @access  Private
const getRegistrationChallenge = async (req, res) => {
  try {
    const challenge = generateChallenge();
    
    res.json({
      challenge,
      user: {
        id: req.user._id.toString(),
        name: req.user.email,
        displayName: `${req.user.firstName} ${req.user.lastName}`,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  enrollBiometric,
  removeBiometric,
  verifyBiometric,
  getBiometricStatus,
  getRegistrationChallenge,
};
