import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useBiometric } from '../context/BiometricContext';

const Dashboard = () => {
  const { user, updateBalance } = useAuth();
  const { biometricEnabled, verifyBiometric } = useBiometric();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentTransactions();
  }, []);

  const fetchRecentTransactions = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/transactions', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setRecentTransactions(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(
        'http://localhost:5000/api/transactions/deposit',
        { amount: parseFloat(amount), description },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      updateBalance(response.data.newBalance);
      setMessage({ type: 'success', text: 'Deposit successful!' });
      setAmount('');
      setDescription('');
      fetchRecentTransactions();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Deposit failed',
      });
    }

    setLoading(false);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);

    // Check if biometric is required for this transaction
    if (withdrawAmount > 500) {
      if (!biometricEnabled) {
        setMessage({
          type: 'error',
          text: 'Withdrawals over $500 require biometric authentication. Please enroll your biometric in Security settings.',
        });
        return;
      }

      setShowBiometricPrompt(true);
      setMessage({ type: 'info', text: 'Please verify your identity using biometric authentication.' });

      const biometricResult = await verifyBiometric(user.token);

      if (!biometricResult.success) {
        setMessage({
          type: 'error',
          text: biometricResult.message || 'Biometric verification failed. Please try again.',
        });
        setShowBiometricPrompt(false);
        return;
      }

      setShowBiometricPrompt(false);
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(
        'http://localhost:5000/api/transactions/withdraw',
        { amount: withdrawAmount, description },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );
      updateBalance(response.data.newBalance);
      setMessage({ type: 'success', text: 'Withdrawal successful!' });
      setAmount('');
      setDescription('');
      fetchRecentTransactions();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Withdrawal failed',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h1>
          <p className="text-gray-600">Account Number: {user?.accountNumber}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card bg-gradient-to-br from-primary-500 to-primary-700 text-white">
            <h3 className="text-lg font-semibold mb-2">Current Balance</h3>
            <p className="text-4xl font-bold">${user?.balance?.toFixed(2)}</p>
            <p className="text-sm mt-2 opacity-90">Account Type: {user?.accountType}</p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/transfer')}
                className="w-full btn-primary"
              >
                Send Money
              </button>
              <button
                onClick={() => navigate('/transactions')}
                className="w-full btn-secondary"
              >
                View All Transactions
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Account Info</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Name:</span> {user?.firstName} {user?.lastName}</p>
              <p><span className="font-medium">Email:</span> {user?.email}</p>
              <p><span className="font-medium">Status:</span> <span className="text-green-600">Active</span></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Quick Deposit/Withdrawal</h2>
            {message.text && (
              <div
                className={`mb-4 p-3 rounded ${
                  message.type === 'success'
                    ? 'bg-green-100 text-green-700'
                    : message.type === 'info'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {message.text}
                {message.type === 'error' && !biometricEnabled && parseFloat(amount) > 500 && (
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

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                  {parseFloat(amount) > 500 && (
                    <span className="ml-2 text-xs text-orange-600 font-medium">
                      (Biometric verification required for withdrawals)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleDeposit}
                  disabled={loading || !amount}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                >
                  Deposit
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={loading || !amount}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                >
                  Withdraw
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Recent Transactions</h2>
            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No transactions yet</p>
              ) : (
                recentTransactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{transaction.type}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p
                      className={`font-bold ${
                        transaction.type === 'deposit' || (transaction.type === 'transfer' && transaction.amount > 0)
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}
                    >
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>
            {recentTransactions.length > 0 && (
              <button
                onClick={() => navigate('/transactions')}
                className="w-full mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                View All →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
