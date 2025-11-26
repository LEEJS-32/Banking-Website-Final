@echo off
echo ================================================
echo   Banking System - Fingerprint Scanner Startup
echo ================================================
echo.

echo [1/3] Starting Fingerprint Scanner API...
cd fingerprint
start "Fingerprint API" cmd /k "python fingerprint_api.py"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Backend Server...
cd ..\backend
start "Backend Server" cmd /k "npm start"
timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend...
cd ..\frontend
start "Frontend" cmd /k "npm start"

echo.
echo ================================================
echo   All services starting...
echo ================================================
echo   Fingerprint API: http://localhost:5002
echo   Backend Server:  http://localhost:5000
echo   Frontend:        http://localhost:3001
echo ================================================
echo.
echo Press any key to close this window...
pause >nul
