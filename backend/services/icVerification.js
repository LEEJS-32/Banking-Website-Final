const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');

let ICRecord;
try {
  // Optional dependency for environments that haven't migrated yet
  ICRecord = require('../models/ICRecord');
} catch (e) {
  ICRecord = null;
}

// Path to mock IC database
const DB_PATH = path.join(__dirname, '../data/mockICDatabase.json');

/**
 * Load mock IC database
 * @returns {Promise<Object>} Database object
 */
const loadDatabase = async () => {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading IC database:', error);
    return { validICs: [], blacklistedICs: [], revokedICs: [] };
  }
};

const normalizeIC = (icNumber) => String(icNumber || '').replace(/[-\s]/g, '');

const queryICRecordFromMongo = async (cleanIC) => {
  if (!ICRecord) return { ok: false, record: null };
  if (mongoose.connection?.readyState !== 1) return { ok: false, record: null }; // 1 = connected

  try {
    const record = await ICRecord.findOne({ icNumber: cleanIC }).lean();
    return { ok: true, record };
  } catch (error) {
    console.error('Error querying ICRecord from MongoDB:', error);
    return { ok: false, record: null };
  }
};

const verifyICAgainstRecord = async (record, cleanIC, fullName = null) => {
  if (!record) {
    return {
      verified: false,
      status: 'not_found',
      message:
        'IC number not found in government database. This could be a fake or invalid IC.',
      suggestion:
        'Please verify your IC number and try again. If the issue persists, contact support.',
    };
  }

  if (record.recordType === 'blacklisted') {
    return {
      verified: false,
      status: 'blacklisted',
      reason: record.reason,
      message: 'This IC has been reported and cannot be used for registration',
      reportedDate: record.reportedDate,
    };
  }

  if (record.recordType === 'revoked') {
    return {
      verified: false,
      status: 'revoked',
      reason: record.reason,
      message: 'This IC has been revoked and is no longer valid',
      revokedDate: record.revokedDate,
    };
  }

  // recordType: valid
  if (fullName) {
    const normalizedInputName = fullName.trim().toUpperCase();
    const normalizedDBName = String(record.fullName || '').toUpperCase();

    if (normalizedInputName !== normalizedDBName) {
      return {
        verified: false,
        status: 'name_mismatch',
        message: 'The name does not match the IC number in our records',
        expectedName: record.fullName,
      };
    }
  }

  return {
    verified: true,
    status: 'active',
    message: 'IC verified successfully against government database',
    data: {
      icNumber: record.icNumber,
      fullName: record.fullName,
      gender: record.gender,
      dateOfBirth: record.dateOfBirth,
      birthPlace: record.birthPlace,
      nationality: record.nationality,
      religion: record.religion,
      address: record.address,
      securityFeatures: {
        thumbprintPresent: record.thumbprintPresent,
        hologramPresent: record.hologramPresent,
        chipPresent: record.chipPresent,
      },
    },
  };
};

/**
 * Verify IC against mock government database
 * @param {string} icNumber - 12-digit IC number
 * @param {string} fullName - Full name as on IC (optional for verification)
 * @returns {Promise<Object>} Verification result
 */
const verifyICWithDatabase = async (icNumber, fullName = null) => {
  // Remove dashes and spaces
  const cleanIC = normalizeIC(icNumber);

  // Prefer MongoDB Atlas (if connected)
  const mongoQuery = await queryICRecordFromMongo(cleanIC);
  if (mongoQuery.ok) {
    return await verifyICAgainstRecord(mongoQuery.record, cleanIC, fullName);
  }

  // Fallback: local JSON file (only when MongoDB is not available)
  const db = await loadDatabase();

  // Check if IC is blacklisted
  const blacklisted = (db.blacklistedICs || []).find((ic) => ic.icNumber === cleanIC);
  if (blacklisted) {
    return {
      verified: false,
      status: 'blacklisted',
      reason: blacklisted.reason,
      message: 'This IC has been reported and cannot be used for registration',
      reportedDate: blacklisted.reportedDate,
    };
  }

  // Check if IC is revoked
  const revoked = (db.revokedICs || []).find((ic) => ic.icNumber === cleanIC);
  if (revoked) {
    return {
      verified: false,
      status: 'revoked',
      reason: revoked.reason,
      message: 'This IC has been revoked and is no longer valid',
      revokedDate: revoked.revokedDate,
    };
  }

  // Check if IC exists in valid ICs
  const validIC = (db.validICs || []).find((ic) => ic.icNumber === cleanIC);
  if (!validIC) {
    return {
      verified: false,
      status: 'not_found',
      message:
        'IC number not found in government database. This could be a fake or invalid IC.',
      suggestion:
        'Please verify your IC number and try again. If the issue persists, contact support.',
    };
  }

  // If name is provided, verify it matches
  if (fullName) {
    const normalizedInputName = fullName.trim().toUpperCase();
    const normalizedDBName = validIC.fullName.toUpperCase();

    if (normalizedInputName !== normalizedDBName) {
      return {
        verified: false,
        status: 'name_mismatch',
        message: 'The name does not match the IC number in our records',
        expectedName: validIC.fullName,
      };
    }
  }

  // IC is valid and verified
  return {
    verified: true,
    status: 'active',
    message: 'IC verified successfully against government database',
    data: {
      icNumber: validIC.icNumber,
      fullName: validIC.fullName,
      gender: validIC.gender,
      dateOfBirth: validIC.dateOfBirth,
      birthPlace: validIC.birthPlace,
      nationality: validIC.nationality,
      religion: validIC.religion,
      address: validIC.address,
      securityFeatures: {
        thumbprintPresent: validIC.thumbprintPresent,
        hologramPresent: validIC.hologramPresent,
        chipPresent: validIC.chipPresent,
      },
    },
  };
};

