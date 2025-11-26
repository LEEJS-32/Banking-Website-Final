const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateMalaysianIC } = require('../utils/icValidator');
const { preprocessICImage, validateICImage, imageToBase64 } = require('../utils/icOCR');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Generate random account number
const generateAccountNumber = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      accountType,
      gender,
      dateOfBirth,
      bank,
      country,
      icNumber, // Malaysian IC for eKYC
    } = req.body;

    // Validate Malaysian IC if provided
    let icData = null;
    if (icNumber) {
      icData = validateMalaysianIC(icNumber);
      if (!icData.valid) {
        return res.status(400).json({ message: icData.error });
      }
      
      // Check if IC already registered
      const icExists = await User.findOne({ icNumber: icData.icNumber });
      if (icExists) {
        return res.status(400).json({ message: 'This IC number is already registered' });
      }
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate unique account number
    let accountNumber = generateAccountNumber();
    let accountExists = await User.findOne({ accountNumber });
    
    while (accountExists) {
      accountNumber = generateAccountNumber();
      accountExists = await User.findOne({ accountNumber });
    }

    // Prepare user data
    const userData = {
      firstName,
      lastName,
      email,
      password,
      accountNumber,
      accountType: accountType || 'checking',
      balance: 1000, // Initial bonus
      // Fraud detection fields - use IC data if available
      gender: icData ? icData.gender : (gender || 'M'),
      dateOfBirth: icData ? icData.dateOfBirth : (dateOfBirth || null),
      bank: bank || 'HSBC',
      country: country || 'Malaysia',
      shippingAddress: country || 'Malaysia',
    };

    // Add IC data if verified
    if (icData) {
      userData.icNumber = icData.icNumber;
      userData.icVerified = true;
      userData.icVerifiedAt = new Date();
      userData.birthPlace = icData.birthPlace;
    }

    // Create user
    const user = await User.create(userData);

    if (user) {
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        accountNumber: user.accountNumber,
        balance: user.balance,
        accountType: user.accountType,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        accountNumber: user.accountNumber,
        balance: user.balance,
        accountType: user.accountType,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @desc    Verify Malaysian IC number
// @route   POST /api/auth/verify-ic
// @access  Public
const verifyIC = async (req, res) => {
  try {
    const { icNumber } = req.body;

    if (!icNumber) {
      return res.status(400).json({ message: 'IC number is required' });
    }

    // Validate IC format and extract data
    const validation = validateMalaysianIC(icNumber);

    if (!validation.valid) {
      return res.status(400).json({ 
        message: 'Invalid IC number format or age requirement not met',
        valid: false 
      });
    }

    // Check if IC already registered
    const existingUser = await User.findOne({ icNumber: validation.icNumber });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'This IC number is already registered',
        valid: false,
        duplicate: true
      });
    }

    // Return validated IC data for auto-fill
    res.json({
      valid: true,
      message: 'IC verified successfully',
      data: {
        icNumber: validation.icNumber,
        formattedIC: validation.formattedIC,
        dateOfBirth: validation.dateOfBirth,
        age: validation.age,
        gender: validation.gender,
        birthPlace: validation.birthPlace
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload and process IC image
// @route   POST /api/auth/upload-ic
// @access  Public
const uploadIC = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    // Validate image
    const validation = await validateICImage(req.file.buffer);
    if (!validation.valid) {
      return res.status(400).json({ 
        message: validation.messages.join(' '),
        valid: false 
      });
    }

    // Preprocess image for better OCR
    const processedImage = await preprocessICImage(req.file.buffer);
    
    // Convert to base64 for frontend OCR processing
    const base64Image = imageToBase64(processedImage);

    res.json({
      success: true,
      message: 'Image uploaded and processed successfully',
      image: base64Image,
      metadata: {
        width: validation.width,
        height: validation.height,
        format: validation.format
      }
    });
  } catch (error) {
    console.error('IC upload error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  verifyIC,
  uploadIC,
  getProfile,
};
