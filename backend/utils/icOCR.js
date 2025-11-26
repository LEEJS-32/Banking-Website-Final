const sharp = require('sharp');

/**
 * Extract IC number from Malaysian IC card image using pattern matching
 * Since backend doesn't have OCR, we'll preprocess the image and send it to frontend
 * or use a simple pattern extraction if text is already extracted
 */

/**
 * Preprocess IC image for better OCR accuracy
 * @param {Buffer} imageBuffer - Image buffer from multer
 * @returns {Promise<Buffer>} - Processed image buffer
 */
const preprocessICImage = async (imageBuffer) => {
  try {
    // Process image for better OCR results
    const processedImage = await sharp(imageBuffer)
      .resize(1200, null, { // Resize to optimal width for OCR
        fit: 'inside',
        withoutEnlargement: true
      })
      .grayscale() // Convert to grayscale
      .normalize() // Normalize contrast
      .sharpen() // Sharpen text
      .threshold(128) // Apply threshold for better text recognition
      .toBuffer();

    return processedImage;
  } catch (error) {
    throw new Error(`Image preprocessing failed: ${error.message}`);
  }
};

/**
 * Extract IC number and name from text using regex patterns
 * @param {string} text - Extracted text from OCR
 * @returns {Object} - Extracted data {icNumber, firstName, lastName}
 */
const extractICFromText = (text) => {
  if (!text) return { icNumber: null, firstName: null, lastName: null };

  let icNumber = null;
  let fullName = null;

  // Remove all whitespace and special characters for IC extraction
  const cleanText = text.replace(/[\s\-\.]/g, '');

  // Pattern 1: Look for 12 consecutive digits
  const pattern1 = /(\d{12})/g;
  const matches1 = cleanText.match(pattern1);
  
  if (matches1 && matches1.length > 0) {
    // Return the first 12-digit match
    icNumber = matches1[0];
  }

  // Pattern 2: Look for format YYMMDD-PB-NNNN (with any separators)
  if (!icNumber) {
    const pattern2 = /(\d{6})[\s\-]?(\d{2})[\s\-]?(\d{4})/g;
    const matches2 = text.match(pattern2);
    
    if (matches2 && matches2.length > 0) {
      icNumber = matches2[0].replace(/[\s\-]/g, '');
    }
  }

  // Pattern 3: Look for "No. KP" or "K/P" followed by digits
  if (!icNumber) {
    const pattern3 = /(?:No\.?\s*K[\/]?P|K[\/]P|IC\s*No\.?|MyKad)\s*:?\s*(\d{6}[\s\-]?\d{2}[\s\-]?\d{4})/i;
    const matches3 = text.match(pattern3);
    
    if (matches3 && matches3.length > 1) {
      icNumber = matches3[1].replace(/[\s\-]/g, '');
    }
  }

  // Extract name (typically on Malaysian IC printed below the chip)
  // Malaysian IC format: Name is printed in the left-middle area, below the chip
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let potentialNames = [];
  
  for (const line of lines) {
    // Look for text that could be a name:
    // - Contains letters (A-Z)
    // - Length between 3-60 characters
    // - May contain spaces, commas, apostrophes, slashes, hyphens, @ symbol
    // - Must start with a letter
    // - Exclude lines that are mostly numbers or contain common IC keywords
    
    const hasLetters = /[A-Z]/i.test(line);
    const startsWithLetter = /^[A-Z]/i.test(line);
    const reasonableLength = line.length >= 3 && line.length <= 60;
    const notMostlyNumbers = (line.match(/\d/g) || []).length < line.length * 0.5;
    const notKeyword = !/(WARGANEGARA|NATIONALITY|MALAYSIA|IDENTITY|CARD|MYKAD|PENGENALAN|KAD|JANTINA|LELAKI|PEREMPUAN|MALE|FEMALE|ALAMAT|ADDRESS|JALAN|TAMAN|WILAYAH)/i.test(line);
    const notICNumber = !/^\d{6}[\s-]?\d{2}[\s-]?\d{4}$/.test(line);
    
    if (hasLetters && startsWithLetter && reasonableLength && notMostlyNumbers && notKeyword && notICNumber) {
      potentialNames.push(line);
    }
  }
  
  // Strategy 1: Look for common Malaysian name patterns (BIN, BINTI, A/L, A/P, etc.)
  for (const name of potentialNames) {
    if (/(BIN|BINTI|A\/L|A\/P|S\/O|D\/O)\s+/i.test(name)) {
      fullName = name.toUpperCase();
      break;
    }
  }
  
  // Strategy 2: If no pattern found, take the longest capitalized text
  if (!fullName && potentialNames.length > 0) {
    // Filter to only fully capitalized text or mixed case names
    const capitalizedNames = potentialNames.filter(name => {
      // Either all caps or title case (first letter of each word capitalized)
      return /^[A-Z\s@\/',-]+$/.test(name) || /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(name);
    });
    
    if (capitalizedNames.length > 0) {
      // Take the longest one (most likely to be the full name)
      capitalizedNames.sort((a, b) => b.length - a.length);
      fullName = capitalizedNames[0].toUpperCase();
    } else if (potentialNames.length > 0) {
      // Fallback: just take the first potential name
      fullName = potentialNames[0].toUpperCase();
    }
  }

  // Parse full name into first and last name
  let firstName = null;
  let lastName = null;
  
  if (fullName) {
    const nameParts = fullName.split(/\s+/).filter(part => part.length > 0);
    if (nameParts.length > 0) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ') || nameParts[0];
    }
  }

  return { icNumber, firstName, lastName };
};

/**
 * Validate image dimensions and quality
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<Object>} - Validation result
 */
const validateICImage = async (imageBuffer) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    
    const validation = {
      valid: true,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      messages: []
    };

    // Check minimum dimensions (IC cards are typically around 856 x 540 pixels)
    if (metadata.width < 300 || metadata.height < 200) {
      validation.valid = false;
      validation.messages.push('Image resolution too low. Please upload a clearer image.');
    }

    // Check if image is too large
    if (metadata.width > 4000 || metadata.height > 4000) {
      validation.messages.push('Image will be resized for processing.');
    }

    // Check format
    if (!['jpeg', 'jpg', 'png', 'gif'].includes(metadata.format)) {
      validation.valid = false;
      validation.messages.push('Invalid image format. Please upload JPEG, PNG, or GIF.');
    }

    return validation;
  } catch (error) {
    return {
      valid: false,
      messages: [`Image validation failed: ${error.message}`]
    };
  }
};

/**
 * Convert image buffer to base64 for frontend transmission
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {string} - Base64 encoded image
 */
const imageToBase64 = (imageBuffer) => {
  return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
};

module.exports = {
  preprocessICImage,
  extractICFromText,
  validateICImage,
  imageToBase64
};
