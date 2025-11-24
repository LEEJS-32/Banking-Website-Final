# 14-Feature Fraud Detection Integration Complete

## ✅ System Overview

Your banking website now uses **ML-powered fraud detection** with the exact **14 features** your model was trained on.

## 🎯 The 14 Features

### A. Direct Inputs (From Form/Transaction)
1. **Amount** - Transaction amount (£)
2. **Time** - Hour of day (0-23)

### B. User Profile (From Database)
3. **Gender_M** - Male (1) or Female (0)
4. **Age_Group** - Age bracket: 0 (0-18), 1 (18-30), 2 (30-50), 3 (50+)

### C. Risk Scores (From Training Data Risk Maps)
5. **Type of Card_Risk** - Fraud risk for card type (Visa/MasterCard)
6. **Entry Mode_Risk** - Fraud risk for entry mode (CVC for website)
7. **Merchant Group_Risk** - Fraud risk for merchant category
8. **Country of Transaction_Risk** - Fraud risk for transaction country
9. **Shipping Address_Risk** - Fraud risk for shipping location
10. **Country of Residence_Risk** - Fraud risk for user's home country
11. **Bank_Risk** - Fraud risk for user's bank
12. **Type of Transaction_Risk** - Fraud risk for transaction type (Online)

### D. Calculated Features
13. **Category_Avg_Amount** - Average spending for merchant category
14. **Amount_vs_Category_Avg** - Ratio of amount to category average

---

## 📋 What Was Updated

### 1. **Backend - User Model** (`backend/models/User.js`)
**Added Fields:**
```javascript
gender: String ('M' or 'F')
dateOfBirth: Date
bank: String (HSBC, Lloyds, Barclays, etc.)
country: String (United Kingdom, USA, etc.)
shippingAddress: String
```

### 2. **Backend - Fraud Detection Service** (`backend/services/fraudDetection.js`)
**New Features:**
- Calculates age from date of birth
- Determines age group (0-3)
- Infers merchant group from transaction description
- Sends correct feature format to Python API

**Merchant Group Inference:**
- "lunch" → Restaurant
- "electronics", "ipad" → Electronics
- "hotel", "travel" → Travel
- "gas", "fuel" → Gas Station
- etc.

### 3. **Backend - Transaction Controller** (`backend/controllers/transactionController.js`)
**Updated Transfer Function:**
```javascript
const fraudResult = await checkFraud({
  amount,
  description,
  senderProfile: {
    gender, dateOfBirth, bank, country, shippingAddress
  }
});
```

**Fraud Decision Logic:**
- **High Risk** (`fraud_probability >= 0.7`) → **BLOCK TRANSACTION**
- **Medium Risk** (`0.4 - 0.7`) → **FLAG & ALLOW** (status: pending)
- **Low Risk** (`< 0.4`) → **APPROVE**

### 4. **Python - Fraud API** (`transaction_9_Gemini/fraud_api.py`)
**Completely Rewritten:**
- Loads `fraud_detection_system.joblib` (includes model + risk_maps + avg_spending_map)
- Calculates all 14 features in correct order
- Maps categorical values to risk scores using training data
- Returns fraud probability, risk level, and human-readable reasons

**Endpoints:**
- `GET /health` - Check API status
- `POST /predict` - Detect fraud

**Input Format:**
```json
{
  "Amount": 5000.0,
  "Time": 19,
  "Gender": "M",
  "Age": 25,
  "Merchant_Group": "Electronics",
  "Country_of_Transaction": "United Kingdom",
  "Shipping_Address": "United Kingdom",
  "Country_of_Residence": "United Kingdom",
  "Bank": "HSBC",
  "Type_of_Card": "Visa",
  "Entry_Mode": "CVC",
  "Type_of_Transaction": "Online"
}
```

**Output Format:**
```json
{
  "is_fraud": false,
  "fraud_probability": 0.15,
  "risk_level": "low",
  "confidence": 0.85,
  "reasons": ["Normal transaction pattern detected"],
  "merchant_group": "Electronics",
  "category_avg": 250.0,
  "model": "XGBoost"
}
```

### 5. **Frontend - Registration Form** (`frontend/src/pages/Register.js`)
**New Fields Added:**
- Gender (dropdown: Male/Female)
- Date of Birth (date picker)
- Bank (dropdown: HSBC, Lloyds, Barclays, RBS, NatWest, Santander)
- Country (dropdown: UK, USA, India, Canada, Australia)

