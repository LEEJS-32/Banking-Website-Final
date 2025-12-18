# 🚀 Step-by-Step: How to See Biometric & Pending Payment Features

## ⚠️ IMPORTANT: You MUST Enable Biometric First!

The biometric verification modal **ONLY** appears if you have enrolled a fingerprint in the Security page. Follow these exact steps:

---

## 📋 STEP 1: Enable Biometric Authentication (ONE-TIME SETUP)

### 1.1 Open Your Banking App
```
URL: http://localhost:3000
```

### 1.2 Login
- Enter your email and password
- Click "Login"

### 1.3 Go to Security Page
- Click **"Security"** in the navbar at the top
- Scroll down to **"Biometric Authentication"** section

### 1.4 Add Fingerprint
1. You'll see: **"No fingerprints enrolled"**
2. Click the **green "Add Fingerprint"** button
3. A popup appears
4. Enter any name (example: "Right Thumb")
5. Click **"Enroll Fingerprint"**
6. ✅ Success message: **"Fingerprint enrolled successfully"**

### 1.5 Verify Biometric is Enabled
- You should now see:
  - ✅ **"Biometric authentication is ENABLED"** (green)
  - Your fingerprint listed in the table
  - If you see this, biometric is active!

---

## 💳 STEP 2: Test Biometric Verification on Payment

### 2.1 Open Demo Merchant Website
1. Open file explorer
2. Navigate to: `C:\Users\LEE JS\Desktop\Banking-Website-Final\demo-merchants`
3. **Right-click** on **`legitimate-store.html`**
4. Select **"Open with" → Your browser (Chrome/Edge/Firefox)**

### 2.2 Initiate Payment
1. The demo store page opens
2. Scroll down to **"Demo Checkout Form"**
3. You'll see pre-filled values (you can change them or keep defaults):
   - Amount: 100.00
   - Order ID: ORDER-12345
   - Description: Test Product
4. Click the big **"Buy Now"** button

### 2.3 Payment Page Opens
- You'll be redirected to: `http://localhost:3000/payment/[some-id]`
- You'll see:
  - Payment details (merchant, amount, etc.)
  - Your balance
  - **🔐 "Biometric verification required"** text at the bottom
  - A blue **"Confirm Payment"** button

### 2.4 Click Confirm Payment
1. Click the **"Confirm Payment"** button
2. **✨ BIOMETRIC MODAL APPEARS!** 
   - This is a popup overlay
   - Shows:
     - 🔵 Blue fingerprint icon
     - "Biometric Verification Required"
     - The payment amount (e.g., RM100.00)
     - Two buttons: "Cancel" and "Verify Fingerprint"

### 2.5 Verify Fingerprint
1. Click **"Verify Fingerprint"** button
2. The button changes to **"Verifying..."**
3. After 1-2 seconds:
   - ✅ **"Payment successful!"** message appears
   - You're redirected back to the demo store
   - Store shows: **"Payment Status: Success"**

### ✅ WHAT YOU SHOULD SEE:
- **Before biometric enabled**: No modal, payment processes directly
- **After biometric enabled**: Modal blocks payment until fingerprint verified

---

## 📊 STEP 3: View Pending Payments (Admin Dashboard)

### 3.1 Open Admin Login
```
URL: http://localhost:3000/admin/login
```

### 3.2 Login as Admin
```
Email: admin@securebank.com
Password: Admin123
```
(Or whatever admin credentials you set up)

### 3.3 Navigate to Pending Payments
- Look at the navbar at the top
- Click **"Pending Payments"** (has a clock icon ⏰)

### 3.4 View Dashboard
You'll see the **Admin Pending Payments Dashboard** with:

