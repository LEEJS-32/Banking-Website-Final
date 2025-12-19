const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { validateMalaysianIC } = require('../utils/icValidator');
const { 
  preprocessICImage, 
  validateICImage, 
  imageToBase64,
  detectSecurityFeatures 
} = require('../utils/icOCR');
const { sendVerificationEmail, sendWelcomeEmail } = require('../utils/emailService');
const {
  verifyICWithDatabase,
  verifyICFrontAndBack,
  checkICRegistered
} = require('../services/icVerification');

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

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    userData.emailVerificationToken = verificationToken;
    userData.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    userData.isEmailVerified = false;

    // Create user
    const user = await User.create(userData);

    if (user) {
      // Send verification email
      console.log('User created successfully, sending verification email...');
      const emailResult = await sendVerificationEmail(user.email, user.firstName, verificationToken);
      
      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        // Continue with registration even if email fails
        // But inform the user
        return res.status(201).json({
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          accountNumber: user.accountNumber,
          balance: user.balance,
          accountType: user.accountType,
          isEmailVerified: user.isEmailVerified,
          message: 'Registration successful! However, we could not send the verification email. Please use the "Resend Verification" option.',
          emailWarning: true,
          token: generateToken(user._id),
        });
      }

      console.log('Verification email sent successfully');
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        accountNumber: user.accountNumber,
        balance: user.balance,
        accountType: user.accountType,
        isEmailVerified: user.isEmailVerified,
        message: 'Registration successful! Please check your email to verify your account.',
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
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

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is deactivated by admin
    if (!user.isActive) {
      return res.status(403).json({ 
        message: 'Your account has been deactivated. Please contact support for assistance.',
        deactivated: true
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({ 
        message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        emailNotVerified: true
      });
    }

    // Check if account is locked
    if (user.isLocked && user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000); // minutes
      return res.status(423).json({ 
        message: `Account is locked due to multiple failed login attempts. Please try again in ${remainingTime} minute(s).`,
        locked: true,
        lockUntil: user.lockUntil
      });
    }

    // Reset lock if time has passed
    if (user.isLocked && user.lockUntil && user.lockUntil <= Date.now()) {
      user.isLocked = false;
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    if (await user.comparePassword(password)) {
      // Prevent admin accounts from logging into user side
      if (user.role === 'admin') {
        return res.status(403).json({ 
          message: 'Admin accounts cannot access the user portal. Please use the admin login.' 
        });
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        user.loginAttempts = 0;
        user.isLocked = false;
        user.lockUntil = null;
        await user.save();
      }

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
      // Increment failed login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      // Lock account after 3 failed attempts
      if (user.loginAttempts >= 3) {
        user.isLocked = true;
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
        await user.save();
        
        return res.status(423).json({ 
          message: 'Account locked due to 3 failed login attempts. Please try again in 15 minutes.',
          locked: true,
          lockUntil: user.lockUntil
        });
      }

      await user.save();
      const attemptsLeft = 3 - user.loginAttempts;
      
      res.status(401).json({ 
        message: `Invalid email or password. ${attemptsLeft} attempt(s) remaining.`,
        attemptsLeft
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate admin
// @route   POST /api/auth/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      // Only allow admin accounts
      if (user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Access denied. Admin credentials required.' 
        });
      }

      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
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
// @desc    Verify Malaysian IC number (basic format check)
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

// @desc    Verify IC against mock government database
// @route   POST /api/auth/verify-ic-database
// @access  Public
const verifyICDatabase = async (req, res) => {
  try {
    const { icNumber, fullName } = req.body;

    if (!icNumber) {
      return res.status(400).json({ message: 'IC number is required' });
    }

    // First validate format
    const formatValidation = validateMalaysianIC(icNumber);
    if (!formatValidation.valid) {
      return res.status(400).json({ 
        message: formatValidation.error,
        verified: false 
      });
    }

    // Check if already registered in our system
    const registrationCheck = await checkICRegistered(icNumber, User);
    if (registrationCheck.registered) {
      return res.status(400).json({ 
        message: registrationCheck.message,
        verified: false,
        duplicate: true
      });
    }

    // Verify against mock government database
    const dbVerification = await verifyICWithDatabase(icNumber, fullName);

    if (!dbVerification.verified) {
      return res.status(400).json({
        verified: false,
        status: dbVerification.status,
        message: dbVerification.message,
        reason: dbVerification.reason
      });
    }

    // Success - return verified data
    res.json({
      verified: true,
      status: dbVerification.status,
      message: dbVerification.message,
      data: dbVerification.data
    });
  } catch (error) {
    console.error('IC database verification error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload and process IC image (front or back)
// @route   POST /api/auth/upload-ic
// @access  Public
const uploadIC = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const { side } = req.body; // 'front' or 'back'

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
    
    // Detect security features
    const securityAnalysis = await detectSecurityFeatures(req.file.buffer);
    
    // Convert to base64 for frontend OCR processing
    const base64Image = imageToBase64(processedImage);

    res.json({
      success: true,
      message: `IC ${side || 'image'} uploaded and processed successfully`,
      image: base64Image,
      side: side || 'unknown',
      metadata: {
        width: validation.width,
        height: validation.height,
        format: validation.format
      },
      securityFeatures: securityAnalysis
    });
  } catch (error) {
    console.error('IC upload error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify both front and back IC data
// @route   POST /api/auth/verify-ic-complete
// @access  Public
const verifyICComplete = async (req, res) => {
  try {
    const { frontData, backData } = req.body;

    // Validate required data
    if (!frontData || !frontData.icNumber) {
      return res.status(400).json({ 
        message: 'Front IC data (IC number) is required',
        verified: false 
      });
    }

    if (!backData || !backData.icNumber) {
      return res.status(400).json({ 
        message: 'Back IC data is required',
        verified: false 
      });
    }

    // Verify both sides match and check database
    const verification = await verifyICFrontAndBack(frontData, backData);

    if (!verification.verified) {
      return res.status(400).json({
        verified: false,
        status: verification.status,
        message: verification.message,
        details: verification
      });
    }

    // Check if already registered
    const registrationCheck = await checkICRegistered(frontData.icNumber, User);
    if (registrationCheck.registered) {
      return res.status(400).json({ 
        verified: false,
        message: registrationCheck.message,
        duplicate: true
      });
    }

    // Return complete verification result
    res.json({
      verified: true,
      status: verification.status,
      message: verification.message,
      data: verification.data,
      verificationDetails: verification.verificationDetails
    });
  } catch (error) {
    console.error('Complete IC verification error:', error);
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

// @desc    Verify email with token
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with this verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification link. Please request a new verification email.',
        expired: true
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.firstName);

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in to your account.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // Send verification email
    const emailResult = await sendVerificationEmail(user.email, user.firstName, verificationToken);

    if (!emailResult.success) {
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please try again later.',
        error: emailResult.error
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  adminLogin,
  verifyIC,
  verifyICDatabase,
  uploadIC,
  verifyICComplete,
  getProfile,
  verifyEmail,
  resendVerificationEmail,
};
