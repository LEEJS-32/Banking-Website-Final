import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useBiometric } from '../context/BiometricContext';
import Navbar from '../components/Navbar';

const PaymentGateway = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const { biometricEnabled, verifyBiometric } = useBiometric();
  
  const [paymentData, setPaymentData] = useState({
    merchantUrl: searchParams.get('merchantUrl') || '',
    merchantName: searchParams.get('merchantName') || '',
    amount: searchParams.get('amount') || '',
    orderId: searchParams.get('orderId') || '',
    description: searchParams.get('description') || '',
    returnUrl: searchParams.get('returnUrl') || '',
  });
  
  const [domainCheck, setDomainCheck] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  useEffect(() => {
    if (!user) {
      // Store payment data in sessionStorage before redirecting to login
      const paymentInfo = {
        sessionId,
        merchantUrl: paymentData.merchantUrl,
        merchantName: paymentData.merchantName,
        amount: paymentData.amount,
        orderId: paymentData.orderId,
        description: paymentData.description,
        returnUrl: paymentData.returnUrl
      };
      sessionStorage.setItem('pendingPayment', JSON.stringify(paymentInfo));
      
      // Build current URL to return to after login
      const currentUrl = `/payment/${sessionId}?${searchParams.toString()}`;
      navigate('/login', { state: { from: currentUrl, paymentFlow: true } });
    } else {
      // User is logged in, check if we need to restore payment data from storage
      const pendingPayment = sessionStorage.getItem('pendingPayment');
      if (pendingPayment && !paymentData.merchantUrl) {
        const restored = JSON.parse(pendingPayment);
        setPaymentData({
          merchantUrl: restored.merchantUrl || '',
          merchantName: restored.merchantName || '',
          amount: restored.amount || '',
          orderId: restored.orderId || '',
          description: restored.description || '',
          returnUrl: restored.returnUrl || ''
        });
        sessionStorage.removeItem('pendingPayment'); // Clear it after restoring
      }
      checkMerchantDomain();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Separate effect to create pending payment only once when data is ready
  useEffect(() => {
    if (user && paymentData.merchantUrl) createPendingPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, paymentData.merchantUrl, sessionId]);

  const createPendingPayment = async () => {
    if (!user || !paymentData.merchantUrl) return;

    // React 18 StrictMode can mount/unmount and re-run effects twice in development.
    // Use a sessionStorage guard so the same sessionId cannot create pending twice.
    const guardKey = `pg_pending_created:${sessionId}`;
    if (sessionStorage.getItem(guardKey) === '1') return;
    sessionStorage.setItem(guardKey, '1');
    
    try {
      const response = await axios.post(
        'http://localhost:5000/api/gateway/pending',
        {
          sessionId,
          ...paymentData
        },
        {
          headers: { Authorization: `Bearer ${user.token}` }
        }
      );
      
      if (response.data.pendingPaymentId) {
        setPendingPaymentId(response.data.pendingPaymentId);
      }
    } catch (error) {
      console.error('Failed to create pending payment:', error);
      sessionStorage.removeItem(guardKey); // Allow retry on error
    }
  };

  const checkMerchantDomain = async () => {
    if (!paymentData.merchantUrl) return;
    
    try {
      const response = await axios.post('http://localhost:5000/api/gateway/initiate', paymentData);
      setDomainCheck(response.data.domainCheck);
    } catch (error) {
      console.error('Domain check failed:', error);
    }
  };

  const handlePayment = async () => {
    // Check if biometric is required
    if (biometricEnabled) {
      setShowBiometricPrompt(true);
      return;
    }
    
    await processPayment();
  };

  const handleBiometricVerification = async () => {
    setLoading(true);
    setMessage({ type: 'info', text: 'Verifying fingerprint...' });
    
    const verified = await verifyBiometric();
    
    if (verified) {
      setShowBiometricPrompt(false);
      await processPayment();
    } else {
      setLoading(false);
      setMessage({ type: 'error', text: 'Biometric verification failed. Payment cancelled.' });
      setShowBiometricPrompt(false);
    }
  };

  const processPayment = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(
        'http://localhost:5000/api/gateway/process',
        {
          ...paymentData,
          sessionId,
          pendingPaymentId,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      if (response.data.success) {
        updateBalance(response.data.newBalance);
        setPaymentCompleted(true);

        const fraudData = response.data.fraudDetection;
        const riskLevel = fraudData?.riskLevel;
        const recommendation = fraudData?.recommendation;

        let text = 'Payment successful! Redirecting...';
        if (recommendation === 'REVIEW' || riskLevel === 'medium') {
          text = '⚠️ Medium Risk Payment - Under review. Redirecting...';
        } else if (riskLevel) {
          text = `✅ Payment successful! (${riskLevel} risk detected) Redirecting...`;
        }

        setMessage({ type: 'success', text });

        // Short delay so user can see the risk message
        setTimeout(() => {
          if (paymentData.returnUrl) {
            window.location.href = `${paymentData.returnUrl}?status=success&orderId=${paymentData.orderId}&sessionId=${sessionId}`;
          } else {
            window.location.href = '/transactions';
          }
        }, 1500);

        return;
      }
    } catch (error) {
      if (error.response?.data?.alreadyPaid) {
        // Payment session already used
        setMessage({
          type: 'error',
          text: '⚠️ ' + error.response.data.message,
        });
        // Redirect to transactions after 3 seconds
        setTimeout(() => {
          window.location.href = '/transactions';
        }, 3000);
      } else if (error.response?.status === 403 && error.response?.data?.blocked) {
        setPaymentCompleted(true);
        setMessage({
          type: 'error',
          text: `🚫 Transaction Blocked`,
          detail: error.response.data.reason || error.response.data.message,
        });
        // Redirect to transactions page after showing error
        setTimeout(() => {
          window.location.href = '/transactions';
        }, 3000);
      } else if (error.response?.status === 429) {
        setMessage({
          type: 'error',
          text: error.response.data.message,
        });
      } else {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || 'Payment failed',
        });
      }
    }

    setLoading(false);
  };

  const handleCancel = () => {
    if (paymentData.returnUrl) {
      window.location.href = `${paymentData.returnUrl}?status=cancelled&orderId=${paymentData.orderId}`;
    } else {
      navigate('/dashboard');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-center">SecureBank Payment Gateway</h1>
            <p className="text-center text-blue-100 mt-2">Secure Payment Processing</p>
          </div>

          {/* Fraud Warning - Hidden, backend will handle blocking */}

          {/* Messages */}
          {message.text && (
            <div className={`m-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <p className="font-semibold">{message.text}</p>
              {message.detail && <p className="text-sm mt-1">{message.detail}</p>}
            </div>
          )}

          {/* Payment Details */}
          <div className="p-6 space-y-4">
            <div className="border-b pb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Merchant:</span>
                  <span className="font-medium text-gray-900">{paymentData.merchantName}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Website:</span>
                  <span className="font-mono text-sm text-gray-900">{paymentData.merchantUrl}</span>
                </div>
                
                {paymentData.orderId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-mono text-sm text-gray-900">{paymentData.orderId}</span>
                  </div>
                )}
                
                {paymentData.description && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Description:</span>
                    <span className="text-gray-900">{paymentData.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Amount to Pay</p>
              <p className="text-4xl font-bold text-blue-600">RM{parseFloat(paymentData.amount).toFixed(2)}</p>
            </div>

            {/* User Balance */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Your Balance:</span>
                <span className="text-xl font-semibold text-gray-900">RM{user?.balance?.toFixed(2)}</span>
              </div>
              {user?.balance < parseFloat(paymentData.amount) && (
                <p className="text-red-600 text-sm mt-2">⚠️ Insufficient balance</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <button
                onClick={handleCancel}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={loading || user?.balance < parseFloat(paymentData.amount) || paymentCompleted}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  user?.balance < parseFloat(paymentData.amount) || paymentCompleted
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {loading ? 'Processing...' : paymentCompleted ? 'Payment Completed' : 'Confirm Payment'}
              </button>
            </div>

            {/* Security Notice */}
            <div className="text-center text-xs text-gray-500 pt-4 border-t">
              <p>🔒 Secured by SecureBank Payment Gateway</p>
              <p className="mt-1">Your payment information is encrypted and secure</p>
              {biometricEnabled && (
                <p className="mt-1 text-blue-600">🔐 Biometric verification required</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Biometric Verification Modal */}
      {showBiometricPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Biometric Verification Required</h3>
              <p className="text-gray-600 mb-4">
                Please verify your identity using fingerprint to complete this payment
              </p>
              <p className="text-2xl font-bold text-blue-600">RM{parseFloat(paymentData.amount).toFixed(2)}</p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowBiometricPrompt(false);
                  setLoading(false);
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBiometricVerification}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300"
              >
                {loading ? 'Verifying...' : 'Verify Fingerprint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentGateway;
