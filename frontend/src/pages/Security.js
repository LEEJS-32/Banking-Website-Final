import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useBiometric } from '../context/BiometricContext';

const Security = () => {
  const { user } = useAuth();
  const { biometricAvailable, biometricEnabled, credentials, enrollBiometric, removeBiometric, refreshStatus } = useBiometric();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    refreshStatus();
  }, []);

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
    const result = await removeBiometric(user.token, credentialId);

    if (result.success) {
      setMessage({ type: 'success', text: 'Biometric credential removed successfully' });
    } else {
      setMessage({ type: 'error', text: result.message });
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
          {/* Biometric Authentication Card */}
          <div className="card">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  Biometric Authentication
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Enhance security for transactions over $500 with fingerprint or face recognition
                </p>
              </div>
              <div className="flex items-center">
                {biometricEnabled && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Enabled
                  </span>
                )}
              </div>
            </div>

            {!biometricAvailable ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Biometric Not Available</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your device or browser doesn't support biometric authentication. Please use a device with fingerprint or face recognition capabilities.
                    </p>
                  </div>
                </div>
              </div>
            ) : !biometricEnabled ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Why Enable Biometric?</h3>
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
                      <span>Your biometric data stays on your device</span>
                    </li>
                  </ul>
                </div>
                <button
                  onClick={handleEnrollBiometric}
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? 'Enrolling...' : 'Enroll Biometric Authentication'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-green-900">Biometric Authentication Active</h3>
                      <p className="text-sm text-green-700 mt-1">
                        Transactions over $500 will require biometric verification
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Enrolled Devices</h3>
                  <div className="space-y-2">
                    {credentials.map((credential) => (
                      <div
                        key={credential.credentialId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{credential.deviceName}</p>
                          <p className="text-sm text-gray-500">
                            Enrolled on {new Date(credential.enrolledAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveBiometric(credential.credentialId)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleEnrollBiometric}
                  disabled={loading}
                  className="btn-secondary disabled:opacity-50"
                >
                  Add Another Device
                </button>
              </div>
            )}
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
