# Fraud Detection API

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Make sure `fraud_detection_system.joblib` is in this directory

3. Start the API:
```bash
python fraud_api.py
```

The API will run on `http://localhost:5001`

## Endpoints

### Health Check
```
GET /health
```

### Detect Fraud
```
POST /detect-fraud
Content-Type: application/json

{
  "amount": 5000.0,
  "time": 15,
  "merchant_group": "Electronics",
  "country_of_transaction": "United Kingdom",
  "country_of_residence": "United Kingdom",
  "bank": "Lloyds",
  "type_of_transaction": "POS",
  "entry_mode": "Chip and PIN",
  "type_of_card": "Debit",
  "age": 35,
  "gender": "M",
  "shipping_address": "United Kingdom"
}
```

Response:
```json
{
  "is_fraud": true,
  "fraud_probability": 0.85,
  "risk_level": "high",
  "threshold": 0.5,
  "reasons": [
    "Transaction amount is 25.0x higher than category average",
    "Unusual transaction time (late night/early morning)"
  ],
  "recommendation": "BLOCK"
}
```
