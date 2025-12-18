# Quick Test Guide - Biometric & Pending Payments

## Prerequisites
- ✅ Backend running on http://localhost:5000
- ✅ Frontend running on http://localhost:3001
- Demo merchant files in `demo-merchants/` folder

---

## Test 1: Biometric Authentication on Payment

### Step 1: Enable Biometric (One-time setup)
1. Open browser: http://localhost:3001
2. Login with user credentials
3. Click "Security" in navbar
4. Scroll to "Biometric Authentication" section
5. Click "Add Fingerprint"
6. Enter any fingerprint name (e.g., "Right Thumb")
7. Click "Enroll Fingerprint"
8. ✅ Success: "Fingerprint enrolled successfully"

### Step 2: Test Payment with Biometric
1. Open file in browser: `demo-merchants/legitimate-store.html`
2. Scroll down to "Demo Checkout Form"
3. Fill in any values or use defaults
4. Click "Buy Now" button
5. ✅ Redirected to payment page: http://localhost:3001/payment/[sessionId]
6. Review payment details
7. Click "Confirm Payment" button
8. **✨ NEW: Biometric Modal Appears**
   - Shows payment amount
   - Shows "Verify Fingerprint" button
9. Click "Verify Fingerprint"
10. ✅ Success: Payment completes after verification
11. Redirected back to merchant with success message

### Expected Results:
- ✅ Biometric modal blocks payment until verification
- ✅ Payment only proceeds after fingerprint verification
- ✅ Footer shows "🔐 Biometric verification required"
- ✅ Cancel button dismisses modal without payment

---

## Test 2: Pending Payment Tracking

### Step 1: View Admin Dashboard
1. Open new tab: http://localhost:3001/admin/login
2. Login with admin credentials:
   - Email: admin@securebank.com
   - Password: Admin123
3. Click "Pending Payments" in navbar
4. **✨ NEW: Admin Dashboard Shows:**
   - Statistics cards (Total, Pending, Completed, Expired, Cancelled)
   - Filter tabs
   - Payment sessions table

### Step 2: Create Pending Payment
1. In another tab, logout from user account (if logged in)
2. Open: `demo-merchants/legitimate-store.html`
3. Click "Buy Now"
4. Login when prompted
5. You're now on payment page (DON'T click Confirm yet)
6. Switch to admin tab
7. Refresh "Pending Payments" page
8. **✨ NEW: You should see:**
   - Pending count increased by 1
   - New row in table with status "pending"
   - Time Remaining shows countdown (e.g., "14m 45s")
   - Your user email and name
   - Merchant details

### Step 3: Complete Payment
1. Switch back to payment page tab
2. Click "Confirm Payment"
3. (Verify fingerprint if biometric enabled)
4. Wait for "Payment successful!" message
5. Switch to admin tab
6. Refresh "Pending Payments" page
7. **✨ NEW: The payment row now shows:**
   - Status: "completed" (green badge)
   - Time Remaining: "-"
   - Completed timestamp

### Expected Results:
- ✅ Pending payment created when user lands on payment page
- ✅ Status changes to "completed" after successful payment
- ✅ Countdown timer shows time remaining for pending payments
- ✅ Admin can see all payment sessions with user details

---

## Test 3: Payment Expiry

