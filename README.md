# SecureBank - Complete Banking System

A full-stack secure banking application with advanced fraud detection, dual biometric authentication, payment gateway, and comprehensive admin controls.

## 🌟 Key Features

### Banking Operations
- **Multi-Account Support**: Users can have multiple bank accounts (checking/savings)
- **Real-Time Transactions**: Deposits, withdrawals, and transfers with instant balance updates
- **Transaction History**: Complete audit trail with fraud detection results
- **Payment Gateway**: External merchant integration with fraud website blocking

### Security & Authentication
- **Dual Biometric Authentication**:
  - **Browser Biometrics** (WebAuthn): Windows Hello, Touch ID, Face ID
  - **Hardware Fingerprint Scanner**: R307 sensor support
  - User can choose between both methods when available
- **Email Verification**: Required for user accounts (admins exempt)
- **Rate Limiting**: Automatic transaction blocking to prevent abuse
- **Account Locking**: 3 failed login attempts = 15-minute lockout
- **Role-Based Access**: Separate admin and user portals with strict role enforcement

### Fraud Prevention
- **ML-Based Fraud Detection**: Real-time risk scoring with 14-feature model
- **Risk Levels**: 
  - **Low risk** → Transaction approved
  - **Medium risk** → Flagged for review
  - **High risk** → Transaction blocked
- **Fraud Website Blacklist**: Admin-managed domain blocking for payment gateway
- **Transaction Rate Limiting**: Prevents rapid-fire transaction abuse

### eKYC & Verification
- **Malaysian IC (MyKad) Verification**:
  - OCR scanning for front and back IC images
  - Mock government database verification
  - Auto-fill user data from IC number
  - Age verification (18+ required)
  - Blacklist and revoked IC detection

### Admin Portal
- **User Management**: View, activate/deactivate, unlock blocked accounts
- **Balance Adjustments**: Credit/debit user accounts with audit trail
- **Transaction Monitoring**: Real-time oversight with fraud flags
- **Pending Payments**: Track payment gateway sessions
- **Fraud Website Management**: Add/remove blocked domains
- **Rate Limit Management**: View and unblock rate-limited users

## 📊 Transaction Limits & Rate Limiting

### Rate Limiting Rules

The system implements smart rate limiting to prevent abuse:

**Per-User Transaction Limits:**
- **5 transactions** within 1 hour
- **10 transactions** within 24 hours
- **$5,000 total** within 1 hour
- **$20,000 total** within 24 hours

**What Happens When Limit is Hit:**
1. User receives HTTP 429 error with remaining time until unblock
2. Transaction is recorded with status `blocked` and `blockReason`
3. User is temporarily blocked (visible in Admin → Users page)
4. **Admin can manually unblock** from Admin Panel → Users → Unblock button
5. Automatic unblock after time expires

**Exemptions:**
- Admin balance adjustments don't count toward user limits
- Deposits under $100 have relaxed limits
- Failed/declined transactions don't count toward limits

### Account Locking (Login Failures)

- **3 failed login attempts** → Account locked for **15 minutes**
- Admin can manually unlock from Users management page
- Automatic unlock after 15 minutes
- Lock applies to both user and admin accounts

## 🚀 Quick Start

### Prerequisites

- **Node.js** 16+ with npm
- **Python** 3.10+ (for fraud API and optional fingerprint scanner)
- **MongoDB Atlas** account with connection string
- **(Optional)** R307 fingerprint scanner for hardware biometric support

### Installation

**1. Clone and install dependencies:**

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install Python dependencies for fraud detection
cd ../transaction_9_Gemini
pip install -r requirements.txt

# (Optional) Install fingerprint scanner dependencies
cd ../fingerprint
pip install -r requirements.txt
```

**2. Configure backend environment:**

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=development
FRAUD_API_URL=http://localhost:5001

# Email service (for verification emails)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

**3. Initialize database and create admin:**

```bash
cd backend
npm run setup
```

**Default Admin Credentials:**
- Email: `admin@securebank.com`
- Password: `admin123`
- ⚠️ **Change these in production!**

### Running the Application

**Option 1: One-Click Start (Recommended)**

```bash
# Windows - Start all services including fingerprint scanner
start-all.bat

# Windows PowerShell - Start without fingerprint scanner
.\start.ps1
```

**Option 2: Manual Start (4 terminals)**

```bash
# Terminal 1: Fraud Detection API (Required)
cd transaction_9_Gemini
python fraud_api.py
# Runs on http://localhost:5001

