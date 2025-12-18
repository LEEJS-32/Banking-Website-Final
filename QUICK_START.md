# ⚡ QUICK START - See Biometric & Pending Payments NOW!

## 🎯 To See Biometric Verification Modal:

### STEP 1: Enable Biometric (REQUIRED!)
```
1. Open: http://localhost:3000
2. Login with your account
3. Click "Security" in navbar
4. Click green "Add Fingerprint" button
5. Enter name (e.g., "Right Thumb")
6. Click "Enroll Fingerprint"
7. ✅ See: "Biometric authentication is ENABLED"
```

### STEP 2: Make a Payment
```
1. Open file: demo-merchants/legitimate-store.html
2. Click "Buy Now"
3. Click "Confirm Payment"
4. ✨ MODAL APPEARS! (blue fingerprint icon)
5. Click "Verify Fingerprint"
6. ✅ Payment completes
```

---

## 📊 To See Pending Payments Dashboard:

### Open Admin Dashboard
```
1. Open: http://localhost:3000/admin/login
2. Login: admin@securebank.com / Admin123
3. Click "Pending Payments" in navbar
4. ✨ SEE: Statistics + Payment sessions table
```

### Create a Pending Payment
```
1. Open demo-merchants/legitimate-store.html
2. Click "Buy Now"
3. DON'T complete payment yet
4. Go to admin dashboard → Refresh
5. ✨ SEE: New "Pending" payment with countdown timer
6. Go back and complete payment
7. Refresh admin → Status changes to "Completed"
```

---

## ✅ Servers Running:
- Backend: http://localhost:5000 ✅
- Frontend: http://localhost:3000 ✅

## 📖 Full Instructions:
See **HOW_TO_TEST.md** for detailed step-by-step guide with screenshots and troubleshooting.

---

## 🚨 Common Issue:

**"I don't see biometric modal!"**
→ You forgot to enable biometric in Security page!
→ Go to Security → Add Fingerprint → Try payment again

**"Pending payments page is empty"**
→ Initiate a payment first (Buy Now button)
→ Then check admin dashboard

---

## 💡 Remember:
- Biometric ONLY shows if you enrolled fingerprint first!
- Pending payment creates automatically when you land on payment page
- Admin dashboard shows ALL payment sessions (pending, completed, expired)
