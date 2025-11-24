const axios = require('axios');

const FRAUD_API_URL = process.env.FRAUD_API_URL || 'http://localhost:5001';

/**
 * Calculate user's age from date of birth
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return 30; // Default age
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Infer merchant group from transaction description
 */
const inferMerchantGroup = (description) => {
  if (!description) return 'Other';
  const desc = description.toLowerCase();
  
  if (desc.includes('food') || desc.includes('restaurant') || desc.includes('lunch') || desc.includes('dinner')) {
    return 'Restaurant';
  }
  if (desc.includes('shop') || desc.includes('store') || desc.includes('buy') || desc.includes('purchase')) {
    return 'Shopping';
  }
  if (desc.includes('phone') || desc.includes('laptop') || desc.includes('ipad') || desc.includes('electronics')) {
    return 'Electronics';
  }
  if (desc.includes('gas') || desc.includes('fuel') || desc.includes('petrol')) {
    return 'Gas Station';
  }
  if (desc.includes('movie') || desc.includes('game') || desc.includes('entertainment')) {
    return 'Entertainment';
  }
  if (desc.includes('hotel') || desc.includes('travel') || desc.includes('flight')) {
    return 'Travel';
  }
  if (desc.includes('service') || desc.includes('repair')) {
    return 'Services';
  }
  
  return 'Other';
};

/**
 * Check if a transaction is potentially fraudulent
 * @param {Object} transactionData - Transaction details
 * @returns {Promise<Object>} Fraud detection result
 */
const checkFraud = async (transactionData) => {
  try {
    const {
      amount,
      description,
      senderProfile,
    } = transactionData;

    // Calculate age
    const age = calculateAge(senderProfile.dateOfBirth);

    // Infer merchant group from description
    const merchantGroup = inferMerchantGroup(description);

    // Get current hour (0-23)
    const currentHour = new Date().getHours();

    // Prepare the features for the model (Python API will calculate the 14 features)
    const requestData = {
      Amount: parseFloat(amount),
      Time: currentHour,
      Gender: senderProfile.gender || 'M',
      Age: age,
      Merchant_Group: merchantGroup,
      Country_of_Transaction: 'United Kingdom', // Default for website transactions
      Shipping_Address: senderProfile.shippingAddress || senderProfile.country || 'United Kingdom',
      Country_of_Residence: senderProfile.country || 'United Kingdom',
      Bank: senderProfile.bank || 'HSBC',
      Type_of_Card: 'Visa', // Default for online transactions
      Entry_Mode: 'CVC', // Website transactions use CVC
      Type_of_Transaction: 'Online', // All website transactions are online
    };

    console.log('🔍 Checking fraud for transaction:', requestData);

    const response = await axios.post(`${FRAUD_API_URL}/predict`, requestData, {
      timeout: 5000, // 5 second timeout
    });

    console.log('✅ Fraud detection result:', response.data);

    return {
      success: true,
      ...response.data,
    };
  } catch (error) {
    console.error('❌ Fraud detection API error:', error.message);
    
    // If fraud API is down, allow transaction but flag for review
    return {
      success: false,
      error: error.message,
      is_fraud: false,
      fraud_probability: 0,
      risk_level: 'unknown',
      reasons: ['Fraud detection service unavailable'],
      recommendation: 'APPROVE',
    };
  }
};

/**
 * Check health of fraud detection API
 */
const checkFraudAPIHealth = async () => {
  try {
    const response = await axios.get(`${FRAUD_API_URL}/health`, { timeout: 3000 });
    return {
      healthy: true,
      ...response.data,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
    };
  }
};

module.exports = {
  checkFraud,
  checkFraudAPIHealth,
};
