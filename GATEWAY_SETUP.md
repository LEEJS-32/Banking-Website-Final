# 🚀 Quick Setup Guide - External Payment Gateway Testing

## What We've Set Up

Your payment gateway can now accept payments from **real external websites**! Here's what's ready:

✅ **Backend configured** for external requests (CORS enabled)
✅ **2 Demo merchant websites** created (safe + fraud)
✅ **Integration documentation** for developers
✅ **Gateway returns proper redirect URLs**

---

## 🎯 Testing Right Now (Localhost)

### Step 1: Start Your Backend
```bash
cd backend
npm start
```
Should show: `Server running on port 5000`

### Step 2: Open Demo Merchant
```bash
cd demo-merchants

# Windows - Open in browser
start legitimate-store.html

# Mac/Linux
open legitimate-store.html
```

### Step 3: Test Payment Flow
1. Click "Proceed to Secure Checkout"
2. You'll be redirected to: `http://localhost:3001/payment/PAY_xxx`
3. Login as a user
4. Confirm payment
5. ✅ Done!

### Step 4: Test Fraud Detection
1. **First, add fraud site to blacklist:**
   - Login as admin at http://localhost:3001/admin/login
   - Go to "Fraud Websites"
   - Click "+ Add Fraud Website"
   - Domain: `scamwebsite.com`
   - Merchant Name: `Super Deals Store`
   - Reason: `Demo fraud website for testing`
   - Risk Level: `High`
   - Click "Add to Blacklist"

2. **Open fraud merchant:**
   ```bash
   start fraud-store.html
   ```

3. Click "BUY NOW - LIMITED TIME!"
4. Redirected to payment page
5. See **BIG RED WARNING**: "⚠️ FRAUDULENT MERCHANT DETECTED"
6. Payment button is disabled
7. ❌ Payment blocked successfully!

---

## 🌐 Testing with Real External URLs (Using ngrok)

Want to test like a REAL external website? Use ngrok!

### Step 1: Install ngrok
- Download from: https://ngrok.com/download
- Extract and add to PATH

### Step 2: Expose Your Backend
```bash
# Make sure backend is running first
cd backend
npm start

# In NEW terminal, run ngrok
ngrok http 5000
```

You'll see something like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:5000
```

### Step 3: Update Demo Merchant
1. Open `demo-merchants/legitimate-store.html` in browser
2. Scroll to "Configuration" section
3. Change Gateway URL from:
   ```
   http://localhost:5000/api/gateway/initiate
   ```
   To:
   ```
   https://abc123.ngrok.io/api/gateway/initiate
   ```

### Step 4: Test!
- Click checkout
- Now it works as if the merchant is on a real external domain!
- You can even share the demo merchant HTML with others

---

## 📂 File Structure

```
Banking-Website-Final/
├── backend/
│   ├── server.js (✅ Updated with CORS)
│   └── controllers/
│       └── paymentGatewayController.js (✅ Enhanced)
├── demo-merchants/
│   ├── legitimate-store.html (✅ Safe merchant demo)
│   ├── fraud-store.html (✅ Fraud merchant demo)
│   └── README.md (✅ Usage guide)
├── INTEGRATION_GUIDE.md (✅ Developer documentation)
└── GATEWAY_SETUP.md (📄 This file)
```

---

## 🧪 Test Scenarios

### ✅ Scenario 1: Successful Payment
**Merchant:** legitimate-store.html  
**Expected:** Payment succeeds, money deducted, transaction recorded

### ❌ Scenario 2: Fraud Website Block
**Merchant:** fraud-store.html (after adding to blacklist)  
**Expected:** Payment blocked, red warning shown, transaction recorded as blocked

### ⏱️ Scenario 3: Rate Limit Block
**Steps:**
1. Make 3 rapid payments from legitimate store
2. Try 4th payment immediately
**Expected:** Rate limit error, transaction blocked

---

## 🔍 Verification Steps

After testing, check these:

### 1. Admin Transactions Page
```
http://localhost:3001/admin/transactions
```
- Should show all payment attempts
- Fraud blocks marked with 🚫 FRAUD SITE badge
- Rate limit blocks marked with ⏱️ RATE LIMITED badge

### 2. Admin Fraud Websites Page
```
http://localhost:3001/admin/fraud-websites
```
- Should show your blacklist
- "Blocked" column should increase after fraud attempts

### 3. User Transactions Page
```
http://localhost:3001/transactions
```
- Only completed payments appear here
- Blocked payments don't show to users

---

## 💡 How Real Merchants Integrate

When a real merchant wants to accept payments through your gateway:

### Option 1: Direct Integration (Current Setup)
```html
<!-- Merchant adds this to their checkout page -->
<form action="https://your-gateway.com/api/gateway/initiate" method="POST">
  <input type="hidden" name="merchantUrl" value="https://merchant-site.com">
  <input type="hidden" name="merchantName" value="Merchant Name">
  <input type="hidden" name="amount" value="99.99">
  <button>Pay with SecureBank</button>
</form>
```

### Option 2: Merchant Registration (Future Enhancement)
1. Merchant registers on your platform
2. Gets API credentials
3. Downloads integration code
4. Adds to their website

---

## 🚀 Going to Production

To deploy this for real use:

### 1. Deploy Backend
- **Heroku:** `git push heroku main`
- **Railway:** Connect GitHub repo
- **AWS/DigitalOcean:** Deploy as Node.js app

### 2. Update URLs
- Replace `localhost:5000` with production URL
- Update all frontend API calls

### 3. Configure Domain
- Set up custom domain (e.g., gateway.securebank.com)
- Add SSL certificate (automatic on most platforms)

### 4. Merchant Onboarding
- Create merchant registration page
- Provide integration docs
- Issue API keys

---

## 📊 What You Can Show Your Lecturer

### 1. Payment Flow
"External merchant → Payment gateway → Fraud check → User confirmation → Process"

### 2. Fraud Detection
"Domain extraction → Database check → Real-time blocking → Audit trail"

### 3. Real-World Simulation
"Demo merchants act like real external websites integrating with gateway"

### 4. Admin Controls
"Manage fraud blacklist, view all transactions, track blocked attempts"

---

## 🎓 Key Features to Highlight

1. ✅ **Gateway acts as intermediary** between merchants and bank
2. ✅ **Real-time fraud detection** before processing payments
3. ✅ **External website integration** via API
4. ✅ **Domain-based blocking** with blacklist database
5. ✅ **Comprehensive audit trail** of all transactions
6. ✅ **Admin management interface** for blacklist
7. ✅ **Rate limiting protection** against abuse
8. ✅ **User warnings** for fraudulent merchants

---

## 🆘 Troubleshooting

**Q: Demo merchant shows "Error connecting to payment gateway"**
- A: Make sure backend is running on port 5000

**Q: Payment not blocked for fraud-store.html**
- A: Add `scamwebsite.com` to fraud blacklist first

**Q: CORS error in console**
- A: Restart backend server (CORS is now configured)

**Q: Frontend not loading**
- A: Check if running on port 3001 (or 3000)

**Q: ngrok URL not working**
- A: Update gateway URL in demo merchant HTML configuration section

---

## 📚 Documentation Files

- `INTEGRATION_GUIDE.md` - Complete developer documentation
- `demo-merchants/README.md` - Demo merchant usage guide
- `PAYMENT_GATEWAY_GUIDE.md` - Original payment gateway documentation

---

**🎉 You're all set! Your payment gateway can now accept payments from external websites!**

Test the demo merchants and show your lecturer how the system detects and blocks fraud websites in real-time! 🛡️
