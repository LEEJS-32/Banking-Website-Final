# IC Verification System - Complete eKYC Implementation

## Overview

The Banking Website now includes a comprehensive Malaysian IC (MyKad) verification system that simulates real government database verification. This system requires both **front and back** IC images for complete verification.

## Features

### 1. **Dual-Side IC Scanning**
- **Front IC**: Extracts IC number and full name
- **Back IC**: Extracts IC number (for cross-verification) and address
- OCR-powered automatic data extraction from both sides

### 2. **Mock Government Database Verification**
- Simulates verification against Malaysian government IC records
- Checks for:
  - IC existence in valid records
  - Blacklisted ICs (reported stolen/fraudulent)
  - Revoked ICs (deceased, etc.)
  - Name matching
  - Address matching
  - Security features validation

### 3. **Enhanced Security Checks**
- IC number format validation
- Age verification (18+ requirement)
- Cross-verification between front and back IC
- Duplicate registration prevention
- Security feature detection (hologram, chip, etc.)

## Mock Database

Located at: `backend/data/mockICDatabase.json`

### Valid Test ICs

You can use these IC numbers for testing:

1. **Ahmad bin Abdullah**
   - IC: `950815145678`
   - Gender: Male
   - DOB: 1995-08-15
   - Birth Place: Negeri Sembilan

2. **Siti Nurhaliza binti Mohd Tarudin**
   - IC: `880422083456`
   - Gender: Female
   - DOB: 1988-04-22
   - Birth Place: Perak

3. **Rajesh A/L Kumar**
   - IC: `920305141234`
   - Gender: Male
   - DOB: 1992-03-05
   - Birth Place: Johor

4. **Lee Mei Ling**
   - IC: `850712076789`
   - Gender: Female
   - DOB: 1985-07-12
   - Birth Place: Penang

5. **Chen Wei Jun**
   - IC: `001225144567`
   - Gender: Male
   - DOB: 2000-12-25
   - Birth Place: Selangor

### Blacklisted ICs (Will Fail)
- `901010142345` - Reported stolen
- `870615088888` - Fraudulent activities

### Revoked ICs (Will Fail)
- `780305149999` - Deceased

## API Endpoints

### 1. Basic IC Format Verification
```
POST /api/auth/verify-ic
Body: { icNumber: "950815145678" }
```
- Validates IC format
- Extracts date of birth, gender, birth place
- Checks age requirement (18+)
- Does NOT check government database

### 2. Government Database Verification
```
POST /api/auth/verify-ic-database
Body: { 
  icNumber: "950815145678",
  fullName: "AHMAD BIN ABDULLAH" (optional)
}
```
- Validates format first
- Checks against mock government database
- Verifies IC status (active/blacklisted/revoked)
- Matches name if provided
- Returns full IC data if verified

### 3. Complete IC Verification (Front + Back)
```
POST /api/auth/verify-ic-complete
Body: {
  frontData: {
    icNumber: "950815145678",
    fullName: "AHMAD BIN ABDULLAH",
    firstName: "AHMAD",
    lastName: "BIN ABDULLAH"
  },
  backData: {
    icNumber: "950815145678",
    address: "NO. 123, JALAN BUKIT BINTANG, 50200 KUALA LUMPUR"
  }
}
```
- Verifies front and back IC numbers match
- Checks government database
- Validates address matching
- Returns comprehensive verification result

### 4. Upload IC Image
```
POST /api/auth/upload-ic
Form Data: 
  - icImage: (file)
  - side: "front" or "back"
```
- Preprocesses image for better OCR
- Detects security features
- Returns processed image for frontend OCR

## Frontend Usage

### Registration Flow

1. **Upload Front IC**
   - User uploads front IC photo
   - Click "Scan Front IC"
   - System extracts IC number and name
   - Auto-fills form fields

2. **Upload Back IC**
   - User uploads back IC photo
   - Click "Scan Back IC"
   - System extracts IC number and address

3. **Complete Verification**
   - After both scans, click "Verify IC with Government Database"
   - System verifies:
     - Both IC numbers match
     - IC exists in database
     - Not blacklisted/revoked
     - Name matches
     - Address matches
   - Shows verification result

4. **Registration**
   - If fully verified, proceed with registration
   - If not verified, user can still proceed (with warning)

### UI Indicators

- **Green checkmark**: Successfully scanned/verified
- **Red X**: Error or verification failed
- **Progress bar**: OCR processing in progress
- **Status badges**: Show verification status

## How to Test

### Option 1: Manual Entry
1. Navigate to registration page
2. Enter one of the valid IC numbers (e.g., `950815145678`)
3. System will auto-verify format and extract data
4. Complete registration

### Option 2: With Images (Recommended)
1. Create IC images with the test IC numbers
   - Front: Should show IC number and name clearly
   - Back: Should show IC number and address
