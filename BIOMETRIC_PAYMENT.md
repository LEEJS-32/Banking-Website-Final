# Biometric Authentication & Pending Payment Tracking

## Overview
This document explains the biometric authentication and pending payment tracking features added to the payment gateway system.

## 1. Biometric Authentication on Payment Page

### How It Works
When a user attempts to make a payment and has biometric authentication enabled:

1. User clicks "Confirm Payment"
2. A biometric verification modal appears
3. User must verify their fingerprint
4. Payment only proceeds if verification succeeds

### Implementation Details

**Frontend** (`PaymentGateway.js`):
- Imports `useBiometric` hook from BiometricContext
- Checks `biometricEnabled` status
- Shows biometric prompt modal before payment processing
- Calls `verifyBiometric()` to authenticate user
- Blocks payment if verification fails

**User Experience**:
- Modal shows payment amount and merchant details
- Clear "Verify Fingerprint" button
- Option to cancel the payment
- Visual feedback during verification

### Setup Instructions

1. **Enable Biometric for User**:
   - Login to user account
   - Navigate to Security page
   - Enroll fingerprint using "Add Fingerprint" button
   - Biometric will now be required for all payments

2. **Testing Biometric Payment**:
   - Open demo merchant (e.g., legitimate-store.html)
   - Click "Buy Now"
   - Login if needed
   - On payment page, click "Confirm Payment"
   - Biometric modal will appear
   - Click "Verify Fingerprint" to simulate verification
   - Payment will process after successful verification

## 2. Pending Payment Tracking

### How It Works

**Payment Lifecycle**:
1. **Initiated**: User lands on payment page → `pending` payment created
2. **Pending**: Payment waiting for user action (15-minute expiry)
3. **Completed**: User successfully completes payment
4. **Expired**: User didn't complete within 15 minutes
5. **Cancelled**: User explicitly cancelled

### Implementation Details

**Backend**:

**Model** (`PendingPayment.js`):
```javascript
{
  sessionId: String (unique),
  userId: ObjectId (ref: User),
  merchantUrl: String,
  merchantName: String,
  amount: Number,
  orderId: String,
  status: 'pending' | 'completed' | 'expired' | 'cancelled',
  expiresAt: Date (15 minutes from creation),
  completedAt: Date
}
```

**Endpoints**:
- `POST /api/gateway/pending` - Create pending payment record
- `GET /api/gateway/pending-payments` - Get all pending payments (Admin)
- `PUT /api/gateway/pending/:id/cancel` - Cancel pending payment

**Frontend**:
- `AdminPendingPayments.js` - Admin dashboard for monitoring

### Admin Dashboard

**Features**:
- Real-time view of all payment sessions
- Filter by status (all, pending, completed, expired, cancelled)
- Statistics overview:
  - Total payments
  - Pending count
  - Completed count
  - Expired count
  - Cancelled count
- Time remaining countdown for pending payments
- Payment details (user, merchant, amount, dates)

**Access**:
1. Login as admin
2. Navigate to "Pending Payments" in admin navbar
3. View all payment sessions and their status

### Use Cases

**For Merchants**:
- Track conversion rates (completed vs initiated)
- Identify payment abandonment patterns
- Debug payment flow issues

**For Admins**:
- Monitor system health
- Identify stuck payments
- Analyze user behavior during checkout

**For Users**:
- Payment sessions auto-expire after 15 minutes
- Can safely close browser and return within expiry time
- Payment data preserved through login flow

## 3. Payment Flow with New Features

```
External Merchant Click "Buy Now"
    ↓
Backend: Create payment session
    ↓
Redirect to /payment/:sessionId
    ↓
[If not logged in]
    ↓
Save payment data to sessionStorage
    ↓
Redirect to /login
    ↓
Login success → restore payment data
    ↓
[Back to payment page]
    ↓
Backend: Create pending payment record (status: pending, expires in 15 min)
    ↓
Show payment details with fraud check
    ↓
User clicks "Confirm Payment"
    ↓
[If biometric enabled]
    ↓
Show biometric verification modal
    ↓
User verifies fingerprint
    ↓
[If verified]
    ↓
Backend: Process payment
    ↓
Backend: Update pending payment (status: completed)
    ↓
Deduct balance, create transaction
    ↓
Redirect back to merchant with success
```

## 4. Configuration

### Expiry Time
Default: 15 minutes

To change expiry time, modify in `PendingPayment.js`:
```javascript
expiresAt: {
  default: () => new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
}
```

### Auto-cleanup
The model uses MongoDB TTL index to automatically delete expired documents:
```javascript
pendingPaymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### Manual Expiry Update
Call the static method to mark old payments as expired:
```javascript
await PendingPayment.expireOldPayments();
```

## 5. Security Features

**Biometric**:
- Only users with enrolled fingerprints have biometric enabled
- Verification required for every payment
- No bypass mechanism

**Pending Payments**:
- User can only cancel their own payments
- Admin can view all payments
- Expired payments cannot be completed
- Payment data encrypted in transit

## 6. Testing Scenarios

### Test 1: Biometric Payment Flow
1. Enable biometric in Security page
2. Visit demo merchant, initiate payment
3. Verify biometric prompt appears
4. Complete verification and payment

### Test 2: Payment Expiry
1. Initiate payment from demo merchant
2. View in admin pending payments (status: pending)
3. Wait 15 minutes
4. Refresh admin page (status should be: expired)

### Test 3: Payment Completion
1. Initiate payment
2. View in admin (status: pending)
3. Complete payment
4. View in admin (status: completed, completedAt timestamp)

### Test 4: Login Redirect with Pending Payment
1. Logout
2. Click "Buy Now" on demo merchant
3. Pending payment created, redirected to login
4. Login successfully
5. Redirected back to payment page with data restored
6. Pending payment record preserved

## 7. Database Queries

**Get all pending payments for a user**:
```javascript
const pending = await PendingPayment.find({ 
  userId: userId, 
  status: 'pending' 
});
```

**Get expired payments to clean up**:
```javascript
const expired = await PendingPayment.find({
  status: 'pending',
  expiresAt: { $lt: new Date() }
});
```

**Get completion rate**:
```javascript
const total = await PendingPayment.countDocuments();
const completed = await PendingPayment.countDocuments({ status: 'completed' });
const rate = (completed / total * 100).toFixed(2);
```

## 8. Future Enhancements

**Potential Additions**:
- Email notifications for expired payments
- Payment reminder before expiry
- Extended expiry for specific merchants
- Payment retry mechanism
- Analytics dashboard for payment patterns
- Webhook notifications to merchants about payment status
- Payment session recovery after browser crash