### Manual Test (Quick):
1. Initiate payment as user (don't complete)
2. View in admin pending payments (status: pending)
3. Open MongoDB Compass or Studio 3T
4. Find the PendingPayment collection
5. Find your payment document
6. Manually set `expiresAt` to past date
7. Manually set `status` to "expired"
8. Refresh admin page
9. ✅ Payment shows as "expired" with red badge

### Automated Test (15 minutes):
1. Initiate payment (don't complete)
2. Wait 15 minutes
3. MongoDB TTL index will automatically mark as expired
4. Refresh admin page
5. ✅ Status changes to "expired"

---

## Test 4: Multiple Payment Sessions

1. Open 3 browser tabs
2. In each tab, initiate payment from demo merchant (different orders)
3. Complete payment in tab 1
4. Leave tab 2 pending
5. Close tab 3 without completing
6. View admin pending payments
7. **✨ Expected:**
   - Tab 1: Status "completed"
   - Tab 2: Status "pending" with countdown
   - Tab 3: Status "pending" with countdown
8. Wait for tab 3 to expire (or manually expire)
9. **✨ Expected:**
   - Tab 3: Status changes to "expired"

---

## Test 5: Filter Functionality

1. In admin pending payments page
2. Click "Pending" tab
   - ✅ Shows only pending payments
3. Click "Completed" tab
   - ✅ Shows only completed payments
4. Click "Expired" tab
   - ✅ Shows only expired payments
5. Click "All" tab
   - ✅ Shows all payment sessions

---

## Test 6: Biometric + Pending Payment Together

1. Enable biometric in Security page
2. Initiate payment from demo merchant
3. View in admin pending payments (status: pending)
4. On payment page, click "Confirm Payment"
5. **✨ Biometric modal appears**
6. Click "Cancel" in biometric modal
7. Refresh admin page
8. ✅ Status still "pending" (payment not completed)
9. Click "Confirm Payment" again
10. Click "Verify Fingerprint"
11. Payment completes
12. Refresh admin page
13. ✅ Status changes to "completed"

---

## Verification Checklist

### Biometric Feature:
- [ ] Modal appears when clicking "Confirm Payment"
- [ ] Modal shows correct payment amount
- [ ] Modal shows merchant name
- [ ] "Verify Fingerprint" button works
- [ ] "Cancel" button dismisses modal
- [ ] Payment only proceeds after verification
- [ ] Footer shows biometric required indicator

### Pending Payment Feature:
- [ ] Pending payment created when landing on payment page
- [ ] Admin dashboard shows statistics
- [ ] Payment appears in admin table
- [ ] Countdown timer shows time remaining
- [ ] Status changes to "completed" after payment
- [ ] Filters work correctly
- [ ] User details (name, email) display correctly
- [ ] Merchant details display correctly
- [ ] Time remaining updates in real-time (on refresh)

### Integration:
- [ ] Login redirect preserves payment data
- [ ] Fraud warning still shows for blacklisted merchants
- [ ] Balance check still works
- [ ] Transaction record created after payment
- [ ] Both features work together seamlessly

---

## Troubleshooting

### Biometric modal doesn't appear:
- Check if biometric is enabled in Security page
- Check browser console for errors
- Verify BiometricContext is providing correct values

### Pending payment not created:
- Check backend logs for errors
- Verify user is logged in (token in localStorage)
- Check MongoDB connection
- Verify PendingPayment model imported in controller

### Admin dashboard shows empty:
- Initiate at least one payment first
- Check if admin is logged in
- Verify admin route protection
- Check browser console for API errors

### Countdown timer not updating:
- This is expected - countdown only updates on page refresh
- To add real-time updates, implement setInterval in component

---

## Demo Script for Lecturer

**"Let me demonstrate our payment gateway security features:"**

1. **Biometric Authentication:**
   - "First, I'll enable biometric authentication in my security settings"
   - [Enable fingerprint]
   - "Now when I make a payment from this demo merchant..."
   - [Initiate payment]
   - "Notice the biometric verification modal appears"
   - "I must verify my fingerprint before payment proceeds"
   - [Click verify]
   - "Payment only completes after successful verification"

2. **Pending Payment Tracking:**
   - "As an admin, I can monitor all payment sessions"
   - [Show admin dashboard]
   - "Here we see real-time statistics: pending, completed, expired"
   - "Each payment has a 15-minute expiry countdown"
   - "When users initiate but don't complete payment, we track it"
   - [Initiate new payment, don't complete]
   - [Refresh admin page]
   - "See - new pending payment with countdown timer"
   - "This helps identify abandoned transactions and conversion rates"

3. **Real-world Scenario:**
   - "This mimics systems like Stripe and PayPal"
   - "Biometric adds extra security for high-value transactions"
   - "Pending payment tracking helps merchants understand user behavior"
   - "Payments auto-expire after 15 minutes for security"

**"All code is documented in BIOMETRIC_PAYMENT.md and IMPLEMENTATION_SUMMARY.md"**

---

## Success Criteria ✅

Your implementation is successful if:
- ✅ Biometric modal appears and blocks payment
- ✅ Payment requires fingerprint verification
- ✅ Admin can see all pending payments in dashboard
- ✅ Statistics update correctly
- ✅ Status changes from pending → completed
- ✅ Countdown timer shows time remaining
- ✅ All filters work properly
- ✅ No console errors or warnings (except ESLint warnings)

---

**Ready to demonstrate! 🚀**
