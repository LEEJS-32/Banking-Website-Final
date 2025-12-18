# SecureBank Payment Gateway Integration Guide

## 🚀 Quick Start for Merchants

This guide shows how external websites can integrate with SecureBank Payment Gateway to accept payments.

---

## 📋 Integration Steps

### Step 1: Create Payment Button

Add this HTML form to your checkout page:

```html
<form id="securebank-checkout" method="POST">
  <input type="hidden" name="merchantUrl" value="https://your-website.com">
  <input type="hidden" name="merchantName" value="Your Store Name">
  <input type="hidden" name="amount" value="99.99">
  <input type="hidden" name="orderId" value="ORDER-12345">
  <input type="hidden" name="description" value="Product description">
  <input type="hidden" name="returnUrl" value="https://your-website.com/payment-complete">
  
  <button type="submit">Pay with SecureBank</button>
</form>
```

### Step 2: Add JavaScript Handler

```javascript
<script>
document.getElementById('securebank-checkout').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const formData = new FormData(this);
  const data = {
    merchantUrl: formData.get('merchantUrl'),
    merchantName: formData.get('merchantName'),
    amount: formData.get('amount'),
    orderId: formData.get('orderId'),
    description: formData.get('description'),
    returnUrl: formData.get('returnUrl')
  };
  
  // Call gateway API
  fetch('https://YOUR-GATEWAY-URL/api/gateway/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success && result.paymentUrl) {
      // Redirect to payment page
      window.location.href = result.paymentUrl;
    } else {
      alert('Payment initiation failed: ' + result.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Connection error');
  });
});
</script>
```

---

## 🔧 Configuration

### Gateway Endpoints

**Production:** Replace with your deployed URL
**Development (localhost):** `http://localhost:5000/api/gateway/initiate`
**Development (ngrok):** `https://YOUR-NGROK-ID.ngrok.io/api/gateway/initiate`

### Required Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `merchantUrl` | string | Yes | Your website URL (used for fraud detection) |
| `merchantName` | string | Yes | Your store/business name |
| `amount` | number | Yes | Payment amount (positive number) |
| `orderId` | string | No | Your internal order reference |
| `description` | string | No | Payment description |
| `returnUrl` | string | No | URL to redirect after payment completion |

---

## 🔐 How It Works

### Payment Flow

```
1. Customer clicks "Pay with SecureBank" on your site
   ↓
2. Your site calls /api/gateway/initiate with payment details
   ↓
3. Gateway performs fraud check on your domain
   ↓
4. If safe: Returns payment URL
   If fraud detected: Returns blocked status
   ↓
5. Customer is redirected to SecureBank payment page
   ↓
6. Customer logs in and confirms payment
   ↓
7. Gateway processes payment and checks fraud again
   ↓
8. Customer redirected back to your returnUrl with payment status
```

### Response Format

**Success Response:**
```json
{
  "success": true,
  "sessionId": "PAY_1234567890_abc123",
  "paymentUrl": "https://gateway.securebank.com/payment/PAY_1234567890_abc123",
  "merchantUrl": "https://your-website.com",
  "merchantName": "Your Store Name",
  "amount": "99.99",
  "domain": "your-website.com",
  "domainCheck": {
    "isFraud": false
  }
}
```

**Fraud Detected Response:**
```json
{
  "success": true,
  "sessionId": "PAY_1234567890_abc123",
  "paymentUrl": "https://gateway.securebank.com/payment/PAY_1234567890_abc123",
  "domainCheck": {
    "isFraud": true,
    "reason": "Domain is blacklisted for fraudulent activities",
    "riskLevel": "high"
  }
}
```

---

## 🧪 Testing

### Using Demo Merchants

We provide demo merchant pages for testing:

1. **Legitimate Store** (`demo-merchants/legitimate-store.html`)
   - Domain: `legitimate-store.demo`
   - Status: Safe - Payment will succeed
   
2. **Fraud Store** (`demo-merchants/fraud-store.html`)
   - Domain: `scamwebsite.com`
   - Status: Blacklisted - Payment will be blocked

### Testing Locally

1. Open demo merchant HTML file in browser
2. Update gateway URL in the configuration section
3. Click checkout
4. You'll be redirected to the payment gateway

### Testing with ngrok

1. Install ngrok: https://ngrok.com/download
2. Start your backend: `npm start` (in backend folder)
3. Expose it: `ngrok http 5000`
4. Copy ngrok URL (e.g., `https://abc123.ngrok.io`)
5. Update demo merchant files with ngrok URL
6. Open demo merchant HTML in browser
7. Test payment flow!

---

## 🛡️ Fraud Detection

SecureBank Payment Gateway automatically checks merchant domains against:

- **Internal Blacklist Database** - Manually curated fraud websites
- **Domain Reputation** - Validates merchant authenticity
- **Transaction Patterns** - Detects suspicious payment behavior

### What Happens if Your Domain is Flagged?

If your domain is in the fraud blacklist:
- Payment initiation will still succeed (returns payment URL)
- Customer will see fraud warning on payment page
- Payment button will be disabled
- Transaction will be recorded as "blocked"
- No money will be transferred

### How to Appeal

Contact admin@securebank.com with:
- Your business registration documents
- Website SSL certificate
- Proof of legitimacy

---

## 💻 Code Examples

### PHP Example
```php
<?php
$data = [
    'merchantUrl' => 'https://my-store.com',
    'merchantName' => 'My Store',
    'amount' => '199.99',
    'orderId' => 'PHP-ORDER-' . time(),
    'description' => 'Product purchase',
    'returnUrl' => 'https://my-store.com/payment-complete'
];

$ch = curl_init('https://gateway.securebank.com/api/gateway/initiate');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
if ($result['success'] && isset($result['paymentUrl'])) {
    header('Location: ' . $result['paymentUrl']);
    exit;
}
?>
```

### Python Example
```python
import requests

data = {
    'merchantUrl': 'https://my-store.com',
    'merchantName': 'My Store',
    'amount': '199.99',
    'orderId': 'PY-ORDER-123',
    'description': 'Product purchase',
    'returnUrl': 'https://my-store.com/payment-complete'
}

response = requests.post(
    'https://gateway.securebank.com/api/gateway/initiate',
    json=data
)

result = response.json()
if result['success'] and 'paymentUrl' in result:
    # Redirect user to payment URL
    print(f"Redirect to: {result['paymentUrl']}")
```

---

## 🎯 Best Practices

1. **Always use HTTPS** - Secure connections only
2. **Validate amounts** - Ensure positive numbers only
3. **Generate unique order IDs** - Prevent duplicate transactions
4. **Handle errors gracefully** - Show user-friendly messages
5. **Test in sandbox first** - Use demo merchants before going live
6. **Monitor transactions** - Check admin panel regularly
7. **Keep domains clean** - Maintain good reputation

---

## 📞 Support

**Technical Issues:** support@securebank.com
**Integration Help:** developers@securebank.com
**Fraud Reports:** fraud@securebank.com

**Documentation:** https://docs.securebank.com
**API Reference:** https://docs.securebank.com/api
**Status Page:** https://status.securebank.com

---

## ⚡ Quick Links

- [Demo Merchants](../demo-merchants/)
- [Admin Dashboard](http://localhost:3001/admin/dashboard)
- [Fraud Website Management](http://localhost:3001/admin/fraud-websites)
- [ngrok Setup Guide](https://ngrok.com/docs)

---

*SecureBank Payment Gateway - Secure, Fast, Reliable* 🛡️
