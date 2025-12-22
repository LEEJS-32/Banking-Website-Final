# Database Restructuring Summary

## Changes Made

### 1. **New Collections Created**

#### **ACCOUNTS Collection**
Separates account information from users, allowing users to have multiple accounts.

**Attributes:**
- `_id`: ObjectId (MongoDB ID)
- `userId`: ObjectId (reference to User)
- `accountNumber`: String (unique, 10 digits)
- `accountType`: String ("savings" | "checking")
- `balance`: Number
- `bank`: String (e.g., "HSBC", "Maybank", etc.)
- `country`: String (account country)
- `shippingAddress`: String
- `isActive`: Boolean
- `isPrimary`: Boolean (indicates user's primary account)
- `createdAt`: Date
- `updatedAt`: Date

#### **FRAUDDETECTIONS Collection**
Separates fraud detection results from transactions for better data normalization.

**Attributes:**
- `_id`: ObjectId
- `transactionId`: ObjectId (reference to Transaction)
- `checked`: Boolean
- `isFraud`: Boolean
- `fraudProbability`: Number (0-1)
- `riskLevel`: String ("low" | "medium" | "high" | "unknown")
- `reasons`: Array of Strings
- `recommendation`: String ("APPROVE" | "REVIEW" | "BLOCK")
- `modelVersion`: String (ML model version used)
- `threshold`: Number
- `features`: Object (input features used for detection)
  - `amount`, `transactionHour`, `merchantGroup`, `userAge`, etc.
- `shapValues`: Array (SHAP explainability values)
- `checkedAt`: Date

---

### 2. **Updated Collections**

#### **USERS Collection**
Removed account-related fields (now in Accounts collection).

**Removed fields:**
- ❌ `accountNumber`
- ❌ `balance`
- ❌ `accountType`
- ❌ `bank`
- ❌ `country`
- ❌ `shippingAddress`

**Retained fields:**
- Personal info: `firstName`, `lastName`, `email`, `password`
- User settings: `role`, `isActive`, `gender`, `dateOfBirth`
- IC verification: `icNumber`, `icVerified`, `icVerifiedAt`, `birthPlace`
- Biometric: `biometricCredentials`, `biometricEnabled`
- Fingerprint: `fingerprintEnrolled`, `fingerprintEnrolledAt`, `fingerprintDevice`
- Security: `loginAttempts`, `lockUntil`, `isLocked`
- Rate limiting: `recentTransactions`, `transactionBlockedUntil`
- Timestamps: `createdAt`

#### **TRANSACTIONS Collection**
Now references Account and FraudDetection instead of embedding data.

**Added fields:**
- ✅ `accountId`: ObjectId (reference to Account)
- ✅ `fraudDetectionId`: ObjectId (reference to FraudDetection)

**Removed fields:**
- ❌ `fraudDetection` (embedded object - now in FraudDetections collection)

**Retained fields:**
- `userId`, `type`, `amount`, `recipientAccountNumber`, `recipientName`
- `description`, `balanceAfter`, `status`, `blockReason`
- Payment gateway: `merchantUrl`, `merchantName`, `merchantDomain`, `orderId`, `sessionId`
- `fraudWebsiteDetection` (still embedded - domain-specific)
- Timestamps: `createdAt`, `expiresAt`, `completedAt`

---

## Benefits

### 1. **Multi-Account Support**
- Users can now have multiple bank accounts (savings, checking, etc.)
- Each account can have different banks and countries
- Supports primary account designation

### 2. **Better Data Normalization**
- Fraud detection data separated from transactions
- Reduces data duplication
- Easier to query and analyze fraud patterns

### 3. **Improved Scalability**
- Cleaner user profiles
- Account management independent of user profile
- Fraud detection analytics easier to perform

### 4. **Registration Flow**
- Bank and country fields now captured during account creation
- Supports international multi-currency scenarios
- Each account can have its own shipping address

---

## Migration Results

✅ **3 accounts** created from existing users  
✅ **1 fraud detection** record extracted  
✅ **7 transactions** linked to accounts  
✅ User collection cleaned up (removed account fields)

---

## Current Database State

### Collections:
- **fraudwebsites**: 232 documents
- **frauddetections**: 1 document ✨ NEW
- **transactions**: 7 documents (updated with accountId)
- **users**: 3 documents (cleaned up)
- **icrecords**: 8 documents
- **accounts**: 3 documents ✨ NEW
- **pendingpayments**: 0 documents

---

## Next Steps for Developers

### 1. Update Controllers
Update all controllers to work with the new Account model:
- `authController.js` - Create account during registration
- `transactionController.js` - Use accountId instead of user balance
- Create new `accountController.js` for account management

### 2. Update Frontend
- Add account selection for transactions
- Add account management page
- Update registration to capture bank/country
- Show multiple accounts in dashboard

### 3. API Updates Needed
- `POST /api/accounts` - Create new account
- `GET /api/accounts` - Get user's accounts
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete/deactivate account
- `POST /api/accounts/:id/set-primary` - Set primary account

---

## Example Queries

### Get user with their accounts:
```javascript
const user = await User.findById(userId);
const accounts = await Account.find({ userId: user._id });
```

### Get transaction with fraud detection:
```javascript
const transaction = await Transaction.findById(txnId)
  .populate('userId')
  .populate('accountId')
  .populate('fraudDetectionId');
```

### Create new account for user:
```javascript
const account = new Account({
  userId: user._id,
  accountNumber: generateAccountNumber(),
  accountType: 'savings',
  bank: 'Maybank',
  country: 'Malaysia',
  isPrimary: false,
});
await account.save();
```
