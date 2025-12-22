@echo off
echo ================================================
echo   Banking System - Full Startup
echo ================================================
echo.

echo [1/4] Starting Fraud Detection API...
cd transaction
start "Fraud Detection API" cmd /k "python fraud_api.py"
timeout /t 3 /nobreak >nul

echo [2/4] Starting Fingerprint Scanner API...
cd ..\fingerprint
start "Fingerprint API" cmd /k "python fingerprint_api.py"
timeout /t 3 /nobreak >nul

echo [3/4] Starting Backend Server...
cd ..\backend
start "Backend Server" cmd /k "npm start"
timeout /t 3 /nobreak >nul

echo [4/4] Starting Frontend...
cd ..\frontend
start "Frontend" cmd /k "npm start"

echo.
echo ================================================
echo   All services starting...
echo ================================================
echo   Fraud Detection: http://localhost:5001
echo   Fingerprint API: http://localhost:5002
echo   Backend Server:  http://localhost:5000
echo   Frontend:        http://localhost:3000
echo ================================================
echo.
echo Press any key to close this window...
pause >nul