# Terminal 2: Backend API
cd backend
npm start
# Runs on http://localhost:5000

# Terminal 3: Frontend
cd frontend
npm start
# Runs on http://localhost:3000

# Terminal 4: Fingerprint Scanner (Optional)
cd fingerprint
python fingerprint_api.py
# Runs on http://localhost:5002
```

## 🎯 Testing Guide

### 1. User Registration & Login

**Test User Registration:**
1. Go to `http://localhost:3000/register`
2. Upload IC images or manually enter IC number
3. **Valid test ICs:**
   - `041207010419` - Valid IC (18+, born 2004)
   - `950815145678` - Valid IC (born 1995)
   - `901010142345` - **Blacklisted IC** (will be rejected)
   - `780305149999` - **Revoked IC** (will be rejected)
4. Complete registration → Check email for verification link
5. Verify email → Login at `http://localhost:3000/login`

**Test Admin Login:**
1. Go to `http://localhost:3000/admin/login`
2. Email: `admin@securebank.com`
3. Password: `admin123`

### 2. Biometric Authentication

**Enroll Biometrics:**
1. Login as user → Go to **Security** page
2. Choose enrollment method:
   - **Browser Biometric**: Click "Enroll New Device" → Follow browser prompts (Windows Hello, Touch ID, etc.)
   - **Fingerprint Scanner**: Ensure R307 scanner connected → Click "Enroll Fingerprint" → Place finger 3 times

**Test Biometric Verification:**
1. Go to **Dashboard**
2. Enter withdrawal amount > $500 (triggers biometric requirement)
3. Click **Withdraw**
4. If both methods enrolled, choose verification method
5. Complete biometric verification

### 3. Fraud Detection

**Test Low-Risk Transaction:**
```
Amount: $50
Description: "Groceries"
Expected Result: Transaction approved (low risk)
```

**Test Medium-Risk Transaction:**
```
Amount: $2,000
Description: "Unusual purchase"
Expected Result: Transaction flagged for review (medium risk)
```

**Test High-Risk Transaction:**
```
Amount: $5,000
Description: "Suspicious transfer"
Expected Result: Transaction blocked (high risk)
```

**Check Fraud API Health:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5001/health"
```

### 4. Rate Limiting

**Trigger Rate Limit:**
1. Make **5 quick deposits/withdrawals** within a minute
2. 6th transaction will be **blocked** with HTTP 429
3. Error message shows remaining time until unblock
4. Go to **Admin → Users** → See blocked user indicator (⚠️ icon)
5. Admin can click **"Unblock"** to remove rate limit immediately

### 5. Payment Gateway

**Test Legitimate Merchant:**
1. Open `demo-merchants/legitimate-store.html` in browser
2. Click **"Buy Now"**
3. Login if needed
4. Verify biometric (if enrolled)
5. Confirm payment
6. Check **Admin → Pending Payments** for session tracking

**Test Fraud Website Blocking:**
1. Admin login → Go to **Fraud Websites** page
2. Add `scamwebsite.com` to blacklist
3. Open `demo-merchants/fraud-store.html`
4. Attempt checkout
5. Payment **blocked** with fraud warning

### 6. Admin Functions

**Manage Users:**
- View all users with account balances
- Activate/deactivate user accounts
- Unlock locked accounts (failed login attempts)
- **Unblock rate-limited users**
- Adjust user balances (credit/debit)

**Monitor Transactions:**
- View all transactions with fraud flags
- Filter by status: completed/pending/blocked
- See fraud detection scores and reasons

**Fraud Website Management:**
- Add domains to blacklist
- View blocked transaction counts per domain
- Activate/deactivate domain blocks

## 📁 Project Structure

```
Banking-Website-Final/
├── backend/                    # Express.js API
│   ├── controllers/           # Business logic
│   │   ├── authController.js  # Registration, login, IC verification
│   │   ├── transactionController.js  # Deposits, withdrawals, transfers
│   │   ├── adminController.js # Admin user/transaction management
│   │   ├── paymentGatewayController.js  # Payment processing
│   │   ├── biometricController.js  # WebAuthn biometrics
│   │   └── fingerprintController.js  # Hardware scanner
│   ├── models/                # MongoDB schemas
│   │   ├── User.js           # User authentication & profile
│   │   ├── Account.js        # Bank accounts (multi-account support)
│   │   ├── Transaction.js    # Transaction records
│   │   ├── FraudDetection.js # Fraud analysis results
│   │   ├── FraudWebsite.js   # Blacklisted domains
│   │   ├── PendingPayment.js # Payment gateway sessions
│   │   └── ICRecord.js       # eKYC verification records
│   ├── routes/               # API endpoints
│   ├── middleware/           # Auth & rate limiting
│   ├── services/             # Fraud detection integration
│   └── data/                 # Mock IC database
│
├── frontend/                  # React + Tailwind UI
│   ├── src/
│   │   ├── pages/            # Main pages
│   │   │   ├── Dashboard.js  # User dashboard
│   │   │   ├── Transfer.js   # Money transfer
│   │   │   ├── Security.js   # Biometric enrollment
│   │   │   ├── Register.js   # User registration with eKYC
│   │   │   ├── PaymentGateway.js # Payment processing
│   │   │   ├── AdminDashboard.js # Admin overview
│   │   │   ├── AdminUsers.js # User management
│   │   │   └── AdminTransactions.js
│   │   ├── components/       # Reusable components
│   │   │   ├── Navbar.js     # User navigation
│   │   │   ├── AdminNavbar.js # Admin navigation
│   │   │   ├── PrivateRoute.js # User route guard
│   │   │   └── AdminRoute.js # Admin route guard
│   │   └── context/          # Auth & biometric state
│   
├── transaction_9_Gemini/      # Fraud Detection (Python)
│   ├── fraud_api.py          # Flask API (port 5001)
│   ├── whole.py              # ML model training
│   ├── fraud_detection_system.joblib  # Trained model
│   └── data/
│       └── CreditCardData.csv  # Training dataset
│
├── fingerprint/               # Fingerprint Scanner (Python)
│   ├── fingerprint_api.py    # Flask API (port 5002)
│   ├── main.py               # R307 driver
│   └── fingerprint_db.json   # Enrolled fingerprints
│
└── demo-merchants/            # Test merchant pages
    ├── legitimate-store.html
    └── fraud-store.html
