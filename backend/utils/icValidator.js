/**
 * Malaysian IC (MyKad) Validation Utility
 * Format: YYMMDD-PB-###G
 * Example: 950815-14-5678 (Born 15 Aug 1995, Kuala Lumpur)
 */

/**
 * Validate Malaysian IC number format
 * @param {string} icNumber - IC number (with or without dashes)
 * @returns {Object} - Validation result with extracted data
 */
const validateMalaysianIC = (icNumber) => {
  // Remove dashes and spaces
  const cleanIC = icNumber.replace(/[-\s]/g, '');
  
  // Check if 12 digits
  if (!/^\d{12}$/.test(cleanIC)) {
    return {
      valid: false,
      error: 'IC number must be 12 digits',
    };
  }
  
  // Extract components
  const birthDate = cleanIC.substring(0, 6); // YYMMDD
  const birthPlace = cleanIC.substring(6, 8); // PB
  const lastDigit = parseInt(cleanIC.substring(11, 12)); // Gender digit
  
  // Parse birth date
  const year = parseInt(birthDate.substring(0, 2));
  const month = parseInt(birthDate.substring(2, 4));
  const day = parseInt(birthDate.substring(4, 6));
  
  // Determine century (00-25 = 2000s, 26-99 = 1900s)
  const fullYear = year <= 25 ? 2000 + year : 1900 + year;
  
  // Validate month (01-12)
  if (month < 1 || month > 12) {
    return {
      valid: false,
      error: 'Invalid month in IC number',
    };
  }
  
  // Validate day (01-31)
  if (day < 1 || day > 31) {
    return {
      valid: false,
      error: 'Invalid day in IC number',
    };
  }
  
  // Create date object
  const dob = new Date(fullYear, month - 1, day);
  
  // Check if date is valid
  if (dob.getDate() !== day || dob.getMonth() !== month - 1) {
    return {
      valid: false,
      error: 'Invalid date in IC number',
    };
  }
  
  // Check if date is not in the future
  if (dob > new Date()) {
    return {
      valid: false,
      error: 'Birth date cannot be in the future',
    };
  }
  
  // Calculate age
  const today = new Date();
  let age = today.getFullYear() - fullYear;
  const monthDiff = today.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }
  
  // Must be at least 18 years old
  if (age < 18) {
    return {
      valid: false,
      error: 'Must be at least 18 years old to register',
    };
  }
  
  // Determine gender (odd = male, even = female)
  const gender = lastDigit % 2 === 0 ? 'F' : 'M';
  
  // Map birth place codes to states
  const birthPlaceMap = {
    '01': 'Johor',
    '02': 'Kedah',
    '03': 'Kelantan',
    '04': 'Malacca',
    '05': 'Negeri Sembilan',
    '06': 'Pahang',
    '07': 'Penang',
    '08': 'Perak',
    '09': 'Perlis',
    '10': 'Selangor',
    '11': 'Terengganu',
    '12': 'Sabah',
    '13': 'Sarawak',
    '14': 'Kuala Lumpur',
    '15': 'Labuan',
    '16': 'Putrajaya',
    '21': 'Johor',
    '22': 'Johor',
    '23': 'Johor',
    '24': 'Johor',
    '25': 'Kedah',
    '26': 'Kedah',
    '27': 'Kedah',
    '28': 'Kelantan',
    '29': 'Kelantan',
    '30': 'Malacca',
    '31': 'Negeri Sembilan',
    '32': 'Pahang',
    '33': 'Pahang',
    '34': 'Penang',
    '35': 'Penang',
    '36': 'Perak',
    '37': 'Perak',
    '38': 'Perak',
    '39': 'Perak',
    '40': 'Perlis',
    '41': 'Selangor',
    '42': 'Selangor',
    '43': 'Selangor',
    '44': 'Selangor',
    '45': 'Terengganu',
    '46': 'Terengganu',
    '47': 'Sabah',
    '48': 'Sabah',
    '49': 'Sabah',
    '50': 'Sarawak',
    '51': 'Sarawak',
    '52': 'Sarawak',
    '53': 'Sarawak',
    '54': 'Kuala Lumpur',
    '55': 'Kuala Lumpur',
    '56': 'Kuala Lumpur',
    '57': 'Kuala Lumpur',
    '58': 'Labuan',
    '59': 'Negeri Sembilan',
    '60': 'Sabah',
    '61': 'Sarawak',
    '62': 'Sabah',
    '63': 'Sabah',
    '64': 'Sabah',
    '65': 'Sabah',
    '66': 'Sabah',
    '67': 'Kuala Lumpur',
    '68': 'Terengganu',
    '69': 'Terengganu',
    '70': 'Selangor',
    '71': 'Other/Foreign',
    '72': 'Other/Foreign',
    '73': 'Sabah',
    '74': 'Sarawak',
    '75': 'Pahang',
    '76': 'Sarawak',
    '77': 'Putrajaya',
    '78': 'Sabah',
    '79': 'Sarawak',
    '80': 'Sarawak',
    '81': 'Sarawak',
    '82': 'Kuala Lumpur',
  };
  
  const birthState = birthPlaceMap[birthPlace] || 'Unknown';
  
  // Format date as YYYY-MM-DD for HTML date input
  const formattedDate = `${fullYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  
  return {
    valid: true,
    icNumber: cleanIC,
    formattedIC: `${cleanIC.substring(0, 6)}-${cleanIC.substring(6, 8)}-${cleanIC.substring(8, 12)}`,
    dateOfBirth: formattedDate,
    dateObject: dob,
    age,
    gender,
    birthPlace: birthState,
  };
};

/**
 * Format IC number with dashes
 * @param {string} icNumber - IC number without dashes
 * @returns {string} - Formatted IC (YYMMDD-PB-###G)
 */
const formatIC = (icNumber) => {
  const cleanIC = icNumber.replace(/[-\s]/g, '');
  if (cleanIC.length !== 12) return icNumber;
  return `${cleanIC.substring(0, 6)}-${cleanIC.substring(6, 8)}-${cleanIC.substring(8, 12)}`;
};

module.exports = {
  validateMalaysianIC,
  formatIC,
};
