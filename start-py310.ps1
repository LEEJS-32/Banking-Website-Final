# Complete Startup Script with Python 3.10

Write-Host "🏦 Starting SecureBank Application..." -ForegroundColor Cyan
Write-Host ""

# Check Python 3.10
try {
    $pythonVersion = py -3.10 --version 2>&1
    Write-Host "✅ Python 3.10 detected: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python 3.10 not found. Please install Python 3.10.11" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
Write-Host ""

# Start Fraud Detection API with Python 3.10
Write-Host "[1/3] Starting Fraud Detection API (Python 3.10) on port 5001..." -ForegroundColor Cyan
Start-Process -FilePath "py" -ArgumentList "-3.10", "fraud_api.py" -WorkingDirectory "$PSScriptRoot\transaction" -WindowStyle Normal

Start-Sleep -Seconds 5

# Start Backend API
Write-Host "[2/3] Starting Backend API on port 5000..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Normal

Start-Sleep -Seconds 5

# Start Frontend
Write-Host "[3/3] Starting Frontend on port 3000..." -ForegroundColor Cyan
Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory "$PSScriptRoot\frontend" -WindowStyle Normal

Write-Host ""
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Application URLs:" -ForegroundColor Yellow
Write-Host "   Frontend:         http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API:      http://localhost:5000" -ForegroundColor White
Write-Host "   Fraud Detection:  http://localhost:5001" -ForegroundColor White
Write-Host "   Admin Portal:     http://localhost:3000/admin/login" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Admin Credentials:" -ForegroundColor Yellow
Write-Host "   Email:    admin@securebank.com" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Python Version: Using Python 3.10.11" -ForegroundColor Cyan
Write-Host "XGBoost Version: 1.7.6" -ForegroundColor Cyan
Write-Host ""
Write-Host "All services are running in separate windows." -ForegroundColor Gray
Write-Host "Close this window or press Ctrl+C to exit." -ForegroundColor Gray
Write-Host ""

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 60
    }
} finally {
    Write-Host "Shutting down..." -ForegroundColor Yellow
}
