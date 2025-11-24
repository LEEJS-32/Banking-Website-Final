# Fraud Detection Display Guide

## ✅ What You'll See Now

### 🟢 **Low Risk Transaction (APPROVED)**
**When:** Amount is normal for the category  
**Example:** £50 with description "lunch"

**Display:**
```
✅ Transfer successful! (low risk detected)

Risk Level: LOW
Fraud Probability: 5.2%

Reasons:
• Normal transaction pattern detected
```

**Color:** Green background
**Action:** Transaction completes normally

---

### 🟡 **Medium Risk Transaction (FLAGGED)**
**When:** Amount is high but not extreme  
**Example:** £2,500 with description "buying laptop"

**Display:**
```
⚠️ Medium Risk Transaction - Under review

Risk Level: MEDIUM
Fraud Probability: 55.3%

Reasons:
• High transaction amount (£2,500)
• Amount is significantly above category average
```

**Color:** Yellow/Orange background
**Action:** Transaction completes but flagged for admin review

---

### 🔴 **High Risk Transaction (BLOCKED)**
**When:** Amount is extremely high for the category  
**Example:** £7,000 with description "buying electronics"

**Display:**
```
❌ Transaction blocked due to high fraud risk

Risk Level: HIGH
Fraud Probability: 92.8%

Reasons:
• Very high transaction amount (£7,000)
• Amount is 28.0x higher than category average
• High-risk merchant category (Electronics)
```

**Color:** Red background with border
**Action:** Transaction is BLOCKED and NOT completed

---

## 🎯 How to Test

### **1. Start All Services**
Make sure all 3 services are running:

✅ **Fraud Detection API** (port 5001) - Already started  
```powershell
# Check with:
Invoke-RestMethod -Uri "http://localhost:5001/health"
```

✅ **Backend API** (port 5000) - Already started  
```powershell
# Running in terminal
```

✅ **Frontend** (port 3000)  
```powershell
cd frontend
npm start
```

---

### **2. Make Test Transfers**

#### Test 1: Low Risk ✅
- **Amount:** £50
- **Description:** `lunch with friends`
- **Expected:** Green success message with low risk

#### Test 2: Medium Risk ⚠️
- **Amount:** £2,500
- **Description:** `buying laptop`
- **Expected:** Yellow warning message with medium risk

#### Test 3: High Risk 🚫
- **Amount:** £7,000
- **Description:** `buying expensive electronics`
- **Expected:** Red error message, transaction BLOCKED

#### Test 4: Unusual Restaurant Spending 🚫
- **Amount:** £3,000
- **Description:** `restaurant dinner`
- **Expected:** Red error, BLOCKED (60x higher than £50 average)

---

## 📊 What Makes a Transaction High Risk?

### **Amount Thresholds:**
- **> £5,000**: Very high risk
- **> £1,000**: High risk
- **> £500**: Medium risk

### **Category Comparison:**
- **> 10x category average**: Very high risk
- **> 5x category average**: High risk

### **Time of Day:**
- **< 6 AM or > 11 PM**: Unusual transaction time

### **Category Averages:**
| Category | Average | £3,000 Transfer Risk |
|----------|---------|---------------------|
| Restaurant | £50 | 🔴 60x = BLOCKED |
| Gas Station | £40 | 🔴 75x = BLOCKED |
| Electronics | £250 | 🟡 12x = FLAGGED |
| Travel | £800 | 🟡 3.75x = LOW-MEDIUM |
| Shopping | £100 | 🔴 30x = BLOCKED |

---

## 🔍 Where to See Results

### **During Transfer:**
- Fraud results appear **immediately** after clicking "Transfer Money"
- Shows risk level, probability, and reasons
- Stays on screen for 5 seconds before redirecting

### **Transaction History:**
- Go to "Transactions" page
- Look for badges:
  - 🔴 High Risk
  - 🟡 Medium Risk  
  - 🟢 Low Risk
- Click transaction to see full fraud analysis

### **Admin Dashboard:**
- Login as admin: `admin@securebank.com` / `admin123`
- Go to "Transactions" tab
- Filter by fraud risk level
- See all flagged/blocked transactions

---

## ✅ All Systems Running!

**Fraud Detection API:** ✅ Running on port 5001  
**Backend API:** ✅ Running on port 5000  
**Frontend:** Ready to start on port 3000

**Now make a transfer and you'll see the fraud detection results!** 🎉
