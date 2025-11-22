import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const BiometricContext = createContext();

export const useBiometric = () => {
  const context = useContext(BiometricContext);
  if (!context) {
    throw new Error('useBiometric must be used within a BiometricProvider');
  }
  return context;
};

export const BiometricProvider = ({ children }) => {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [credentials, setCredentials] = useState([]);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    // Check if WebAuthn is supported
    if (window.PublicKeyCredential) {
      setBiometricAvailable(true);
      
      // Check if user has enrolled biometrics
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        try {
          const response = await axios.get('http://localhost:5000/api/biometric/status', {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          });
          setBiometricEnabled(response.data.biometricEnabled);
          setCredentials(response.data.credentials);
        } catch (error) {
          console.error('Error checking biometric status:', error);
        }
      }
    }
  };

  const enrollBiometric = async (token) => {
    try {
      // Get registration challenge from server
      const challengeResponse = await axios.get(
        'http://localhost:5000/api/biometric/challenge/register',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { challenge, user } = challengeResponse.data;

      // Create credential using WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
          rp: {
            name: 'SecureBank',
            id: window.location.hostname,
          },
          user: {
            id: Uint8Array.from(user.id, c => c.charCodeAt(0)),
            name: user.name,
            displayName: user.displayName,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },  // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'none',
        },
      });

      // Convert credential to storable format
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      const publicKey = btoa(String.fromCharCode(...new Uint8Array(credential.response.getPublicKey())));

      // Send to server
      await axios.post(
        'http://localhost:5000/api/biometric/enroll',
        {
          credentialId,
          publicKey,
          deviceName: navigator.userAgent.includes('Windows') ? 'Windows Hello' : 
                     navigator.userAgent.includes('Mac') ? 'Touch ID' : 'Biometric Device',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setBiometricEnabled(true);
      await checkBiometricAvailability();

      return { success: true, message: 'Biometric enrolled successfully' };
    } catch (error) {
      console.error('Biometric enrollment error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to enroll biometric. Make sure your device supports biometric authentication.',
      };
    }
  };

  const verifyBiometric = async (token) => {
    try {
      if (credentials.length === 0) {
        return { success: false, message: 'No biometric credentials enrolled' };
      }

      // Generate challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Request authentication
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          rpId: window.location.hostname,
          allowCredentials: credentials.map(cred => ({
            type: 'public-key',
            id: Uint8Array.from(atob(cred.credentialId), c => c.charCodeAt(0)),
          })),
          userVerification: 'required',
          timeout: 60000,
        },
      });

      const credentialId = btoa(String.fromCharCode(...new Uint8Array(assertion.rawId)));
      const signature = btoa(String.fromCharCode(...new Uint8Array(assertion.response.signature)));

      // Verify with server
      const response = await axios.post(
        'http://localhost:5000/api/biometric/verify',
        {
          credentialId,
          signature,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return { success: true, verified: response.data.verified };
    } catch (error) {
      console.error('Biometric verification error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Biometric verification failed',
      };
    }
  };

  const removeBiometric = async (token, credentialId) => {
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/biometric/remove/${encodeURIComponent(credentialId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Refresh the biometric status
      await checkBiometricAvailability();
      
      return { 
        success: true, 
        message: response.data.message || 'Biometric credential removed successfully',
      };
    } catch (error) {
      console.error('Error removing biometric:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove biometric credential',
      };
    }
  };

  const value = {
    biometricAvailable,
    biometricEnabled,
    credentials,
    enrollBiometric,
    verifyBiometric,
    removeBiometric,
    refreshStatus: checkBiometricAvailability,
  };

  return <BiometricContext.Provider value={value}>{children}</BiometricContext.Provider>;
};
