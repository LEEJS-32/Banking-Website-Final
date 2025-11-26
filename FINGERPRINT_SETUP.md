# Fingerprint Scanner Setup Guide

## Overview
This banking system now supports **R307 hardware fingerprint scanner** as an alternative biometric authentication method alongside browser-based biometrics.

## Features
- **R307 Fingerprint Scanner Integration** - Hardware-based biometric authentication
- **SIFT Matching Algorithm** - Advanced fingerprint matching with 25-point threshold
- **Dual Biometric Support** - Choose between browser biometric or hardware scanner
- **Flask API Service** - Standalone fingerprint verification API on port 5002
- **MongoDB Storage** - User fingerprint enrollment status tracking

---

## Prerequisites

### Hardware
- **R307 Optical Fingerprint Scanner Module**
- Connected to **COM3** port at **57600 baud rate**

### Software
- Python 3.10.11 or higher
- Node.js (for backend/frontend)
- MongoDB

---

## Installation Steps

### 1. Install Python Dependencies
```bash
cd fingerprint
pip install -r requirements.txt
```

**Required packages:**
- Flask==2.3.2
- flask-cors==4.0.0
- pyserial==3.5
- opencv-python==4.8.0.74
- numpy==1.24.3

### 2. Connect R307 Scanner
- Connect the R307 fingerprint scanner to your computer
- Ensure it's connected to **COM3** port
- If using a different port, update `SCANNER_PORT` in `fingerprint_api.py`

### 3. Start the Fingerprint API
```bash
cd fingerprint
python fingerprint_api.py
```

The API will start on **http://localhost:5002**

You should see:
```
==================================================
Fingerprint Scanner API Server
==================================================
Scanner Port: COM3
Match Threshold: 25
Scanner Status: Connected
==================================================

Starting server on http://localhost:5002
```

### 4. Start the Backend Server
```bash
cd backend
npm install  # if not already done
npm start
```

Backend runs on **http://localhost:5000**

### 5. Start the Frontend
```bash
cd frontend
npm install  # if not already done
npm start
```

Frontend runs on **http://localhost:3001** (or 3000 if available)

---

## API Endpoints

### Fingerprint API (Port 5002)

#### Health Check
```
GET /health
Response: { "status": "ok", "scanner": "R307", "port": "COM3" }
```

#### Enroll Fingerprint
```
POST /enroll
Body: { "userId": "user@example.com" }
Response: { "success": true, "message": "Fingerprint enrolled successfully" }
```

#### Verify Fingerprint
```
POST /verify
Body: { "userId": "user@example.com" }
Response: { "verified": true, "userId": "user@example.com", "score": 35 }
```

#### Remove Fingerprint
```
POST /remove
Body: { "userId": "user@example.com" }
Response: { "success": true, "message": "Fingerprint removed" }
```

#### List Enrolled Users
```
GET /list
Response: { "total": 2, "users": [...] }
```

### Backend API (Port 5000)

All endpoints require authentication token in header:
```
Authorization: Bearer <token>
```

#### Check Scanner Status
```
GET /api/fingerprint/health
```

#### Get Enrollment Status
```
GET /api/fingerprint/status
Response: { "enrolled": true, "enrolledAt": "2024-01-15", "device": "R307" }
```

#### Enroll Fingerprint
```
POST /api/fingerprint/enroll
(Place finger on scanner when prompted)
```

#### Verify Fingerprint
```
POST /api/fingerprint/verify
(Place finger on scanner when prompted)
```

#### Remove Fingerprint
```
DELETE /api/fingerprint/remove
```

---

## Usage Flow

### For Users

#### 1. Enroll Fingerprint
1. Log in to your account
2. Navigate to **Security** page
3. Find the "Hardware Fingerprint Scanner" section
4. Ensure scanner shows "Scanner Connected"
5. Click **"Enroll Fingerprint"**
6. Place your finger on the R307 scanner when prompted
7. Wait for confirmation message
8. Your fingerprint is now enrolled!

