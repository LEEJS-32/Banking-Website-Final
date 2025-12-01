import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Tesseract from 'tesseract.js';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: 'checking',
    icNumber: '',
    gender: 'M',
    dateOfBirth: '',
    bank: 'HSBC',
    country: 'Malaysia',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [icValidation, setIcValidation] = useState({ status: '', message: '', validating: false });
  const [icImage, setIcImage] = useState(null);
  const [icImagePreview, setIcImagePreview] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState({ firstName: false, lastName: false, gender: false, dob: false });
  const [croppedPreview, setCroppedPreview] = useState(null);
  const fileInputRef = useRef(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const verifyIC = async (icNumber) => {
    if (!icNumber || icNumber.length < 12) {
      setIcValidation({ status: '', message: '', validating: false });
      return;
    }

    setIcValidation({ status: '', message: '', validating: true });

    try {
      const response = await axios.post('http://localhost:5000/api/auth/verify-ic', { icNumber });
      
      if (response.data.valid) {
        setIcValidation({ 
          status: 'success', 
          message: '✓ IC verified successfully',
          validating: false 
        });
        
        // Auto-fill fields from IC
        setFormData(prev => ({
          ...prev,
          gender: response.data.data.gender,
          dateOfBirth: response.data.data.dateOfBirth
        }));
        
        // Mark fields as auto-filled
        setAutoFilledFields(prev => ({
          ...prev,
          gender: true,
          dob: true
        }));
        
        console.log('Auto-filled data:', response.data.data);
      }
    } catch (error) {
      setIcValidation({ 
        status: 'error', 
        message: error.response?.data?.message || 'IC verification failed',
        validating: false 
      });
    }
  };

  const handleICChange = (e) => {
    const icNumber = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setFormData({
      ...formData,
      icNumber: icNumber,
    });
    
    // Auto-verify when 12 digits entered
    if (icNumber.length === 12) {
      verifyIC(icNumber);
    } else {
      setIcValidation({ status: '', message: '', validating: false });
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }

      setIcImage(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setIcImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractDataFromText = (text) => {
    let icNumber = null;
    let fullName = null;

    // Remove all whitespace and special characters for IC extraction
    const cleanText = text.replace(/[\s\-\.]/g, '');

    // Pattern 1: Look for 12 consecutive digits
    const pattern1 = /(\d{12})/g;
    const matches1 = cleanText.match(pattern1);
    
    if (matches1 && matches1.length > 0) {
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

    // Pattern 3: Look for keywords followed by IC number
    if (!icNumber) {
      const pattern3 = /(?:No\.?\s*K[\/]?P|K[\/]P|IC\s*No\.?|MyKad|IDENTITY|CARD)\s*:?\s*(\d{6}[\s\-]?\d{2}[\s\-]?\d{4})/i;
      const matches3 = text.match(pattern3);
      
      if (matches3 && matches3.length > 1) {
        icNumber = matches3[1].replace(/[\s\-]/g, '');
      }
    }

    // Extract name from IC - Malaysian IC has name printed below chip without label
    // Name is typically positioned in the left-middle area, below the chip
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log('All OCR lines:', lines); // Debug: see all extracted lines
    
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
    
    console.log('Potential names found:', potentialNames); // Debug: see candidates
    
    // Strategy 1: Look for common Malaysian name patterns (BIN, BINTI, A/L, A/P, etc.)
    for (const name of potentialNames) {
      if (/(BIN|BINTI|A\/L|A\/P|S\/O|D\/O)\s+/i.test(name)) {
        fullName = name.toUpperCase();
        console.log('Name found (pattern match):', fullName);
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
        console.log('Name found (longest capitalized):', fullName);
      } else if (potentialNames.length > 0) {
        // Fallback: just take the first potential name
        fullName = potentialNames[0].toUpperCase();
        console.log('Name found (fallback):', fullName);
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

  const extractNameFromText = (text) => {
    // Extract name from cropped IC area text
    // Since we cropped just the name area, the text should mostly be the name
    if (!text) return { firstName: null, lastName: null };

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    console.log('Name area OCR lines:', lines);
    
    let fullName = null;
    
    // Find the longest line with letters (most likely the name)
    let potentialNames = lines.filter(line => {
      const hasLetters = /[A-Z]/i.test(line);
      const notMostlyNumbers = (line.match(/\d/g) || []).length < line.length * 0.3;
      const reasonableLength = line.length >= 3 && line.length <= 60;
      return hasLetters && notMostlyNumbers && reasonableLength;
    });

    if (potentialNames.length > 0) {
      // Take the longest line (most likely the full name)
      potentialNames.sort((a, b) => b.length - a.length);
      fullName = potentialNames[0];
      
      // Clean the name: remove special characters, numbers, and extra symbols
      fullName = fullName
        .replace(/[~`!@#$%^&*()_+=\[\]{};:'"<>,.?\\/|\\0-9]/g, ' ') // Remove special chars and numbers
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim()
        .toUpperCase();
      
      console.log('Name detected from cropped area:', fullName);
    }

    // Parse full name into first and last name
    let firstName = null;
    let lastName = null;
    
    if (fullName && fullName.length > 0) {
      const nameParts = fullName.split(/\s+/).filter(part => part.length > 0);
      
      if (nameParts.length === 1) {
        // Single word detected - might be name without spaces like "TANKAISHENG"
        // Try to intelligently split it
        const singleName = nameParts[0];
        
        if (singleName.length > 6) {
          // For long single names, split roughly in half or at capital letters
          // Common Malaysian names: TAN KAI SHENG, LEE JIAN SHENG, etc.
          // Try to find good split point (usually 3-4 characters for family name)
          const possibleSplits = [3, 4]; // Common Chinese surname lengths
          
          for (const splitPos of possibleSplits) {
            if (singleName.length > splitPos) {
              firstName = singleName.substring(0, splitPos);
              lastName = singleName.substring(splitPos);
              break;
            }
          }
          
          // If still not split, just split in middle
          if (!firstName) {
            const midPoint = Math.floor(singleName.length / 2);
            firstName = singleName.substring(0, midPoint);
            lastName = singleName.substring(midPoint);
          }
        } else {
          // Short single name, use as both
          firstName = singleName;
          lastName = singleName;
        }
      } else if (nameParts.length > 0) {
        // Multiple words - use first as firstName, rest as lastName
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      }
    }

    return { firstName, lastName };
  };

  const processICImage = async () => {
    if (!icImage) {
      setError('Please upload an IC image first');
      return;
    }

    setIsProcessing(true);
    setOcrProgress(0);
    setError('');

    try {
      // Create image element to get dimensions and crop
      const img = new Image();
      const imageUrl = URL.createObjectURL(icImage);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Create canvas to crop the name area
      // Malaysian IC: Name is typically in the left-middle area, below the chip
      // Approximate location: Left 10-60%, Top 40-65% of the card
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate crop area for name (left-middle section below chip)
      const cropX = img.width * 0.00;  // Start from 0% left (moved left 5%)
      const cropY = img.height * 0.59; // Start from 59% top (moved down 2%)
      const cropWidth = img.width * 0.55; // Width: 55% of card
      const cropHeight = img.height * 0.15; // Height: 15% of card (just name area)
      
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      
      // Draw cropped section
      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      
      // DEBUG: Show cropped area to user
      const croppedDataUrl = canvas.toDataURL('image/png');
      console.log('Cropped name area preview:');
      console.log('Open this in a new tab to see what was cropped:', croppedDataUrl);
      console.log('Crop coordinates:', { cropX, cropY, cropWidth, cropHeight });
      console.log('Original image size:', { width: img.width, height: img.height });
      
      // Show preview to user
      setCroppedPreview(croppedDataUrl);
      
      // Convert canvas to blob for name OCR
      const croppedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      
      console.log('Processing cropped name area...');
      
      // OCR on cropped name area only
      const nameResult = await Tesseract.recognize(
        croppedBlob,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 50)); // First 50% for name
            }
          }
        }
      );

      const nameText = nameResult.data.text;
      console.log('Extracted name text:', nameText);

      // Now OCR the full IC for IC number
      setOcrProgress(50);
      const fullResult = await Tesseract.recognize(
        icImage,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(50 + Math.round(m.progress * 50)); // Second 50% for IC number
            }
          }
        }
      );

      const fullText = fullResult.data.text;
      console.log('Extracted full text:', fullText);

      // Extract IC number from full text
      const extractedData = extractDataFromText(fullText);
      
      // Extract name from cropped area
      const nameData = extractNameFromText(nameText);
      
      console.log('Extracted IC data:', extractedData);
      console.log('Extracted name data:', nameData);

      if (extractedData.icNumber) {
        // Update form with extracted data
        setFormData(prev => ({
          ...prev,
          icNumber: extractedData.icNumber,
          firstName: nameData.firstName || prev.firstName,
          lastName: nameData.lastName || prev.lastName
        }));
        
        // Mark auto-filled fields
        setAutoFilledFields(prev => ({
          ...prev,
          firstName: !!nameData.firstName,
          lastName: !!nameData.lastName
        }));
        
        // Auto-verify the extracted IC
        await verifyIC(extractedData.icNumber);
        
        let successMessage = '✓ IC extracted and verified successfully';
        if (nameData.firstName && nameData.lastName) {
          successMessage = '✓ IC and name extracted successfully';
        }
        
        setIcValidation({
          status: 'success',
          message: successMessage,
          validating: false
        });
      } else {
        setError('Could not extract IC number from image. Please enter manually or upload a clearer image.');
        setIcValidation({
          status: 'error',
          message: 'IC number not found in image',
          validating: false
        });
      }
    } catch (error) {
      console.error('OCR error:', error);
      setError('Failed to process image. Please try again or enter IC manually.');
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  const clearImage = () => {
    setIcImage(null);
    setIcImagePreview(null);
    setOcrProgress(0);
    setCroppedPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (icValidation.status === 'error') {
      setError('Please provide a valid Malaysian IC number');
      return;
    }

    setLoading(true);

    const { confirmPassword, ...userData } = formData;
    const result = await register(userData);

    if (result.success) {
      // Show success message and redirect to a verification pending page
      setError('');
      alert('Registration successful! Please check your email to verify your account before logging in.');
      navigate('/login');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900">
            SecureBank
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account
          </p>
        </div>
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name {autoFilledFields.firstName && <span className="text-xs text-green-600">(Auto-filled from IC)</span>}
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  placeholder="Enter your first name"
                  className="input-field"
                  value={formData.firstName}
                  onChange={handleChange}
                />
                {autoFilledFields.firstName && (
                  <p className="mt-1 text-xs text-gray-500">
                    You can edit this if OCR extracted incorrectly
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name {autoFilledFields.lastName && <span className="text-xs text-green-600">(Auto-filled from IC)</span>}
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  placeholder="Enter your last name"
                  className="input-field"
                  value={formData.lastName}
                  onChange={handleChange}
                />
                {autoFilledFields.lastName && (
                  <p className="mt-1 text-xs text-gray-500">
                    You can edit this if OCR extracted incorrectly
                  </p>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-field"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            {/* IC Photo Upload Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                📸 Upload Malaysian IC (MyKad) Photo
              </label>
              
              {!icImagePreview ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="ic-upload"
                  />
                  <label
                    htmlFor="ic-upload"
                    className="cursor-pointer flex flex-col items-center justify-center py-6 px-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-500 transition"
                  >
                    <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-600">Click to upload IC photo</span>
                    <span className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</span>
                  </label>
                </div>
              ) : (
                <div>
                  <div className="relative mb-3">
                    <img 
                      src={icImagePreview} 
                      alt="IC Preview" 
                      className="w-full rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {croppedPreview && (
                    <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-xs font-medium text-blue-700 mb-2">🔍 Name Area Being Scanned:</p>
                      <img 
                        src={croppedPreview} 
                        alt="Cropped Name Area" 
                        className="w-full rounded border border-blue-300"
                      />
                      <p className="text-xs text-blue-600 mt-1">This is the area OCR will read for the name</p>
                    </div>
                  )}
                  
                  {isProcessing ? (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">Processing image...</span>
                        <span className="text-sm font-medium text-primary-600">{ocrProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={processICImage}
                      className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition font-medium"
                    >
                      🔍 Scan & Extract IC Info
                    </button>
                  )}
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2 text-center">
                Upload a clear photo of your IC front side. System will focus on the name area below the chip for better accuracy.
              </p>
            </div>
            
            {/* Malaysian IC Number Field */}
            <div>
              <label htmlFor="icNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Malaysian IC Number (MyKad) {icImagePreview && <span className="text-xs text-blue-600">(or enter manually)</span>}
              </label>
              <input
                id="icNumber"
                name="icNumber"
                type="text"
                placeholder="e.g., 950815145678"
                required
                maxLength="12"
                className={`input-field ${
                  icValidation.status === 'success' ? 'border-green-500 focus:ring-green-500' : 
                  icValidation.status === 'error' ? 'border-red-500 focus:ring-red-500' : ''
                }`}
                value={formData.icNumber}
                onChange={handleICChange}
              />
              {icValidation.validating && (
                <p className="mt-1 text-sm text-blue-600">Verifying IC...</p>
              )}
              {icValidation.message && (
                <p className={`mt-1 text-sm ${
                  icValidation.status === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {icValidation.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter 12-digit IC without dashes. Must be 18 years or older.
              </p>
            </div>
            
            <div>
              <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              <select
                id="accountType"
                name="accountType"
                className="input-field"
                value={formData.accountType}
                onChange={handleChange}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>
            
            {/* Fraud Detection Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender {autoFilledFields.gender && <span className="text-xs text-green-600">(Auto-filled from IC)</span>}
                </label>
                <select
                  id="gender"
                  name="gender"
                  className="input-field"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={autoFilledFields.gender}
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
              </div>
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth {autoFilledFields.dob && <span className="text-xs text-green-600">(Auto-filled from IC)</span>}
                </label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  required
                  className="input-field"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  disabled={autoFilledFields.dob}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="bank" className="block text-sm font-medium text-gray-700 mb-2">
                  Bank
                </label>
                <select
                  id="bank"
                  name="bank"
                  className="input-field"
                  value={formData.bank}
                  onChange={handleChange}
                >
                  <option value="HSBC">HSBC</option>
                  <option value="Lloyds">Lloyds</option>
                  <option value="Barclays">Barclays</option>
                  <option value="RBS">RBS</option>
                  <option value="NatWest">NatWest</option>
                  <option value="Santander">Santander</option>
                </select>
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  id="country"
                  name="country"
                  className="input-field"
                  value={formData.country}
                  onChange={handleChange}
                >
                  <option value="Malaysia">Malaysia</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="USA">USA</option>
                  <option value="India">India</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-field"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="input-field"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
