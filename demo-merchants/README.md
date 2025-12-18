# Demo Merchant Websites

This folder contains demo merchant websites to test the SecureBank Payment Gateway integration.

## 🛍️ Available Demo Merchants

### 1. Legitimate Store (`legitimate-store.html`)
- **Domain:** legitimate-store.demo
- **Status:** ✅ Safe Merchant
- **Purpose:** Test successful payment flow
- **What happens:** Payment will be processed successfully

### 2. Fraud Store (`fraud-store.html`)
- **Domain:** scamwebsite.com
- **Status:** ⚠️ Fraud Website (Blacklisted)
- **Purpose:** Test fraud detection and blocking
- **What happens:** Payment will be blocked with fraud warning

## 🚀 How to Use

### Method 1: Local Testing (Simple)

1. **Open the HTML file directly in your browser:**
   ```bash
   # Navigate to this folder
   cd demo-merchants
   
   # Open in browser (Windows)
   start legitimate-store.html
   # or
   start fraud-store.html
   ```

2. **Make sure your backend is running:**
   ```bash
   cd ../backend
   npm start
   ```

3. **The gateway URL is already configured to:** `http://localhost:5000/api/gateway/initiate`

4. **Click the checkout button** and you'll be redirected to your payment gateway!

### Method 2: With ngrok (Test from External URLs)

1. **Install ngrok** from https://ngrok.com/download

2. **Start your backend:**
   ```bash
   cd backend
   npm start
   ```

3. **In a new terminal, start ngrok:**
   ```bash
   ngrok http 5000
   ```

4. **Copy your ngrok URL** (e.g., `https://abc123.ngrok.io`)

5. **Open the demo merchant HTML file** in your browser

6. **Update the Gateway URL** in the configuration section:
   - Change from: `http://localhost:5000/api/gateway/initiate`
   - Change to: `https://abc123.ngrok.io/api/gateway/initiate`

7. **Click checkout** - now it works as if it's a real external website!

### Method 3: Serve with HTTP Server

1. **Install a simple HTTP server:**
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Or using Node.js
   npx http-server -p 8080
   ```

2. **Open in browser:**
   - http://localhost:8080/legitimate-store.html
   - http://localhost:8080/fraud-store.html

## 🧪 Testing Scenarios

### Test Case 1: Successful Payment
1. Open `legitimate-store.html`
2. Click "Proceed to Secure Checkout"
3. You'll be redirected to payment gateway
4. Login as a user
5. See product details
6. Click "Confirm Payment"
7. ✅ Payment succeeds!

### Test Case 2: Fraud Detection Block
1. **First, add the fraud website to blacklist:**
   - Login as admin
   - Go to "Fraud Websites" page
   - Add domain: `scamwebsite.com`
   - Reason: "Demo fraud website"
   - Risk Level: High

2. Open `fraud-store.html`
3. Click "BUY NOW - LIMITED TIME!"
4. Redirected to payment gateway
5. Login as user
6. See **BIG RED WARNING** about fraudulent merchant
7. Payment button is disabled
8. ❌ Payment blocked!

## 📝 Customizing Demo Merchants

You can edit the HTML files to test different scenarios:

### Change Merchant Domain
```javascript
// In the HTML file, find:
<input type="hidden" name="merchantUrl" value="https://your-domain.com">

// Change to any domain you want to test
<input type="hidden" name="merchantUrl" value="https://test-domain.com">
```

### Change Amount
```javascript
<input type="hidden" name="amount" value="299">
// Change to any amount
```

### Change Product Details
```html
<!-- Update the product name and description in the HTML -->
<div class="product-name">Your Product Name</div>
<div class="product-description">Your product description</div>
```

## 🔍 What to Check

After testing, verify in your admin panel:

1. **Transactions Page** (`/admin/transactions`)
   - See all payment attempts
   - Check if fraud detection worked
   - Verify blocked transactions show up

2. **Fraud Websites Page** (`/admin/fraud-websites`)
   - See blocked transaction count increase
   - Verify blacklist is working

3. **User Transactions** (`/transactions`)
   - Check if completed payments appear
   - Verify blocked payments don't show in user's history

## 🎨 Styling

The demo merchants have different color schemes:
- **Legitimate Store:** Purple gradient (professional, trustworthy)
- **Fraud Store:** Red gradient (suspicious, urgent)

This helps you visually identify which merchant you're testing.

## 🌐 Deploying Demo Merchants

Want to host these demos online?

### GitHub Pages (Free)
1. Create a new GitHub repository
2. Upload these HTML files
3. Enable GitHub Pages in repository settings
4. Access via: `https://yourusername.github.io/repo-name/legitimate-store.html`

### Netlify/Vercel (Free)
1. Create account at netlify.com or vercel.com
2. Drop this folder into their web interface
3. Get instant live URL

## ⚠️ Important Notes

1. **These are DEMO files** - Not production-ready
2. **Gateway URL must be updated** when using ngrok or deployed URL
3. **Fraud website must be in blacklist** for fraud detection to work
4. **User must be logged in** to complete payment
5. **Backend must be running** for gateway to work

## 🆘 Troubleshooting

**Problem:** "Error connecting to payment gateway"
- **Solution:** Check if backend is running on port 5000

**Problem:** "Failed to initiate payment"
- **Solution:** Verify gateway URL is correct

**Problem:** Payment not blocked for fraud site
- **Solution:** Make sure `scamwebsite.com` is added to fraud blacklist in admin panel

**Problem:** CORS error in console
- **Solution:** Backend is already configured for CORS, restart backend server

**Problem:** Redirect not working
- **Solution:** Check browser console for errors, verify paymentUrl in response

## 📚 Next Steps

1. ✅ Test both demo merchants
2. ✅ Add more domains to fraud blacklist
3. ✅ Create your own custom demo merchant
4. ✅ Try with ngrok for realistic testing
5. ✅ Check admin panel after each test

---

*Happy Testing! 🚀*