#### 2. Make Transfers with Fingerprint
1. Go to **Transfer Money** page
2. Enter recipient account number and amount
3. If amount > $500, verification is required
4. **If both biometric methods are enrolled:**
   - A modal will appear asking you to choose:
     - **Browser Biometric** (Face ID / Touch ID)
     - **Hardware Scanner** (R307)
5. **If only fingerprint enrolled:**
   - Automatically prompts for fingerprint scan
6. Place finger on scanner and wait for verification
7. Transfer proceeds if verified successfully

#### 3. Remove Fingerprint
1. Go to **Security** page
2. In "Hardware Fingerprint Scanner" section
3. Click **"Remove Fingerprint"**
4. Confirm removal

---

## Configuration

### Change Scanner Port
Edit `fingerprint/fingerprint_api.py`:
```python
SCANNER_PORT = 'COM3'  # Change to your port (e.g., 'COM4', '/dev/ttyUSB0')
```

### Adjust Match Threshold
Edit `fingerprint/fingerprint_api.py`:
```python
MATCH_THRESHOLD = 25  # Lower = stricter matching (15-30 recommended)
```

### Change API Port
Edit `fingerprint/fingerprint_api.py`:
```python
app.run(host='0.0.0.0', port=5002, debug=True)  # Change port number
```

Also update frontend references:
- `frontend/src/pages/Security.js`
- `frontend/src/pages/Transfer.js`

---

## Troubleshooting

### Scanner Not Connected
**Issue:** "Scanner Not Connected" message in UI

**Solutions:**
1. Check physical connection of R307 scanner
2. Verify correct COM port (Windows) or device path (Linux)
3. Ensure no other application is using the scanner
4. Restart the fingerprint API service
5. Check serial port permissions (Linux: `sudo chmod 666 /dev/ttyUSB0`)

### Failed to Capture Fingerprint
**Issue:** "Failed to capture fingerprint" error

**Solutions:**
1. Clean the scanner surface
2. Ensure finger is placed firmly on scanner
3. Try a different finger
4. Wait for scanner LED to turn on before placing finger
5. Check scanner power supply

### Fingerprint Not Matching
**Issue:** Low match score / verification fails

**Solutions:**
1. Re-enroll the same finger used for verification
2. Adjust `MATCH_THRESHOLD` (decrease for stricter, increase for more lenient)
3. Ensure finger is placed in same position as enrollment
4. Clean the scanner surface
5. Try multiple verification attempts

### API Connection Failed
**Issue:** "Failed to connect to fingerprint scanner" in browser

**Solutions:**
1. Ensure fingerprint API is running (`python fingerprint_api.py`)
2. Check API is accessible at `http://localhost:5002/health`
3. Verify CORS is enabled (should be by default)
4. Check firewall settings
5. Restart the API service

### Port Already in Use
**Issue:** `Address already in use` error

**Solutions:**
1. Kill existing process on port 5002:
   ```bash
   # Windows
   netstat -ano | findstr :5002
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:5002 | xargs kill -9
   ```
2. Or change the port in `fingerprint_api.py`

---

## Technical Details

### SIFT Matching Algorithm
- **Feature Detection:** SIFT (Scale-Invariant Feature Transform)
- **Matcher:** FLANN (Fast Library for Approximate Nearest Neighbors)
- **Ratio Test:** Lowe's ratio test with threshold 0.75
- **Match Threshold:** 25 good matches required for verification

### Image Processing Pipeline
1. Capture fingerprint image from R307 (288x256 pixels, 4-bit grayscale)
2. Convert to 8-bit grayscale
3. Normalize pixel values
4. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
5. Crop 5px from edges to remove noise
6. Extract SIFT features
7. Match against stored template
8. Return match score

