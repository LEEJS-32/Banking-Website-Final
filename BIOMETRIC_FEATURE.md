# Biometric Authentication Feature

## Overview
Added fingerprint/face recognition authentication for high-value transactions (over $500) using the Web Authentication API (WebAuthn).

## Features Added

### Backend
1. **User Model Updates** (`models/User.js`)
   - Added `biometricCredentials` array to store multiple biometric devices
   - Added `biometricEnabled` boolean flag

2. **Biometric Controller** (`controllers/biometricController.js`)
   - `enrollBiometric` - Register a new biometric credential
   - `removeBiometric` - Remove a biometric credential
   - `verifyBiometric` - Verify user identity for transactions
   - `getBiometricStatus` - Check enrollment status
   - `getRegistrationChallenge` - Generate challenge for WebAuthn

3. **Biometric Routes** (`routes/biometricRoutes.js`)
   - GET `/api/biometric/status` - Get enrollment status
   - GET `/api/biometric/challenge/register` - Get registration challenge
   - POST `/api/biometric/enroll` - Enroll new biometric
   - POST `/api/biometric/verify` - Verify biometric
   - DELETE `/api/biometric/remove/:credentialId` - Remove credential

### Frontend
1. **Biometric Context** (`context/BiometricContext.js`)
   - Manages biometric availability and enrollment status
   - Handles WebAuthn API interactions
   - Provides methods for enrollment, verification, and removal

2. **Security Page** (`pages/Security.js`)
   - New page for managing biometric authentication
   - Shows enrollment status and enrolled devices
   - Allows users to enroll/remove biometric credentials
   - Displays helpful information about biometric security

3. **Transfer Page Updates** (`pages/Transfer.js`)
   - Detects transactions over $500
   - Prompts for biometric verification
   - Prevents transfer if biometric is not enrolled
   - Shows warning indicator when amount exceeds $500

4. **Dashboard Updates** (`pages/Dashboard.js`)
   - Added biometric verification for withdrawals over $500
   - Visual feedback during biometric authentication
   - Links to security settings if not enrolled

5. **Navigation Updates** (`components/Navbar.js`)
   - Added "Security" link to navigation menu

## How It Works

### For Users
1. **Enrollment:**
   - Go to Security page
   - Click "Enroll Biometric Authentication"
   - Follow device prompts (fingerprint/face scan)
   - Credential is stored securely

2. **Using Biometric:**
   - When making a transaction over $500 (transfer or withdrawal)
   - System automatically prompts for biometric verification
   - User authenticates with fingerprint/face
   - Transaction proceeds if verified

3. **Requirements:**
   - Device must support WebAuthn (Windows Hello, Touch ID, Face ID, etc.)
   - Modern browser (Chrome, Edge, Safari, Firefox)
   - HTTPS connection (or localhost for development)

## Security Features
- Biometric data never leaves the device
- Uses public-key cryptography
- Multiple devices can be enrolled
- Credentials can be removed anytime
- Required for all transactions over $500

## Browser Support
- ✅ Chrome/Edge (Windows Hello, Android biometrics)
- ✅ Safari (Touch ID, Face ID on Mac/iOS)
- ✅ Firefox (with biometric devices)
- ❌ Older browsers without WebAuthn support

## Testing
1. Navigate to Security page
2. Enroll your biometric (requires compatible device)
3. Try a transfer or withdrawal over $500
4. System will prompt for biometric verification
5. Authenticate to complete transaction

## Notes
- Works on localhost for development
- Requires HTTPS in production
- Biometric verification timeout: 60 seconds
- Transaction limit: $500
