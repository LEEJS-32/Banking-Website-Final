import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useBiometric } from '../context/BiometricContext';
import axios from 'axios';

const Security = () => {
  const { user } = useAuth();
  const { biometricAvailable, biometricEnabled, credentials, enrollBiometric, removeBiometric, refreshStatus } = useBiometric();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Fingerprint scanner states
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [fingerprintMessage, setFingerprintMessage] = useState({ type: '', text: '' });
  const [fingerprintStatus, setFingerprintStatus] = useState({
    enrolled: false,
    enrolledAt: null,
    device: null,
  });
  const [scannerConnected, setScannerConnected] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    refreshStatus();
    checkFingerprintStatus();
    checkScannerConnection();
    
    // Poll scanner status only every 5 seconds to avoid flickering
    const interval = setInterval(() => {
      checkScannerConnection();
    }, 5000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const checkScannerConnection = async () => {
    try {
      const response = await axios.get('http://localhost:5002/health');
      // API is running if we get a response, check scanner hardware status
      setApiOnline(true);
      setScannerConnected(response.data.status === 'ok');
    } catch (error) {
      // API is not running at all
      setApiOnline(false);
      setScannerConnected(false);
    }
  };

  const handleReconnectScanner = async () => {
    setFingerprintLoading(true);
    setFingerprintMessage({ type: 'info', text: 'Attempting to reconnect scanner...' });
    
    try {
      const response = await axios.post('http://localhost:5002/reconnect');
      if (response.data.success) {
        setScannerConnected(true);
        setFingerprintMessage({ type: 'success', text: 'Scanner reconnected successfully!' });
      } else {
        setFingerprintMessage({ type: 'error', text: response.data.message || 'Failed to reconnect' });
      }
    } catch (error) {
      setFingerprintMessage({ type: 'error', text: 'Could not connect to fingerprint API' });
    }
    
    setFingerprintLoading(false);
  };

  const checkFingerprintStatus = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/fingerprint/status', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setFingerprintStatus(response.data);
    } catch (error) {
      console.error('Failed to check fingerprint status:', error);
    }
  };

  const handleEnrollFingerprint = async () => {
    setFingerprintLoading(true);
    setFingerprintMessage({ type: '', text: '' });

    try {
      setFingerprintMessage({ type: 'info', text: 'Please place your finger on the scanner...' });
      
      const response = await axios.post(
        'http://localhost:5000/api/fingerprint/enroll',
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      if (response.data.success) {
        setFingerprintMessage({ type: 'success', text: 'Fingerprint enrolled successfully!' });
        checkFingerprintStatus();
      }
    } catch (error) {
      setFingerprintMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to enroll fingerprint. Please try again.',
      });
    }

    setFingerprintLoading(false);
  };

  const handleRemoveFingerprint = async () => {
    if (!window.confirm('Are you sure you want to remove your fingerprint?')) {
      return;
    }

    setFingerprintLoading(true);
    setFingerprintMessage({ type: '', text: '' });

    try {
      const response = await axios.delete('http://localhost:5000/api/fingerprint/remove', {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      if (response.data.success) {
        setFingerprintMessage({ type: 'success', text: 'Fingerprint removed successfully!' });
        checkFingerprintStatus();
      }
    } catch (error) {
      setFingerprintMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to remove fingerprint.',
      });
    }

    setFingerprintLoading(false);
  };

  const handleEnrollBiometric = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    const result = await enrollBiometric(user.token);

    if (result.success) {
      setMessage({ type: 'success', text: 'Biometric authentication enrolled successfully!' });
    } else {
      setMessage({ type: 'error', text: result.message });
    }

    setLoading(false);
  };

  const handleRemoveBiometric = async (credentialId) => {
    if (!window.confirm('Are you sure you want to remove this biometric credential?')) {
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    
    const result = await removeBiometric(user.token, credentialId);

    if (result.success) {
      setMessage({ type: 'success', text: result.message || 'Biometric credential removed successfully' });
      // Refresh the status after a short delay to ensure state is updated
      setTimeout(() => {
        refreshStatus();
      }, 100);
    } else {
      setMessage({ type: 'error', text: result.message || 'Failed to remove biometric credential' });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account security and biometric authentication</p>
        </div>

        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          {/* Unified Biometric Authentication Card */}
          <div className="card">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Biometric Authentication
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Choose your preferred biometric method for transactions over $500
                </p>
              </div>
              <div className="flex items-center gap-2">
                {scannerConnected && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    Scanner Ready
                  </span>
                )}
                {(biometricEnabled || fingerprintStatus.enrolled) && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* Show success/error messages */}
            {(message.text || fingerprintMessage.text) && (
              <div
                className={`mb-4 p-4 rounded-lg ${
                  (message.type === 'success' || fingerprintMessage.type === 'success')
                    ? 'bg-green-100 text-green-700'
                    : fingerprintMessage.type === 'info'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {message.text || fingerprintMessage.text}
              </div>
            )}

            {/* Info box if no biometric is enrolled */}
            {!biometricEnabled && !fingerprintStatus.enrolled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Why Enable Biometric Authentication?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">✓</span>
                    <span>Required for transactions exceeding $500</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">✓</span>
                    <span>Extra layer of security for your account</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">✓</span>
                    <span>Quick and convenient authentication</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">✓</span>
                    <span>Choose the method that works best for you</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Method Selection Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Browser Biometric Option */}
              <div className={`border-2 rounded-lg p-6 transition-all ${
                biometricEnabled 
                  ? 'border-green-500 bg-green-50' 
                  : fingerprintStatus.enrolled 
                  ? 'border-gray-300 bg-gray-100 opacity-60' 
                  : 'border-gray-300 hover:border-primary-500'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <svg className="w-8 h-8 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Browser Biometric</h3>
                      <p className="text-xs text-gray-600">Windows Hello / Touch ID</p>
                    </div>
                  </div>
                  {biometricEnabled && (
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {!biometricAvailable ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                    <p className="text-xs text-yellow-800">
                      Not supported on this device/browser
                    </p>
                  </div>
                ) : biometricEnabled ? (
                  <div>
                    <div className="bg-white rounded p-3 mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Enrolled Devices:</p>
                      {credentials.map((credential) => (
                        <div key={credential.credentialId} className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>{credential.deviceName}</span>
                          <button
                            onClick={() => handleRemoveBiometric(credential.credentialId)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleEnrollBiometric}
                      disabled={loading}
                      className="w-full btn-secondary text-sm py-2"
                    >
                      Add Another Device
                    </button>
                  </div>
                ) : fingerprintStatus.enrolled ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-2">Hardware fingerprint is active</p>
                    <p className="text-xs text-gray-500">Disable hardware scanner to use this method</p>
                  </div>
                ) : (
                  <div>
                    <ul className="text-xs text-gray-700 space-y-2 mb-4">
                      <li className="flex items-start">
                        <span className="text-primary-600 mr-2">•</span>
                        <span>Uses device's built-in biometric</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary-600 mr-2">•</span>
                        <span>No extra hardware needed</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary-600 mr-2">•</span>
                        <span>Quick setup and verification</span>
                      </li>
                    </ul>
                    <button
                      onClick={handleEnrollBiometric}
                      disabled={loading || !biometricAvailable}
                      className="w-full btn-primary disabled:opacity-50 text-sm py-2"
                    >
                      {loading ? 'Enrolling...' : 'Enroll Browser Biometric'}
                    </button>
                  </div>
                )}
              </div>

              {/* Hardware Scanner Option */}
              <div className={`border-2 rounded-lg p-6 transition-all ${
                fingerprintStatus.enrolled 
                  ? 'border-green-500 bg-green-50' 
                  : biometricEnabled 
                  ? 'border-gray-300 bg-gray-100 opacity-60' 
                  : 'border-gray-300 hover:border-primary-500'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <svg className="w-8 h-8 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Hardware Scanner</h3>
                      <p className="text-xs text-gray-600">R307 Fingerprint Module</p>
                    </div>
                  </div>
                  {fingerprintStatus.enrolled && (
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {!scannerConnected ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                    <p className="text-xs text-yellow-800 mb-2">
                      Scanner not connected
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={checkScannerConnection}
                        disabled={fingerprintLoading}
                        className="text-xs text-yellow-900 underline hover:no-underline disabled:opacity-50"
                      >
                        Check again
                      </button>
                      <span className="text-yellow-600">•</span>
                      <button
                        onClick={handleReconnectScanner}
                        disabled={fingerprintLoading}
                        className="text-xs text-yellow-900 font-medium underline hover:no-underline disabled:opacity-50"
                      >
                        {fingerprintLoading ? 'Reconnecting...' : 'Reconnect'}
                      </button>
                    </div>
                  </div>
                ) : fingerprintStatus.enrolled ? (
                  <div>
                    <div className="bg-white rounded p-3 mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Enrollment Details:</p>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Device:</span>
                          <span className="font-medium">{fingerprintStatus.device || 'R307'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Enrolled:</span>
                          <span className="font-medium">
                            {fingerprintStatus.enrolledAt
                              ? new Date(fingerprintStatus.enrolledAt).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveFingerprint}
                      disabled={fingerprintLoading}
                      className="w-full btn-secondary text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm py-2"
                    >
                      {fingerprintLoading ? 'Removing...' : 'Remove Hardware Scanner'}
                    </button>
                  </div>
                ) : biometricEnabled ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-2">Browser biometric is active</p>
                    <p className="text-xs text-gray-500">Disable browser biometric to use this method</p>
                  </div>
                ) : (
                  <div>
                    <ul className="text-xs text-gray-700 space-y-2 mb-4">
                      <li className="flex items-start">
                        <span className="text-primary-600 mr-2">•</span>
                        <span>Higher security level</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary-600 mr-2">•</span>
                        <span>Works offline</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary-600 mr-2">•</span>
                        <span>SIFT matching algorithm</span>
                      </li>
                    </ul>
                    <button
                      onClick={handleEnrollFingerprint}
                      disabled={fingerprintLoading || !scannerConnected}
                      className="w-full btn-primary disabled:opacity-50 text-sm py-2 flex items-center justify-center"
                    >
                      {fingerprintLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Scanning...
                        </>
                      ) : (
                        'Enroll Hardware Scanner'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Information Card */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Account Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Account Number</span>
                <span className="font-medium">{user?.accountNumber}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Account Type</span>
                <span className="font-medium capitalize">{user?.accountType}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Email</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Account Status</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;
