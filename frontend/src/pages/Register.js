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
  
  // Front IC states
  const [icFrontImage, setIcFrontImage] = useState(null);
  const [icFrontPreview, setIcFrontPreview] = useState(null);
  const [frontOcrProgress, setFrontOcrProgress] = useState(0);
  const [isFrontProcessing, setIsFrontProcessing] = useState(false);
  const [frontData, setFrontData] = useState(null);
  
  // Back IC states
  const [icBackImage, setIcBackImage] = useState(null);
  const [icBackPreview, setIcBackPreview] = useState(null);
  const [backOcrProgress, setBackOcrProgress] = useState(0);
  const [isBackProcessing, setIsBackProcessing] = useState(false);
  const [backData, setBackData] = useState(null);
  
  // Verification states
  const [icFullVerification, setIcFullVerification] = useState({ status: '', message: '', verified: false });
  
  // Debug states for raw OCR text
  const [rawFrontOcrText, setRawFrontOcrText] = useState('');
  const [rawBackOcrText, setRawBackOcrText] = useState('');
  
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoFilledFields, setAutoFilledFields] = useState({ firstName: false, lastName: false, gender: false, dob: false, address: false });
  const [croppedPreview, setCroppedPreview] = useState(null);
  const fileInputFrontRef = useRef(null);
  const fileInputBackRef = useRef(null);
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

  const handleFrontImageUpload = (e) => {
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

      setIcFrontImage(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setIcFrontPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackImageUpload = (e) => {
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

      setIcBackImage(file);
      setError('');
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setIcBackPreview(reader.result);
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

  const extractBackData = (text) => {
    if (!text) return { icNumber: null, address: null };

    let icNumber = null;
    let address = null;

    // Extract IC number from back
    const cleanText = text.replace(/[\s\-\.]/g, '');
    const icPattern = /(\d{12})/g;
    const icMatches = cleanText.match(icPattern);
    
    if (icMatches && icMatches.length > 0) {
      icNumber = icMatches[0];
    }

    // Extract address (look for ALAMAT keyword)
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let addressLines = [];
    let foundAddressKeyword = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for address keywords
      if (/ALAMAT|ADDRESS/i.test(line)) {
        foundAddressKeyword = true;
        const afterKeyword = line.split(/ALAMAT|ADDRESS/i)[1];
        if (afterKeyword && afterKeyword.trim().length > 3) {
          addressLines.push(afterKeyword.trim());
        }
        continue;
      }
      
      // Collect address lines after keyword
      if (foundAddressKeyword && addressLines.length < 4) {
        const hasLetters = /[A-Z]/i.test(line);
        const isReasonableLength = line.length >= 3 && line.length <= 100;
        const hasAddressKeywords = /(NO\.|LOT|JALAN|JLN|TAMAN|TMN|KAMPUNG|KG|BANDAR)/i.test(line);
        const isNotKeyword = !/(WARGANEGARA|NATIONALITY|THUMBPRINT)/i.test(line);
        
        if (isNotKeyword && hasLetters && (isReasonableLength || hasAddressKeywords)) {
          addressLines.push(line);
        }
      }
    }
    
    if (addressLines.length > 0) {
      address = addressLines.join(', ').toUpperCase();
    }

    return { icNumber, address };
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

  const processFrontIC = async () => {
    if (!icFrontImage) {
      setError('Please upload front IC image first');
      return;
    }

    setIsFrontProcessing(true);
    setFrontOcrProgress(0);
    setError('');

    try {
      // Create image element to get dimensions and crop
      const img = new Image();
      const imageUrl = URL.createObjectURL(icFrontImage);
      
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
              setFrontOcrProgress(Math.round(m.progress * 50)); // First 50% for name
            }
          }
        }
      );

      const nameText = nameResult.data.text;
      console.log('Extracted name text:', nameText);

      // Now OCR the full IC for IC number
      setFrontOcrProgress(50);
      const fullResult = await Tesseract.recognize(
        icFrontImage,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setFrontOcrProgress(50 + Math.round(m.progress * 50)); // Second 50% for IC number
            }
          }
        }
      );

      const fullText = fullResult.data.text;
      console.log('Extracted full text:', fullText);
      
      // Store raw OCR text for debugging
      setRawFrontOcrText(fullText);

      // Extract IC number from full text
      const extractedData = extractDataFromText(fullText);
      
      // Extract name from cropped area
      const nameData = extractNameFromText(nameText);
      
      console.log('Extracted IC data:', extractedData);
      console.log('Extracted name data:', nameData);

      if (extractedData.icNumber) {
        // Store front data (IC number only - name from database later)
        const frontICData = {
          icNumber: extractedData.icNumber
        };
        setFrontData(frontICData);
        
        // Update form with IC number only
        setFormData(prev => ({
          ...prev,
          icNumber: extractedData.icNumber
        }));
        
        // Now verify with database and get ALL data from there
        try {
          const response = await axios.post('http://localhost:5000/api/auth/verify-ic-database', { 
            icNumber: extractedData.icNumber 
          });
          
          if (response.data.verified && response.data.data) {
            // Auto-fill EVERYTHING from database
            setFormData(prev => ({
              ...prev,
              icNumber: response.data.data.icNumber,
              firstName: response.data.data.fullName.split(' ')[0] || prev.firstName,
              lastName: response.data.data.fullName.split(' ').slice(1).join(' ') || prev.lastName,
              gender: response.data.data.gender,
              dateOfBirth: response.data.data.dateOfBirth
            }));
            
            setAutoFilledFields({
              firstName: true,
              lastName: true,
              gender: true,
              dob: true
            });
            
            setIcValidation({
              status: 'success',
              message: '✓ IC verified with database! All data auto-filled.',
              validating: false
            });
          }
        } catch (error) {
          // If database verification fails, just show IC extracted
          setIcValidation({
            status: 'success',
            message: '✓ IC number extracted. Click "Verify IC with Database" to complete.',
            validating: false
          });
        }
      } else {
        setError('Could not extract IC number from front image. Please try again.');
      }
    } catch (error) {
      console.error('Front IC OCR error:', error);
      setError('Failed to process front IC. Please try again.');
    } finally {
      setIsFrontProcessing(false);
      setFrontOcrProgress(0);
    }
  };

  const processBackIC = async () => {
    if (!icBackImage) {
      setError('Please upload back IC image first');
      return;
    }

    setIsBackProcessing(true);
    setBackOcrProgress(0);
    setError('');

    try {
      const result = await Tesseract.recognize(
        icBackImage,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setBackOcrProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      const text = result.data.text;
      console.log('Extracted back IC text:', text);
      
      // Store raw OCR text for debugging
      setRawBackOcrText(text);

      const backICData = extractBackData(text);
      console.log('Extracted back data:', backICData);

      if (backICData.icNumber) {
        setBackData(backICData);
        
        // Check if IC matches front IC
        if (frontData && frontData.icNumber && backICData.icNumber === frontData.icNumber) {
          setIcValidation({
            status: 'success',
            message: '✓ Back IC verified! IC numbers match. You can now register.',
            validating: false
          });
        } else {
          setIcValidation({
            status: 'success',
            message: '✓ Back IC scanned. IC number extracted.',
            validating: false
          });
        }
      } else {
        // Even if we can't extract IC from back, it's okay - front IC is enough
        setBackData({ icNumber: frontData?.icNumber || '' });
        setIcValidation({
          status: 'warning',
          message: '⚠️ Could not extract IC from back image, but front IC is sufficient.',
          validating: false
        });
      }
    } catch (error) {
      console.error('Back IC OCR error:', error);
      setError('Failed to process back IC. Please try again.');
    } finally {
      setIsBackProcessing(false);
      setBackOcrProgress(0);
    }
  };

  const verifyCompleteIC = async () => {
    if (!frontData || !frontData.icNumber) {
      setError('Please scan front IC first or enter IC number manually');
      return;
    }

    // Back IC is now optional
    setIcFullVerification({ status: '', message: '', verified: false });
    setError('');

    try {
      // Just verify with database using IC number - simpler approach
      const response = await axios.post('http://localhost:5000/api/auth/verify-ic-database', {
        icNumber: frontData.icNumber
      });

      if (response.data.verified) {
        setIcFullVerification({
          status: 'verified',
          message: response.data.message,
          verified: true,
          data: response.data.data
        });

        // Auto-fill EVERYTHING from database (no OCR needed!)
        if (response.data.data) {
          const nameParts = response.data.data.fullName.split(' ');
          setFormData(prev => ({
            ...prev,
            icNumber: response.data.data.icNumber,
            firstName: nameParts[0] || prev.firstName,
            lastName: nameParts.slice(1).join(' ') || prev.lastName,
            gender: response.data.data.gender,
            dateOfBirth: response.data.data.dateOfBirth
          }));

          setAutoFilledFields({
            firstName: true,
            lastName: true,
            gender: true,
            dob: true,
            address: true
          });
        }

        setIcValidation({
          status: 'success',
          message: '✓ IC fully verified with government database!',
          validating: false
        });
      }
    } catch (error) {
      console.error('Complete verification error:', error);
      const message = error.response?.data?.message || 'IC verification failed';
      setIcFullVerification({
        status: 'failed',
        message: message,
        verified: false
      });
      setError(message);
    }
  };

  const clearFrontImage = () => {
    setIcFrontImage(null);
    setIcFrontPreview(null);
    setFrontOcrProgress(0);
    setFrontData(null);
    setCroppedPreview(null);
    if (fileInputFrontRef.current) {
      fileInputFrontRef.current.value = '';
    }
  };

  const clearBackImage = () => {
    setIcBackImage(null);
    setIcBackPreview(null);
    setBackOcrProgress(0);
    setBackData(null);
    if (fileInputBackRef.current) {
      fileInputBackRef.current.value = '';
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

    // Check if IC is fully verified (optional but recommended)
    if (frontData && backData && !icFullVerification.verified) {
      const proceed = window.confirm(
        'Your IC has been scanned but not fully verified against the database. ' +
        'Would you like to proceed anyway? (Recommended: Click "Verify IC with Government Database" first)'
      );
      if (!proceed) return;
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
            
            {/* eKYC IC Verification Section */}
            <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-900">
                  🔐 eKYC IC Verification (Simplified)
                </label>
                {icFullVerification.verified && (
                  <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">✓ Verified</span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-4">
                Upload your Malaysian IC (front is required, back is optional). We'll extract your IC number and verify it with the government database to auto-fill all your details.
              </p>

              {/* Front IC Upload */}
              <div className="mb-4 border border-gray-300 rounded-lg p-3 bg-white">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📸 Front IC (Name & IC Number Side)
                </label>
                
                {!icFrontPreview ? (
                  <div>
                    <input
                      ref={fileInputFrontRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFrontImageUpload}
                      className="hidden"
                      id="ic-front-upload"
                    />
                    <label
                      htmlFor="ic-front-upload"
                      className="cursor-pointer flex flex-col items-center justify-center py-4 px-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-500 transition"
                    >
                      <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-600">Click to upload front IC</span>
                      <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</span>
                    </label>
                  </div>
                ) : (
                  <div>
                    <div className="relative mb-2">
                      <img 
                        src={icFrontPreview} 
                        alt="Front IC Preview" 
                        className="w-full rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={clearFrontImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {frontData && (
                        <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">✓ Scanned</span>
                      )}
                    </div>
                    
                    {isFrontProcessing ? (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Processing...</span>
                          <span className="text-xs font-medium text-primary-600">{frontOcrProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${frontOcrProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : !frontData && (
                      <button
                        type="button"
                        onClick={processFrontIC}
                        className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                      >
                        🔍 Scan Front IC
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Back IC Upload */}
              <div className="mb-4 border border-gray-300 rounded-lg p-3 bg-white">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📸 Back IC (Address & Security Features Side)
                </label>
                
                {!icBackPreview ? (
                  <div>
                    <input
                      ref={fileInputBackRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBackImageUpload}
                      className="hidden"
                      id="ic-back-upload"
                    />
                    <label
                      htmlFor="ic-back-upload"
                      className="cursor-pointer flex flex-col items-center justify-center py-4 px-4 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-500 transition"
                    >
                      <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-600">Click to upload back IC</span>
                      <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</span>
                    </label>
                  </div>
                ) : (
                  <div>
                    <div className="relative mb-2">
                      <img 
                        src={icBackPreview} 
                        alt="Back IC Preview" 
                        className="w-full rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={clearBackImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {backData && (
                        <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">✓ Scanned</span>
                      )}
                    </div>
                    
                    {isBackProcessing ? (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-600">Processing...</span>
                          <span className="text-xs font-medium text-primary-600">{backOcrProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${backOcrProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : !backData && (
                      <button
                        type="button"
                        onClick={processBackIC}
                        className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                      >
                        🔍 Scan Back IC
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Complete Verification Button - Only needs front IC */}
              {frontData && !icFullVerification.verified && (
                <button
                  type="button"
                  onClick={verifyCompleteIC}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition font-medium text-sm"
                >
                  ✓ Verify IC with Government Database
                </button>
              )}

              {/* Verification Status */}
              {icFullVerification.message && (
                <div className={`mt-3 p-3 rounded-lg text-sm ${
                  icFullVerification.verified 
                    ? 'bg-green-100 border border-green-300 text-green-800' 
                    : 'bg-red-100 border border-red-300 text-red-800'
                }`}>
                  {icFullVerification.message}
                </div>
              )}

              {/* DEBUG: Show Extracted Data */}
              {(frontData || backData) && (
                <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                  <p className="text-sm font-bold text-yellow-800 mb-3">🔍 DEBUG: Extracted Data (Remove Later)</p>
                  <p className="text-xs text-yellow-700 mb-3">✨ <strong>New Approach:</strong> We only extract IC number from images, then get ALL data (name, address, etc.) from the database!</p>
                  
                  {frontData && (
                    <div className="mb-3 p-3 bg-white rounded border border-yellow-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">📄 Front IC - What We Extract:</p>
                      <div className="text-xs space-y-1">
                        <p><span className="font-medium">IC Number:</span> {frontData.icNumber || 'Not extracted'}</p>
                        <p className="text-gray-500 italic">↑ That's all we need! Name comes from database →</p>
                      </div>
                    </div>
                  )}
                  
                  {backData && (
                    <div className="p-3 bg-white rounded border border-yellow-200">
                      <p className="text-xs font-semibold text-gray-700 mb-2">📄 Back IC (Optional):</p>
                      <div className="text-xs space-y-1">
                        <p><span className="font-medium">IC Number:</span> {backData.icNumber || 'Optional - not required'}</p>
                        <p className="text-gray-500 italic">Back IC is just for extra verification. Front IC is enough!</p>
                      </div>
                    </div>
                  )}

                  {/* RAW OCR TEXT */}
                  {(rawFrontOcrText || rawBackOcrText) && (
                    <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-300">
                      <p className="text-xs font-semibold text-purple-700 mb-2">📝 Raw OCR Text (What Tesseract Read):</p>
                      
                      {rawFrontOcrText && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-purple-600">Front IC:</p>
                          <pre className="text-xs text-purple-800 whitespace-pre-wrap bg-white p-2 rounded border border-purple-200 mt-1 max-h-32 overflow-y-auto">{rawFrontOcrText}</pre>
                        </div>
                      )}
                      
                      {rawBackOcrText && (
                        <div>
                          <p className="text-xs font-medium text-purple-600">Back IC:</p>
                          <pre className="text-xs text-purple-800 whitespace-pre-wrap bg-white p-2 rounded border border-purple-200 mt-1 max-h-32 overflow-y-auto">{rawBackOcrText}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {icFullVerification.data && (
                    <div className="mt-3 p-3 bg-green-50 rounded border border-green-300">
                      <p className="text-xs font-semibold text-green-700 mb-2">✅ Data from Government Database (This is what gets used!):</p>
                      <p className="text-xs text-green-600 mb-2">↓ All this data was retrieved using just the IC number ↓</p>
                      <div className="text-xs space-y-1 text-green-800">
                        <p><span className="font-medium">IC Number:</span> {icFullVerification.data.icNumber}</p>
                        <p><span className="font-medium">Full Name:</span> {icFullVerification.data.fullName} ⭐ (Auto-filled)</p>
                        <p><span className="font-medium">Gender:</span> {icFullVerification.data.gender === 'M' ? 'Male' : 'Female'} ⭐</p>
                        <p><span className="font-medium">Date of Birth:</span> {icFullVerification.data.dateOfBirth} ⭐</p>
                        <p><span className="font-medium">Birth Place:</span> {icFullVerification.data.birthPlace}</p>
                        <p><span className="font-medium">Nationality:</span> {icFullVerification.data.nationality}</p>
                        <p><span className="font-medium">Religion:</span> {icFullVerification.data.religion}</p>
                        <p><span className="font-medium">Address:</span> {icFullVerification.data.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Malaysian IC Number Field */}
            <div>
              <label htmlFor="icNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Malaysian IC Number (MyKad) {(icFrontPreview || icBackPreview) && <span className="text-xs text-blue-600">(or enter manually)</span>}
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
