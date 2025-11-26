import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useBiometric } from '../context/BiometricContext';

const Transfer = () => {
  const { user, updateBalance } = useAuth();
  const { biometricEnabled, verifyBiometric } = useBiometric();
  const [formData, setFormData] = useState({
    recipientAccountNumber: '',
    amount: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [showVerificationChoice, setShowVerificationChoice] = useState(false);
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false);
  const navigate = useNavigate();

  // Check fingerprint enrollment status on mount
  React.useEffect(() => {
    const checkFingerprint = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/fingerprint/status', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setFingerprintEnrolled(response.data.enrolled);
      } catch (error) {
        console.error('Failed to check fingerprint status');
      }
    };
    checkFingerprint();
  }, [user.token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const verifyFingerprint = async () => {
    try {
      const response = await axios.post(
        'http://localhost:5000/api/fingerprint/verify',
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      return {
        success: response.data.verified,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Fingerprint verification failed',
      };
    }
  };

  const handleVerificationChoice = async (method) => {
    setShowVerificationChoice(false);
    let verificationSuccess = false;

    if (method === 'browser') {
      setShowBiometricPrompt(true);
      setMessage({ type: 'info', text: 'Please verify your identity using browser biometric authentication.' });
      const biometricResult = await verifyBiometric(user.token);
      verificationSuccess = biometricResult.success;
      setShowBiometricPrompt(false);

      if (!verificationSuccess) {
        setMessage({
          type: 'error',
          text: biometricResult.message || 'Biometric verification failed. Please try again.',
        });
        return;
      }
    } else if (method === 'fingerprint') {
      setMessage({ type: 'info', text: 'Please place your finger on the scanner...' });
      const fingerprintResult = await verifyFingerprint();
      verificationSuccess = fingerprintResult.success;

      if (!verificationSuccess) {
        setMessage({
          type: 'error',
          text: fingerprintResult.message || 'Fingerprint verification failed. Please try again.',
        });
        return;
      }
    }

    if (verificationSuccess) {
      // Continue with submission
      const submitEvent = { preventDefault: () => {} };
      await proceedWithTransfer();
    }
  };

  const proceedWithTransfer = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(
        'http://localhost:5000/api/transactions/transfer',
        {
          recipientAccountNumber: formData.recipientAccountNumber,
          amount: parseFloat(formData.amount),
          description: formData.description,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      updateBalance(response.data.newBalance);
      
      // Show fraud detection results
      const fraudData = response.data.fraudDetection;
      
      if (fraudData) {
        // Determine message type based on risk level
        let messageType = 'success';
        let messageText = 'Transfer successful!';
        
        if (fraudData.isFraud) {
          if (fraudData.riskLevel === 'high') {
            messageType = 'fraud';
            messageText = '⚠️ High Risk Transaction - Completed but flagged';
          } else if (fraudData.riskLevel === 'medium') {
            messageType = 'warning';
            messageText = '⚠️ Medium Risk Transaction - Under review';
          }
        } else {
          // Low risk
          messageText = `✅ Transfer successful! (${fraudData.riskLevel} risk detected)`;
        }
        
        setMessage({ 
          type: messageType, 
          text: messageText,
          fraudData: {
            riskLevel: fraudData.riskLevel,
            probability: fraudData.probability,
            reasons: fraudData.reasons,
          }
        });
      } else {
        setMessage({ type: 'success', text: 'Transfer successful!' });
      }
      
      setFormData({ recipientAccountNumber: '', amount: '', description: '' });

      // Redirect after showing results
      setTimeout(() => {
        navigate('/transactions');
      }, 5000);
    } catch (error) {
      // Check if it's a fraud block
      if (error.response?.status === 403 && error.response?.data?.fraudDetection) {
        const fraudData = error.response.data.fraudDetection;
        setMessage({
          type: 'fraud',
          text: error.response.data.message,
          fraudData: fraudData
        });
      } else {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || 'Transfer failed',
        });
      }
    }

    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);

    // Check if biometric is required for this transaction
    if (amount > 500) {
      // Check if either browser biometric or fingerprint is enrolled
      if (!biometricEnabled && !fingerprintEnrolled) {
        setMessage({
          type: 'error',
          text: 'Transactions over $500 require biometric authentication. Please enroll your biometric or fingerprint in Security settings.',
        });
        return;
      }

      // If both methods available, show choice
      if (biometricEnabled && fingerprintEnrolled) {
        setShowVerificationChoice(true);
        return;
      }

      // Use available method
      let verificationSuccess = false;

      if (biometricEnabled) {
        setShowBiometricPrompt(true);
        setMessage({ type: 'info', text: 'Please verify your identity using browser biometric authentication.' });
        const biometricResult = await verifyBiometric(user.token);
        verificationSuccess = biometricResult.success;
        setShowBiometricPrompt(false);

        if (!verificationSuccess) {
          setMessage({
            type: 'error',
            text: biometricResult.message || 'Biometric verification failed. Please try again.',
          });
          return;
        }
      } else if (fingerprintEnrolled) {
        setMessage({ type: 'info', text: 'Please place your finger on the scanner...' });
        const fingerprintResult = await verifyFingerprint();
        verificationSuccess = fingerprintResult.success;

        if (!verificationSuccess) {
          setMessage({
            type: 'error',
            text: fingerprintResult.message || 'Fingerprint verification failed. Please try again.',
          });
          return;
        }
      }

      if (!verificationSuccess) {
        return;
      }
    }

    // Proceed with transfer after verification or if under $500
    await proceedWithTransfer();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transfer Money</h1>
          <p className="text-gray-600 mt-2">Send money to another account</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              {message.text && (
                <div
                  className={`mb-4 p-3 rounded ${
                    message.type === 'success'
                      ? 'bg-green-100 text-green-700'
                      : message.type === 'info'
                      ? 'bg-blue-100 text-blue-700'
                      : message.type === 'warning'
                      ? 'bg-yellow-100 text-yellow-800'
                      : message.type === 'fraud'
                      ? 'bg-red-100 text-red-800 border-2 border-red-300'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  <div className="flex items-start">
                    {message.type === 'fraud' && (
                      <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <div>
                      <p className="font-semibold">{message.text}</p>
                      {message.fraudData && (
                        <div className="mt-2 text-sm">
                          <p className="font-medium">Risk Level: <span className="uppercase">{message.fraudData.riskLevel}</span></p>
                          <p className="font-medium">Fraud Probability: {(message.fraudData.probability * 100).toFixed(1)}%</p>
                          {message.fraudData.reasons && message.fraudData.reasons.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium">Reasons:</p>
                              <ul className="list-disc list-inside ml-2">
                                {message.fraudData.reasons.map((reason, index) => (
                                  <li key={index}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {message.type === 'error' && !biometricEnabled && parseFloat(formData.amount) > 500 && (
                    <Link to="/security" className="block mt-2 underline font-medium">
                      Go to Security Settings
                    </Link>
                  )}
                </div>
              )}

              {showBiometricPrompt && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="animate-pulse w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                    <div>
                      <p className="font-medium text-blue-900">Biometric Verification Required</p>
                      <p className="text-sm text-blue-700">Please authenticate using your device's biometric sensor</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="recipientAccountNumber"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Recipient Account Number
                  </label>
                  <input
                    type="text"
                    id="recipientAccountNumber"
                    name="recipientAccountNumber"
                    className="input-field"
                    placeholder="Enter account number"
                    value={formData.recipientAccountNumber}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="amount"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Amount
                    {parseFloat(formData.amount) > 500 && (
                      <span className="ml-2 text-xs text-orange-600 font-medium">
                        (Biometric verification required)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      id="amount"
                      name="amount"
                      step="0.01"
                      min="0.01"
                      className="input-field pl-7"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Description (Optional)
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    className="input-field"
                    placeholder="What's this transfer for?"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Send Money'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card bg-gradient-to-br from-primary-500 to-primary-700 text-white">
              <h3 className="text-lg font-semibold mb-2">Available Balance</h3>
              <p className="text-3xl font-bold">${user?.balance?.toFixed(2)}</p>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">Transfer Info</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2">✓</span>
                  <span>Transfers are instant</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2">✓</span>
                  <span>No transfer fees</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2">✓</span>
                  <span>Secure and encrypted</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-600 mr-2">✓</span>
                  <span>24/7 customer support</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-600 mr-2">🔒</span>
                  <span className="font-medium">Transactions over $500 require biometric verification</span>
                </li>
              </ul>
              {!biometricEnabled && !fingerprintEnrolled && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <strong>Note:</strong> Biometric authentication is not enabled. 
                    <Link to="/security" className="underline ml-1">Enable it now</Link> to make transfers over $500.
                  </p>
                </div>
              )}
              {(biometricEnabled || fingerprintEnrolled) && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>✓ Biometric Enabled:</strong> 
                    {biometricEnabled && ' Browser biometric'}
                    {biometricEnabled && fingerprintEnrolled && ' & '}
                    {fingerprintEnrolled && ' Hardware fingerprint scanner'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verification Method Choice Modal */}
        {showVerificationChoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Choose Verification Method</h3>
              <p className="text-gray-600 mb-6">
                This transaction requires biometric verification. Please select your preferred method:
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleVerificationChoice('browser')}
                  className="w-full p-4 border-2 border-primary-300 rounded-lg hover:bg-primary-50 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                    <div>
                      <div className="font-semibold text-gray-900">Browser Biometric</div>
                      <div className="text-sm text-gray-600">Use face ID or fingerprint on this device</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleVerificationChoice('fingerprint')}
                  className="w-full p-4 border-2 border-primary-300 rounded-lg hover:bg-primary-50 transition-colors text-left"
                >
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <div>
                      <div className="font-semibold text-gray-900">Hardware Scanner</div>
                      <div className="text-sm text-gray-600">Use R307 fingerprint scanner</div>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowVerificationChoice(false)}
                className="mt-4 w-full py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transfer;
