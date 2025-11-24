# Simple Manual Startup Guide

## 🚀 Start All Services (3 Terminals)

### Terminal 1: Fraud Detection API
```powershell
cd "c:\Users\LEE JS\Desktop\Banking-Website-Final\transaction_9_Gemini"
py -3.10 fraud_api.py
```
Wait for: `✅ Loaded XGBoost model` and `Running on http://127.0.0.1:5001`

---

### Terminal 2: Backend API
```powershell
cd "c:\Users\LEE JS\Desktop\Banking-Website-Final\backend"
npm start
```
Wait for: `Server running on port 5000` and `MongoDB Connected`

---

### Terminal 3: Frontend
```powershell
cd "c:\Users\LEE JS\Desktop\Banking-Website-Final\frontend"
npm start
```
Wait for: `Compiled successfully!` and browser opens to http://localhost:3000

---

## ✅ Verify All Services Running

```powershell
# Check all ports
netstat -ano | findstr ":5001 :5000 :3000"
```

You should see:
- Port 5001 - Fraud API
- Port 5000 - Backend
- Port 3000 - Frontend

---

## 🌐 Access URLs

- **Frontend**: http://localhost:3000
- **Admin Portal**: http://localhost:3000/admin/login
- **Backend API**: http://localhost:5000
- **Fraud API Health**: http://localhost:5001/health

---

## 🛑 Stop All Services

```powershell
# Press Ctrl+C in each terminal, or:
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
Stop-Process -Name python -Force -ErrorAction SilentlyContinue
```

---

## 📝 Quick Test

After starting, test with:
```powershell
# Test Fraud API
Invoke-RestMethod -Uri "http://localhost:5001/health"

# Test Backend
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body (@{email="admin@securebank.com"; password="admin123"} | ConvertTo-Json) -ContentType "application/json"
```

---

## ⚠️ Troubleshooting

### Port Already in Use?
```powershell
# Find process using port
netstat -ano | findstr :5001

# Kill process (replace PID)
Stop-Process -Id <PID> -Force
```

### Python Version?
```powershell
py -3.10 --version
# Should show: Python 3.10.11
```

### Module Not Found?
```powershell
cd transaction_9_Gemini
py -3.10 -m pip install flask flask-cors joblib pandas numpy scikit-learn xgboost==1.7.6 lightgbm shap
```