---

## 🚀 How to Test

### 1. **Start All Services**
```powershell
.\start.ps1
```

### 2. **Create a New User**
1. Go to `http://localhost:3000/register`
2. Fill in all fields including:
   - Gender: Male or Female
   - Date of Birth: Your DOB
   - Bank: Select from dropdown
   - Country: Select from dropdown
3. Register and login

### 3. **Test Fraud Detection**

#### **Test Case 1: Normal Transaction (Low Risk)**
```
Recipient: Another account number
Amount: £50
Description: lunch with friends
```
✅ Expected: **Low risk** - Transaction approved

#### **Test Case 2: Large Electronics Purchase (Medium Risk)**
```
Amount: £3,000
Description: buying new laptop
```
⚠️ Expected: **Medium risk** - Transaction flagged but allowed

#### **Test Case 3: Very Large Late-Night Purchase (High Risk)**
```
Amount: £8,000
Description: buying expensive electronics
Time: After 11 PM
```
🚫 Expected: **High risk** - Transaction BLOCKED

#### **Test Case 4: Unusual Category Spending**
```
Amount: £5,000
Description: restaurant dinner
```
⚠️ Expected: **High risk** - Amount is 25x+ higher than restaurant category average

---

## 🎨 Frontend Display

When fraud is detected, users will see:

**High Risk (Blocked):**
```
❌ Transaction Blocked
🚨 High Risk Detected (85% fraud probability)

Reasons:
• Very high transaction amount (£8,000)
• Amount is 32x higher than category average
• Unusual transaction time (23:00)
```

**Medium Risk (Flagged):**
```
⚠️ Transaction Flagged for Review
🔍 Medium Risk Detected (55% fraud probability)

Reasons:
• High transaction amount (£3,000)
• Amount is significantly above category average

Status: Pending admin review
```

---

## 🔧 Technical Details

### **Feature Engineering Pipeline**

1. **Backend receives transfer request** with amount and description
2. **Fetch user profile** (gender, DOB, bank, country)
3. **Calculate age** from date of birth
4. **Determine age group** (0-3)
5. **Infer merchant group** from description keywords
6. **Get current hour** (0-23)
7. **Send to Python API** with 12 fields
8. **Python API:**
   - Looks up **category average** from `avg_spending_map`
   - Calculates **amount-to-average ratio**
   - Maps all categorical values to **risk scores** using `risk_maps`
   - Creates **14-feature vector** in exact training order
   - Runs through **trained model** (XGBoost/LightGBM/RandomForest)
   - Returns **fraud prediction** with reasons
9. **Backend decides**: Block, Flag, or Approve
10. **Frontend displays** result to user

### **Risk Maps**
The Python API uses **risk maps** created during training:
```python
risk_maps = {
  'Bank': {'HSBC': 0.02, 'Lloyds': 0.03, ...},
  'Country of Transaction': {'United Kingdom': 0.01, 'Russia': 0.25, ...},
  'Merchant Group': {'Electronics': 0.15, 'Restaurant': 0.02, ...},
  ...
}
```

These maps store the **historical fraud rate** for each category value.

### **Average Spending Map**
```python
avg_spending_map = {
  'Restaurant': £50,
  'Electronics': £250,
  'Travel': £800,
  'Gas Station': £40,
  ...
}
```

Used to detect **unusually large transactions** for a category.

---

## ✅ What's Working

- ✅ User registration collects all required fraud detection fields
- ✅ Backend calculates age and infers merchant category
- ✅ Python API loads risk maps and spending averages from trained model
- ✅ All 14 features generated in correct order
- ✅ Model predicts fraud probability
- ✅ High-risk transactions are blocked
- ✅ Medium-risk transactions are flagged
- ✅ Frontend displays fraud warnings with reasons
- ✅ Admin can view fraud flags in transaction monitoring

---

## 📝 Notes

- **Default values** for existing users without fraud fields:
  - Gender: 'M'
  - Age: 30 years
  - Bank: 'HSBC'
  - Country: 'United Kingdom'

- **Merchant group inference** is keyword-based. You can expand it in `fraudDetection.js`

- **Transaction country** defaults to "United Kingdom" (all website transactions)

- **Entry mode** is always "CVC" (card verification code for online)

- **Type of transaction** is always "Online" (website-based)

---

## 🎉 Ready to Use!

Your fraud detection system now uses the exact **14 features** your model was trained on. Test it with different transaction amounts and descriptions to see it in action!
