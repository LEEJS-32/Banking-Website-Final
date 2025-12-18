# Payment Gateway Fraud Detection - Quick Start Guide

## Features Added

### 1. **Admin Fraud Website Management** (`/admin/fraud-websites`)
- View all blacklisted fraud websites
- Statistics dashboard (total, active, blocked attempts, risk levels)
- Add new fraud websites to blacklist
- Toggle active/inactive status
- Delete fraud websites from blacklist
- Risk level classification: low, medium, high, critical

### 2. **Payment Gateway** (`/payment/:sessionId`)
- Acts as payment intermediary between external merchants and bank
- Real-time fraud domain detection
- Automatic blocking of blacklisted merchant payments
- User-friendly payment confirmation interface
- Shows merchant details, amount, domain safety status
- Redirects back to merchant after payment completion

### 3. **Test Merchant Simulator** (`/test-merchant`)
- Demo page to simulate external merchant payment requests
- Preset test merchants (safe and fraud examples)
- Custom payment form to test different scenarios
- Educational flow diagram

## How to Test

### Step 1: Start Backend
```bash
cd backend
npm start
```

### Step 2: Add Fraud Websites to Blacklist
1. Login as admin at `/admin/login`
2. Navigate to "Fraud Websites" in admin menu
3. Click "+ Add Fraud Website"
4. Add test fraud websites:
   - Domain: `scamwebsite.com`
   - Merchant Name: `Scam Website`
   - Reason: `Known fraudulent merchant`
   - Risk Level: `High`

### Step 3: Test Payment Gateway
1. Login as regular user
2. Go to Dashboard
3. Click "🛒 Test Payment Gateway" button
4. You'll see preset merchants:
   - **Safe Merchant** (testmerchant.com) - Should process successfully
   - **Fraud Merchant** (scamwebsite.com) - Should be blocked

5. Try paying to a fraud merchant:
   - Click on "Scam Website" preset
   - Click "🔐 Proceed to Payment Gateway"
   - You'll see a **RED WARNING** message
   - Payment button will be disabled
   - Transaction will be recorded as "blocked"

6. Try paying to a safe merchant:
   - Click on "Test Merchant Store" preset
   - Click "🔐 Proceed to Payment Gateway"
   - No warning message
   - Click "Confirm Payment"
   - Payment processes successfully

### Step 4: View Results
1. Admin can check:
   - `/admin/fraud-websites` - See blocked transaction count increased
   - `/admin/transactions` - View all transactions including blocked ones
   
2. User can check:
   - `/transactions` - See their payment history

## API Endpoints

### Payment Gateway (Public/Protected)
```
POST /api/gateway/initiate - Initiate payment (public)
POST /api/gateway/process - Process payment (protected)
GET /api/gateway/session/:sessionId - Get payment session
```

### Fraud Website Management (Admin Only)
```
GET /api/admin/fraud-websites - List all fraud websites
GET /api/admin/fraud-websites/stats - Get statistics
POST /api/admin/fraud-websites - Add fraud website
PUT /api/admin/fraud-websites/:id - Update fraud website
DELETE /api/admin/fraud-websites/:id - Delete fraud website
```

## Transaction Model Updates

New transaction type: `payment`

New fields for payment transactions:
- `merchantUrl` - Original merchant website URL
- `merchantName` - Merchant display name
- `merchantDomain` - Extracted domain (e.g., "scamwebsite.com")
- `orderId` - Merchant's order reference
- `sessionId` - Payment session identifier
- `fraudWebsiteDetection` - Object containing:
  - `detected` - Boolean if fraud was detected
  - `domain` - Detected fraud domain
  - `merchantName` - Fraud merchant name
  - `reason` - Reason for blocking
  - `riskLevel` - Risk level classification

## Flow Diagram

```
External Merchant Website
         ↓
  POST /api/gateway/initiate
  (merchantUrl, amount, orderId)
         ↓
  Extract domain from URL
         ↓
  Check FraudWebsite database
         ↓
  Return { sessionId, domainCheck }
         ↓
  Redirect to /payment/:sessionId
         ↓
  User Login (if not logged in)
         ↓
  Show Payment Confirmation Page
  - If fraud detected: Show warning, disable payment
  - If safe: Allow payment
         ↓
  User clicks "Confirm Payment"
         ↓
  POST /api/gateway/process
         ↓
  Check domain again + rate limits
         ↓
  If fraud: Create blocked transaction → 403 Error
  If safe: Deduct balance → Create completed transaction
         ↓
  Redirect back to merchant with result
```

## Security Features

1. **Domain Extraction**: Normalizes URLs (removes http, https, www)
2. **Database Indexing**: Fast domain lookups
3. **Active Status**: Can temporarily disable blacklist entries
4. **Risk Levels**: Classify threats by severity
5. **Audit Trail**: All blocked attempts recorded
6. **Rate Limiting**: Still applies to payment transactions
7. **Balance Checks**: Ensures sufficient funds before processing

## Testing Scenarios

### Scenario 1: Blocked Payment
1. Add "scamwebsite.com" to blacklist
2. Try to pay to merchant with URL "https://scamwebsite.com"
3. **Expected**: Red warning, payment blocked, transaction recorded as blocked

### Scenario 2: Successful Payment
1. Use merchant "testmerchant.com" (not in blacklist)
2. Try to pay with sufficient balance
3. **Expected**: Payment succeeds, balance deducted, transaction completed

### Scenario 3: Insufficient Balance
1. Use safe merchant
2. Try to pay more than your balance
3. **Expected**: Error message about insufficient funds

### Scenario 4: Rate Limited
1. Make many rapid payments
2. Try another payment
3. **Expected**: Rate limit error, transaction blocked

### Scenario 5: Inactive Fraud Entry
1. Add fraud website to blacklist
2. Toggle status to "Inactive"
3. Try to pay to that merchant
4. **Expected**: Payment goes through (fraud check bypassed)

## Notes

- Payment gateway automatically redirects to login if user not authenticated
- All transactions (blocked and completed) are recorded in database
- Admin can track which fraud websites are blocking the most transactions
- The system acts as a "middle agent" - merchants redirect to our gateway
- Domain checking happens before any money movement
- User sees clear warnings for fraudulent merchants