```

## 🔧 API Endpoints

### Authentication
```
POST   /api/auth/register           # User registration with eKYC
POST   /api/auth/login              # User login (requires email verification)
POST   /api/auth/admin/login        # Admin login (no email verification)
POST   /api/auth/verify-email/:token
GET    /api/auth/resend-verification
POST   /api/auth/verify-ic          # IC verification (OCR + database)
```

### Transactions
```
GET    /api/transactions            # Get user transactions
POST   /api/transactions/deposit    # Deposit money
POST   /api/transactions/withdraw   # Withdraw money
POST   /api/transactions/transfer   # Transfer money
```

### Admin
```
GET    /api/admin/users             # Get all users with accounts
GET    /api/admin/users/:id         # Get user details
PUT    /api/admin/users/:id/status  # Activate/deactivate user
PUT    /api/admin/users/:id/unlock  # Unlock locked account
PUT    /api/admin/users/:id/balance # Adjust user balance
GET    /api/admin/transactions      # Get all transactions
GET    /api/admin/pending-payments  # Get payment gateway sessions
```

### Biometrics
```
GET    /api/biometric/status        # Check WebAuthn enrollment
POST   /api/biometric/enroll        # Enroll browser biometric
POST   /api/biometric/verify        # Verify browser biometric
GET    /api/fingerprint/status      # Check fingerprint enrollment
POST   /api/fingerprint/enroll      # Enroll R307 fingerprint
POST   /api/fingerprint/verify      # Verify R307 fingerprint
```

### Payment Gateway
```
POST   /api/gateway/initiate        # Create payment session
GET    /api/gateway/session/:id     # Get session details
POST   /api/gateway/confirm/:id     # Confirm payment (requires biometric)
POST   /api/gateway/cancel/:id      # Cancel payment
```

### Fraud Websites
```
GET    /api/fraud-websites          # Get all blacklisted domains
POST   /api/fraud-websites          # Add domain to blacklist
PUT    /api/fraud-websites/:id/status # Activate/deactivate domain
```

## 🛠️ Troubleshooting

### MongoDB Connection Issues
- Verify MongoDB Atlas **IP whitelist** includes your current IP
- Check `MONGODB_URI` in `.env` is correct
- Ensure database user has **read/write permissions**

### Fraud API Not Responding
- Check Python service is running on port **5001**
- Verify `FRAUD_API_URL` in backend `.env`
- Test: `Invoke-RestMethod -Uri "http://localhost:5001/health"`
- Ensure all Python dependencies installed: `pip install -r requirements.txt`

### Fingerprint Scanner Issues
- Ensure **R307 scanner** is connected via USB-to-Serial adapter
- Check **COM port** in `fingerprint/main.py` (default: `COM3`)
- Verify Python service running on port **5002**
- Test scanner connection: `cd fingerprint && python test_scanner.py`

### Email Verification Not Sending
- Verify `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`
- For **Gmail**: use App Password (not regular password)
  1. Enable 2FA on Google Account
  2. Generate App Password: Google Account → Security → 2-Step Verification → App Passwords
- Check email service logs in backend console

### Port Conflicts
- **Backend (5000)**: Stop other Node.js processes
- **Frontend (3000/3001)**: Close other React dev servers
- **Fraud API (5001)**: Check Python processes: `Get-Process | Where-Object {$_.Path -like "*python*"}`
- **Fingerprint (5002)**: Check Python processes

### Admin Can't Access Pages / Logout on Refresh
- **Clear browser localStorage** and login again
- Verify admin role in database: `role: "admin"`
- Check browser console for authentication errors
- Ensure `AdminRoute.js` has loading state check

### Rate Limit Issues
- Check **Admin → Users** page for blocked status (⚠️ icon)
- Admin can **manually unblock** users by clicking Unblock button
- Wait for automatic unblock (time shown in error message)

### User Accidentally Seeing Admin Pages
- This should not happen - `PrivateRoute` redirects admins to `/admin/dashboard`
- If it occurs, clear browser cache and localStorage
- Verify role in database matches login portal used

## 📝 Important Notes

### Security Best Practices
- ✅ **Change default admin password** immediately in production
- ✅ Use **strong JWT_SECRET** (32+ random characters)
- ✅ Enable MongoDB Atlas **network access restrictions**
- ✅ Use **environment variables** for all secrets (never hardcode)
- ✅ Enable **HTTPS** in production (required for WebAuthn)
- ✅ Regular **security audits** and dependency updates

### Database Schema - Normalized Structure

The system uses a **normalized database** with separate collections:

**Users Collection:**
- Authentication data (email, password hash)
- Profile data (name, IC number, phone)
- Security settings (login attempts, lockout)
- Role (`user` or `admin`)

**Accounts Collection:**
- Linked to user via `userId`
- Account details (account number, balance, type)
- Bank information (bank name, country)
- Shipping address
- Primary account flag (`isPrimary`)
- **Users can have multiple accounts**

**Transactions Collection:**
- Linked to both `userId` and `accountId`
- Transaction data (amount, type, description)
- Fraud detection reference (`fraudDetectionId`)
- Status (completed, pending, blocked)

**FraudDetection Collection:**
- Separate from transactions for better querying
- ML model results (risk level, probability, reasons)
- SHAP explanations for transparency

### Known Limitations
- IC verification uses **mock database** (not real government API)
  - Located in `backend/data/mockICDatabase.json`
  - Suitable for demonstration only
- Fraud detection model trained on **sample dataset**
  - Requires retraining with real data for production
- Email verification requires **email service configuration**
  - Gmail recommended for development
- Fingerprint scanner requires **specific hardware** (R307)
  - Optional feature - system works without it

### Authentication Flow Differences

**User Login:**
1. Check if user exists
2. Verify password
3. **Check if email verified** ✅
4. Check if account active
5. Check if account locked
6. Issue JWT token

**Admin Login:**
1. Check if user exists
2. Verify password
3. **Skip email verification** ❌
4. Check if account active
5. Check if account locked
6. Issue JWT token

Admins cannot login via user portal and vice versa.

## 🎓 Development

### Adding New Features
1. **Backend**: Add route → create controller function → update model if needed
2. **Frontend**: Create page component → add route in `App.js` → link from navigation
3. **Test thoroughly** with both user and admin accounts
4. **Update this README** with new feature documentation

### Database Migrations
1. Update model in `backend/models/`
2. Create migration script in `backend/scripts/` if needed
3. Test with sample data
4. Document schema changes

### Running Tests
```bash
# Backend tests (if available)
cd backend
npm test

# Fraud API tests
cd transaction_9_Gemini
python test_api.py
```

## 📞 Support

For issues or questions:
1. Check **Troubleshooting** section above
2. Review **error messages** in browser console (F12)
3. Check **backend logs** for detailed errors
4. Verify **all services are running** (backend, frontend, fraud API)
5. Check **API endpoints** with tools like Postman or curl

---

**License**: MIT  

**Key Technologies:**  
Node.js • Express • React • MongoDB Atlas • Python Flask • TensorFlow • WebAuthn • Tailwind CSS