/**
 * Verify both front and back IC images
 * @param {Object} frontData - Data extracted from front IC
 * @param {Object} backData - Data extracted from back IC
 * @returns {Promise<Object>} Comprehensive verification result
 */
const verifyICFrontAndBack = async (frontData, backData) => {
  // Verify IC number from front matches back
  if (frontData.icNumber !== backData.icNumber) {
    return {
      verified: false,
      status: 'mismatch',
      message: 'IC number from front and back images do not match',
      frontIC: frontData.icNumber,
      backIC: backData.icNumber
    };
  }
  
  // Verify with database
  const dbVerification = await verifyICWithDatabase(
    frontData.icNumber,
    frontData.fullName
  );
  
  if (!dbVerification.verified) {
    return dbVerification;
  }
  
  // Verify address matches (from back of IC)
  const dbAddress = dbVerification.data.address.toUpperCase();
  const scannedAddress = backData.address?.toUpperCase() || '';
  
  // Simple address matching (you can enhance this)
  const addressSimilarity = calculateAddressSimilarity(dbAddress, scannedAddress);
  
  if (addressSimilarity < 0.5) {
    return {
      verified: false,
      status: 'address_mismatch',
      message: 'Address on IC does not match government records',
      similarity: addressSimilarity
    };
  }
  
  // All checks passed
  return {
    verified: true,
    status: 'fully_verified',
    message: 'IC fully verified - front, back, and database match',
    data: dbVerification.data,
    verificationDetails: {
      frontVerified: true,
      backVerified: true,
      databaseVerified: true,
      nameMatch: true,
      addressMatch: true,
      addressSimilarity: addressSimilarity
    }
  };
};

/**
 * Calculate similarity between two addresses (simple implementation)
 * @param {string} address1 
 * @param {string} address2 
 * @returns {number} Similarity score (0-1)
 */
const calculateAddressSimilarity = (address1, address2) => {
  if (!address1 || !address2) return 0;
  
  // Normalize addresses
  const normalize = (addr) => addr
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const norm1 = normalize(address1);
  const norm2 = normalize(address2);
  
  // Split into words
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  // Count matching words
  let matches = 0;
  for (const word of words1) {
    if (word.length > 2 && words2.includes(word)) {
      matches++;
    }
  }
  
  // Calculate similarity
  const maxWords = Math.max(words1.length, words2.length);
  return maxWords > 0 ? matches / maxWords : 0;
};

/**
 * Check if IC is already registered in the system
 * @param {string} icNumber 
 * @param {Object} User - User model
 * @returns {Promise<Object>} Check result
 */
const checkICRegistered = async (icNumber, User) => {
  const cleanIC = icNumber.replace(/[-\s]/g, '');
  const existingUser = await User.findOne({ icNumber: cleanIC });
  
  if (existingUser) {
    return {
      registered: true,
      message: 'This IC number is already registered in our system',
      userId: existingUser._id
    };
  }
  
  return {
    registered: false,
    message: 'IC number is available for registration'
  };
};

/**
 * Validate security features from IC image
 * @param {Object} imageAnalysis - Analysis from image processing
 * @returns {Object} Security validation result
 */
const validateSecurityFeatures = (imageAnalysis) => {
  const checks = {
    hologramDetected: imageAnalysis.hologramDetected || false,
    chipDetected: imageAnalysis.chipDetected || false,
    microTextDetected: imageAnalysis.microTextDetected || false,
    colorShiftDetected: imageAnalysis.colorShiftDetected || false,
    imageQuality: imageAnalysis.imageQuality || 'unknown'
  };
  
  const passedChecks = Object.values(checks).filter(v => v === true).length;
  
  return {
    passed: passedChecks >= 2, // At least 2 security features detected
    checks,
    confidence: passedChecks / 4, // 4 checkable features
    message: passedChecks >= 2 
      ? 'Security features validated successfully' 
      : 'Warning: Could not detect sufficient security features. Image quality may be poor or IC may be counterfeit.'
  };
};

module.exports = {
  verifyICWithDatabase,
  verifyICFrontAndBack,
  checkICRegistered,
  validateSecurityFeatures,
  calculateAddressSimilarity
};
