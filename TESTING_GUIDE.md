# Quick Test Guide - Fraud Detection

## 🚀 Start the Application
```powershell
.\start.ps1
```

This starts:
1. Fraud Detection API (port 5001)
2. Backend API (port 5000)
3. Frontend (port 3000)

---

## 👤 Create Test User

1. Go to: `http://localhost:3000/register`
2. Fill in:
   - Name: John Doe
   - Email: john@test.com
   - Password: test123
   - **Gender**: Male
   - **Date of Birth**: 1995-05-15
   - **Bank**: HSBC
   - **Country**: United Kingdom
   - Account Type: Checking

---

## 🧪 Test Scenarios

### ✅ Scenario 1: Normal Transaction (APPROVED)
**Description:** `lunch with friends`  
**Amount:** `£50`  
**Expected:** ✅ Low Risk - Approved  
**Reasons:** Normal transaction pattern

---

### ⚠️ Scenario 2: Large Purchase (FLAGGED)
**Description:** `buying laptop`  
**Amount:** `£2,500`  
**Expected:** ⚠️ Medium Risk - Flagged but Allowed  
**Reasons:** 
- High transaction amount
- Amount above category average

---

### 🚫 Scenario 3: Very Large Purchase (BLOCKED)
**Description:** `buying expensive electronics`  
**Amount:** `£7,000`  
**Expected:** 🚫 High Risk - BLOCKED  
**Reasons:**
- Very high transaction amount (£7,000)
- Amount is 28x higher than Electronics category average (£250)

---

### 🚫 Scenario 4: Unusual Restaurant Spending (BLOCKED)
**Description:** `restaurant dinner`  
**Amount:** `£3,000`  
**Expected:** 🚫 High Risk - BLOCKED  
**Reasons:**
- Very high transaction amount
- Amount is 60x higher than Restaurant category average (£50)
- Unusual spending for this category

---

### ⚠️ Scenario 5: Late Night Transaction (FLAGGED)
**Description:** `online shopping`  
**Amount:** `£800`  
**Time:** Test after 11 PM  
**Expected:** ⚠️ Medium-High Risk  
**Reasons:**
- Unusual transaction time (23:00)
- Moderately high amount

---

### ✅ Scenario 6: Gas Station (APPROVED)
**Description:** `gas station refuel`  
**Amount:** `£45`  
**Expected:** ✅ Low Risk - Approved  
**Reasons:** Normal transaction pattern

---

### ⚠️ Scenario 7: Travel Booking (FLAGGED/BLOCKED)
**Description:** `hotel booking`  
**Amount:** `£1,200`  
**Expected:** ⚠️ Medium Risk - Flagged  
**Amount:** `£5,000`  
**Expected:** 🚫 High Risk - Blocked  
**Reasons:** Travel category has moderate risk + high amount

---

## 📊 Merchant Category Keywords

The system automatically infers merchant categories from your description:

| Keywords | Category | Avg Amount |
|----------|----------|------------|
| lunch, dinner, restaurant, food | **Restaurant** | £50 |
| laptop, phone, ipad, electronics | **Electronics** | £250 |
| hotel, travel, flight | **Travel** | £800 |
| gas, fuel, petrol | **Gas Station** | £40 |
| shop, store, buy, purchase | **Shopping** | £100 |
| movie, game, entertainment | **Entertainment** | £30 |
| service, repair | **Services** | £150 |
| (anything else) | **Other** | £100 |

---

## 🎯 Risk Thresholds

- **Low Risk:** < 40% fraud probability → ✅ **APPROVED**
- **Medium Risk:** 40% - 70% fraud probability → ⚠️ **FLAGGED** (allowed but pending)
- **High Risk:** > 70% fraud probability → 🚫 **BLOCKED**

---

## 🔍 Where to See Results

### **User Dashboard**
- Transaction History shows fraud flags
- Blocked transactions appear with red badge
- Flagged transactions show yellow warning badge

### **Admin Dashboard**
- Go to: `http://localhost:3000/admin/login`
- Email: `admin@securebank.com`
- Password: `admin123`
- View all flagged/blocked transactions
- See fraud detection reasons for each transaction

---

## 🛠️ Debugging

### Check if Fraud API is Running
```powershell
Invoke-RestMethod -Uri "http://localhost:5001/health"
```

Expected response:
```json
{
  "status": "healthy",
  "model": "XGBoost",
  "threshold": 0.5234,
  "features": 14
}
```

### Test Fraud API Directly
```powershell
$body = @{
    Amount = 5000
    Time = 19
    Gender = "M"
    Age = 25
    Merchant_Group = "Electronics"
    Country_of_Transaction = "United Kingdom"
    Shipping_Address = "United Kingdom"
    Country_of_Residence = "United Kingdom"
    Bank = "HSBC"
    Type_of_Card = "Visa"
    Entry_Mode = "CVC"
    Type_of_Transaction = "Online"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5001/predict" -Method Post -Body $body -ContentType "application/json"
```

---

## 🎉 Tips

1. **Try different descriptions** to trigger different merchant categories
2. **Test at different times** (morning vs late night)
3. **Compare similar amounts** in different categories (£3000 restaurant vs £3000 electronics)
4. **Check admin panel** to see fraud analysis for all transactions
5. **Look at transaction history** to see fraud flags and risk levels

Happy Testing! 🚀