**📈 Statistics Cards at Top:**
```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│  Total   │ Pending  │Completed │ Expired  │Cancelled │
│    5     │    2     │    3     │    0     │    0     │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

**🔍 Filter Tabs:**
- All | Pending | Completed | Expired | Cancelled

**📋 Payment Sessions Table:**
```
Session ID    | User           | Merchant          | Amount  | Status    | Time Remaining
ORDER-12345   | john@email.com | Legitimate Store  | RM100   | Pending   | 14m 32s
ORDER-12346   | jane@email.com | Test Merchant     | RM250   | Completed | -
```

---

## 🧪 STEP 4: Test Creating Pending Payment

### 4.1 Keep Admin Dashboard Open
- Keep the **"Pending Payments"** page open in one browser tab
- Note the current statistics (e.g., "2 Pending")

### 4.2 Open New Tab and Initiate Payment
1. **New tab** → Open `demo-merchants/legitimate-store.html`
2. Change the Order ID to something new (e.g., "ORDER-99999")
3. Click **"Buy Now"**
4. **DON'T CLICK "CONFIRM PAYMENT" YET!**

### 4.3 Check Admin Dashboard
1. Go back to the admin dashboard tab
2. Click **browser refresh** (F5 or Ctrl+R)
3. **✨ YOU SHOULD SEE:**
   - **"Pending"** count increased by 1
   - New row in the table:
     - Your order ID: ORDER-99999
     - Status: **Pending** (yellow badge)
     - Time Remaining: **14m 59s** (counting down)
     - Your user email
     - Merchant: Legitimate Store
     - Amount: RM100.00 (or whatever you entered)

### 4.4 Complete the Payment
1. Go back to payment page tab
2. Click **"Confirm Payment"**
3. (If biometric enabled) Click **"Verify Fingerprint"**
4. Wait for **"Payment successful!"** message

### 4.5 Check Admin Dashboard Again
1. Go to admin dashboard tab
2. **Refresh** (F5)
3. **✨ YOU SHOULD SEE:**
   - **"Pending"** count decreased by 1
   - **"Completed"** count increased by 1
   - That order ID row now shows:
     - Status: **Completed** (green badge)
     - Time Remaining: **"-"**
     - Completed timestamp

---

## 🎯 WHAT EACH FEATURE DOES

### Biometric Verification:
- **When**: User clicks "Confirm Payment" AND has fingerprint enrolled
- **What**: Modal popup blocks payment
- **Why**: Adds security layer like real banking apps
- **Result**: Payment only proceeds after fingerprint verification

### Pending Payments:
- **When**: User lands on payment page
- **What**: System creates "pending" record in database
- **Tracks**:
  - ⏳ Pending: User on payment page, hasn't clicked confirm
  - ✅ Completed: User successfully paid
  - ⏰ Expired: 15 minutes passed, payment auto-expired
  - ❌ Cancelled: User/admin cancelled
- **Why**: Track conversion rates, identify abandoned payments
- **Admin View**: See all payment sessions in real-time

---

## 🔍 TROUBLESHOOTING

### "I don't see the biometric modal!"
**Cause**: Biometric not enabled
**Fix**: 
1. Go to Security page
2. Verify you see: ✅ "Biometric authentication is ENABLED"
3. If not, click "Add Fingerprint" and enroll one
4. Try payment again

### "Admin pending payments page is empty"
**Cause**: No payments initiated yet
**Fix**:
1. Open demo merchant → Click "Buy Now"
2. Land on payment page (don't complete yet)
3. Refresh admin dashboard
4. Should appear now

### "Time Remaining shows '0m 0s' or expired"
**Cause**: Payment is older than 15 minutes
**Result**: This is normal - payments auto-expire for security
**Action**: Just initiate a new payment

### "I see the payment page but no pending record"
**Check**:
1. Are you logged in? (Check top-right corner)
2. Open browser console (F12) → Check for errors
3. Backend running? (Should show "Server running on port 5000")
4. Refresh the payment page

### "Backend not running"
**Fix**:
```powershell
cd "C:\Users\LEE JS\Desktop\Banking-Website-Final\backend"
npm start
```

### "Frontend not running"
**Fix**:
```powershell
cd "C:\Users\LEE JS\Desktop\Banking-Website-Final\frontend"
npm start
```

---

## 📸 VISUAL CHECKLIST

### ✅ Biometric Working If You See:
1. [ ] "🔐 Biometric verification required" text on payment page footer
2. [ ] Modal popup when clicking "Confirm Payment"
3. [ ] "Verify Fingerprint" button in modal
4. [ ] Payment blocked until verification

### ✅ Pending Payments Working If You See:
1. [ ] "Pending Payments" link in admin navbar
2. [ ] Statistics cards showing numbers
3. [ ] Table with payment sessions
4. [ ] "Pending" badge (yellow) for new payments
5. [ ] Time countdown for pending payments
6. [ ] Status changes to "Completed" after payment

---

## 🎓 FOR YOUR LECTURER DEMO

### Demo Script:

**"Let me show you the biometric security feature:"**
1. "First, I enabled fingerprint in Security settings" [Show Security page]
2. "Now when I make a payment..." [Open demo merchant → Buy Now]
3. "Notice the biometric verification modal appears" [Click Confirm Payment]
4. "Payment is blocked until I verify my fingerprint" [Show modal]
5. "After verification, payment completes" [Click Verify Fingerprint]

**"And here's the pending payment tracking system:"**
1. "As admin, I can see all payment sessions" [Show admin dashboard]
2. "Real-time statistics show pending, completed, and expired payments"
3. "Each payment has a 15-minute expiry for security"
4. "Let me create a pending payment..." [Open merchant, initiate payment]
5. "See - it appears instantly with countdown timer" [Refresh admin page]
6. "When user completes payment..." [Complete payment]
7. "Status changes to completed" [Refresh admin page]

**"This matches real-world systems like Stripe and PayPal"**

---

## 🔗 QUICK LINKS

- User Login: http://localhost:3000/login
- Security Page: http://localhost:3000/security
- Admin Login: http://localhost:3000/admin/login
- Admin Pending Payments: http://localhost:3000/admin/pending-payments
- Demo Merchant: `demo-merchants/legitimate-store.html`

---

## ✨ SUCCESS! You're Ready!

If you followed all steps and see:
- ✅ Biometric modal when paying
- ✅ Pending payment in admin dashboard
- ✅ Status changes from pending → completed

**Your implementation is working perfectly!** 🎉
