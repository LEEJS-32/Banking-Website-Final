import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TestMerchant = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    merchantUrl: 'https://testmerchant.com',
    merchantName: 'Test Merchant Store',
    amount: '50.00',
    orderId: `ORD-${Date.now()}`,
    description: 'Test Product Purchase',
  });

  const presetMerchants = [
    { url: 'https://testmerchant.com', name: 'Test Merchant Store', status: 'safe' },
    { url: 'https://scamwebsite.com', name: 'Scam Website', status: 'fraud' },
    { url: 'https://fakeshop.net', name: 'Fake Shop Store', status: 'fraud' },
    { url: 'https://legitimatestore.com', name: 'Legitimate Store', status: 'safe' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Generate session ID (in real scenario, this would be done by backend)
    const sessionId = `SESSION-${Date.now()}`;
    
    // Build payment gateway URL
    const gatewayUrl = `/payment/${sessionId}?` + new URLSearchParams({
      merchantUrl: formData.merchantUrl,
      merchantName: formData.merchantName,
      amount: formData.amount,
      orderId: formData.orderId,
      description: formData.description,
      returnUrl: window.location.href,
    }).toString();

    // Redirect to payment gateway
    navigate(gatewayUrl);
  };

  const selectPreset = (preset) => {
    setFormData({
      ...formData,
      merchantUrl: preset.url,
      merchantName: preset.name,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🛒 Test Merchant Simulator</h1>
          <p className="text-gray-600">Simulate external merchant payment requests to test the payment gateway</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Preset Merchants */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Test Merchants</h2>
            <p className="text-sm text-gray-600 mb-4">Click to use preset merchant data:</p>
            
            <div className="space-y-3">
              {presetMerchants.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => selectPreset(preset)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                    preset.status === 'fraud' 
                      ? 'border-red-300 bg-red-50 hover:border-red-400' 
                      : 'border-green-300 bg-green-50 hover:border-green-400'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900">{preset.name}</div>
                      <div className="text-xs text-gray-600 font-mono mt-1">{preset.url}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      preset.status === 'fraud' 
                        ? 'bg-red-200 text-red-800' 
                        : 'bg-green-200 text-green-800'
                    }`}>
                      {preset.status === 'fraud' ? '⚠️ FRAUD' : '✓ SAFE'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> Try both safe and fraud merchants to see how the gateway detects and blocks fraudulent payments.
              </p>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Request Form</h2>
            <p className="text-sm text-gray-600 mb-4">Fill in merchant details to initiate payment:</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Merchant URL
                </label>
                <input
                  type="text"
                  value={formData.merchantUrl}
                  onChange={(e) => setFormData({ ...formData, merchantUrl: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Merchant Name
                </label>
                <input
                  type="text"
                  value={formData.merchantName}
                  onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                  placeholder="Example Store"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (RM)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="50.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order ID
                </label>
                <input
                  type="text"
                  value={formData.orderId}
                  onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                  placeholder="ORD-12345"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product or service description"
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
              >
                🔐 Proceed to Payment Gateway
              </button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Note:</strong> This simulates how external merchant websites redirect customers to the payment gateway. 
                In production, merchants would call the API endpoint directly.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📖 How the Payment Gateway Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Merchant Redirect</h3>
              <p className="text-sm text-gray-600">
                External merchant website redirects customer to SecureBank payment gateway with payment details
              </p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-orange-600">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Fraud Detection</h3>
              <p className="text-sm text-gray-600">
                Gateway extracts merchant domain and checks against fraud website blacklist database
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-green-600">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Payment Decision</h3>
              <p className="text-sm text-gray-600">
                If safe: Process payment. If fraud detected: Block transaction and warn user
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestMerchant;