2. Upload both images
3. Scan both sides
4. Click "Verify IC with Government Database"
5. If IC matches database, registration proceeds

### Option 3: Test Different Scenarios

**Success Case:**
- IC: `950815145678`
- Name: `AHMAD BIN ABDULLAH`
- Expected: Full verification success

**Blacklisted Case:**
- IC: `901010142345`
- Expected: Verification fails - "IC reported stolen"

**Revoked Case:**
- IC: `780305149999`
- Expected: Verification fails - "IC revoked - deceased"

**Not Found Case:**
- IC: `123456789012` (random)
- Expected: Verification fails - "IC not found in database"

**Mismatch Case:**
- Front IC: `950815145678`
- Back IC: `880422083456` (different)
- Expected: Verification fails - "IC numbers don't match"

## Backend Services

### IC Verification Service
`backend/services/icVerification.js`

Key functions:
- `verifyICWithDatabase()` - Check IC against mock database
- `verifyICFrontAndBack()` - Verify both sides match and valid
- `checkICRegistered()` - Prevent duplicate registrations
- `validateSecurityFeatures()` - Basic security feature validation

### IC OCR Utility
`backend/utils/icOCR.js`

Key functions:
- `extractICFromText()` - Extract IC number from OCR text
- `extractICBackFromText()` - Extract back IC data (address, etc.)
- `detectSecurityFeatures()` - Analyze image for security features
- `preprocessICImage()` - Enhance image for better OCR

## Database Schema Updates

The User model includes IC verification fields:

```javascript
{
  icNumber: String,           // Stored without dashes
  icVerified: Boolean,        // True if verified against database
  icVerifiedAt: Date,         // Timestamp of verification
  birthPlace: String,         // From IC validation
  // ... other fields
}
```

## Security Considerations

### Mock vs. Real Implementation

**Current (Mock):**
- Uses JSON file as database
- Predefined test ICs
- Simple address matching
- Basic security feature detection

**Real Implementation Would Include:**
- Connection to actual government API (JPN Malaysia)
- Real-time IC validation
- Biometric verification
- Advanced security feature detection using ML
- Face matching between IC photo and selfie
- Liveness detection
- Encrypted data transmission
- Audit logging of all verifications

### Privacy & Compliance

In production:
- IC images should be encrypted at rest
- Implement data retention policies
- Comply with PDPA (Personal Data Protection Act)
- Get user consent for data processing
- Allow users to delete their data
- Log all access to IC data

## Customization

### Adding More Test ICs

Edit `backend/data/mockICDatabase.json`:

```json
{
  "validICs": [
    {
      "icNumber": "YYMMDDPPNNNG",
      "fullName": "FULL NAME IN CAPS",
      "gender": "M" or "F",
      "dateOfBirth": "YYYY-MM-DD",
      "birthPlace": "State name",
      "nationality": "Malaysian",
      "religion": "Religion",
      "address": "FULL ADDRESS",
      "thumbprintPresent": true,
      "hologramPresent": true,
      "chipPresent": true,
      "status": "active"
    }
  ]
}
```

### Adjusting Verification Strictness

In `backend/services/icVerification.js`, modify:

```javascript
// Address matching threshold (0-1)
if (addressSimilarity < 0.5) {  // Current: 50% match required
  // Change to 0.3 for more lenient, 0.7 for stricter
}

// Security features required
return {
  passed: passedChecks >= 2,  // Current: at least 2 features
  // Change to >= 3 for stricter verification
}
```

## Troubleshooting

### OCR Not Extracting Data
- Ensure image quality is good (clear, well-lit)
- IC should be flat, not tilted
- Try adjusting crop area coordinates in Register.js
- Check browser console for OCR logs

### Verification Always Fails
- Verify IC number is in mockICDatabase.json
- Check exact format of name (must match exactly)
- Ensure IC not in blacklisted/revoked lists
- Check server logs for detailed errors

### Images Not Uploading
- Check file size (< 5MB)
- Verify image format (JPG, PNG, GIF)
- Check multer configuration in backend

## Future Enhancements

1. **Real Government API Integration**
   - Connect to JPN (Jabatan Pendaftaran Negara) API
   - Real-time IC validation

2. **AI-Powered Verification**
   - Face matching with IC photo
   - Document authenticity detection
   - Advanced OCR with deep learning

3. **Biometric Authentication**
   - Fingerprint matching
   - Liveness detection
   - Voice verification

4. **Enhanced Security**
   - 2FA during registration
   - Device fingerprinting
   - Risk-based authentication

5. **International Support**
   - Support for passports
   - Multiple country ID formats
   - International address validation

## Conclusion

This IC verification system provides a robust foundation for eKYC implementation. While it uses mock data for demonstration, the architecture is designed to be easily upgraded to use real government APIs when integrating with production systems.

The dual-side scanning ensures comprehensive verification, and the mock database allows thorough testing of various scenarios including edge cases and failure modes.