### Data Storage
- **Fingerprint API:** JSON file (`fingerprint_db.json`) stores base64-encoded processed images
- **Backend Database:** MongoDB stores enrollment status in User model:
  ```javascript
  {
    fingerprintEnrolled: Boolean,
    fingerprintEnrolledAt: Date,
    fingerprintDevice: String
  }
  ```

### Security Considerations
- Fingerprint templates stored as processed images (not raw data)
- Base64 encoding for storage
- HTTPS recommended for production (not configured by default)
- No cloud storage - all data stays on local server
- Scanner communication encrypted at hardware level

---

## Database Schema

### User Model (MongoDB)
```javascript
{
  // ... existing fields ...
  
  // WebAuthn Browser Biometric
  biometricCredentials: [{
    credentialId: String,
    publicKey: String,
    counter: Number,
    deviceName: String,
    enrolledAt: Date
  }],
  biometricEnabled: Boolean,
  
  // R307 Fingerprint Scanner
  fingerprintEnrolled: Boolean,
  fingerprintEnrolledAt: Date,
  fingerprintDevice: String  // "R307"
}
```

### Fingerprint Database (JSON)
```json
{
  "user@example.com": {
    "fingerprint": "base64_encoded_image_data",
    "enrolled_at": "2024-01-15T10:30:00",
    "device": "R307"
  }
}
```

---

## Development Notes

### File Structure
```
fingerprint/
├── fingerprint_api.py       # Flask API server
├── requirements.txt          # Python dependencies
├── fingerprint_db.json       # Runtime database (auto-created)
└── main.py                   # Original standalone script (reference)

backend/
├── controllers/
│   └── fingerprintController.js   # Backend API logic
├── routes/
│   └── fingerprintRoutes.js       # API routes
└── models/
    └── User.js                     # Updated schema

frontend/src/pages/
├── Security.js               # Enrollment UI
└── Transfer.js               # Verification UI
```

### Adding New Features

#### Add New Endpoint
1. Add function to `fingerprint/fingerprint_api.py`
2. Add controller in `backend/controllers/fingerprintController.js`
3. Add route in `backend/routes/fingerprintRoutes.js`
4. Update frontend as needed

#### Change Scanner Model
- Replace R307 class methods in `fingerprint_api.py`
- Adjust image dimensions if different
- Update communication protocol as per new scanner specs

---

## Production Deployment

### Security Enhancements
1. **Use HTTPS** - Configure SSL certificates
2. **Environment Variables** - Move ports and configs to `.env`
3. **Authentication** - Add API key for fingerprint API
4. **Rate Limiting** - Prevent brute force attempts
5. **Logging** - Implement comprehensive logging
6. **Error Handling** - Mask internal error details

### Scaling Considerations
- Use Redis for fingerprint template caching
- Move to PostgreSQL for better performance
- Implement message queue for async processing
- Load balancer for multiple scanner instances
- Cloud storage for encrypted templates

### Monitoring
- Health check endpoint monitoring
- Scanner connection status alerts
- Failed verification attempt tracking
- API response time monitoring
- Error rate tracking

---

## License & Credits

### Components Used
- **R307 Fingerprint Scanner** - Hardware biometric sensor
- **OpenCV** - Image processing and SIFT algorithm
- **Flask** - Python web framework
- **Express.js** - Node.js backend framework
- **React** - Frontend UI framework

### References
- R307 Datasheet: [Link]
- SIFT Algorithm: Lowe, D. G. (2004)
- WebAuthn API: W3C Standard

---

## Support

For issues or questions:
1. Check this guide first
2. Review console logs (backend, frontend, fingerprint API)
3. Test API endpoints individually
4. Verify hardware connections
5. Check system requirements

---

## Version History

### v1.0.0 (Current)
- Initial R307 fingerprint scanner integration
- SIFT matching algorithm
- Dual biometric support (browser + hardware)
- Flask API service
- Security page enrollment UI
- Transfer page verification flow
- MongoDB schema updates
- Complete documentation
