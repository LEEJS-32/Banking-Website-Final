# Start Fraud Detection API
Write-Host "Starting Fraud Detection API..." -ForegroundColor Cyan

# Change to fraud API directory
Set-Location -Path "$PSScriptRoot\transaction"

# Check if fraud_detection_system.joblib exists
if (!(Test-Path "fraud_detection_system.joblib")) {
    Write-Host "❌ fraud_detection_system.joblib not found!" -ForegroundColor Red
    Write-Host "Please train the model first by running: python whole.py" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Model file found" -ForegroundColor Green
Write-Host "Starting Flask API on port 5001..." -ForegroundColor Cyan

# Start fraud API
python fraud_api.py
