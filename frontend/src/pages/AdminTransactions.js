import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const AdminTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    startDate: '',
    endDate: '',
    fraudOnly: false,
  });

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.type) queryParams.append('type', filters.type);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);

      const response = await axios.get(
        `http://localhost:5000/api/admin/transactions?${queryParams.toString()}`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      
      let filteredTransactions = response.data;
      
      // Client-side filter for fraud-only
      if (filters.fraudOnly) {
        filteredTransactions = filteredTransactions.filter(t => 
          t.fraudDetection?.checked && t.fraudDetection?.isFraud
        );
      }
      
      setTransactions(filteredTransactions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters({ 
      ...filters, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const clearFilters = () => {
    setFilters({ status: '', type: '', startDate: '', endDate: '', fraudOnly: false });
  };

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const getFraudCount = () => {
    return transactions.filter(t => t.fraudDetection?.isFraud).length;
  };

  const getBlockedAmount = () => {
    return transactions
      .filter(t => t.status === 'failed' || t.status === 'blocked')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const getFraudWebsiteBlockCount = () => {
    return transactions.filter(t => t.fraudWebsiteDetection?.detected).length;
  };

  const getRateLimitBlockCount = () => {
    return transactions.filter(t => t.status === 'blocked' && t.blockReason && !t.fraudWebsiteDetection?.detected).length;
  };

  const isRateLimitBlock = (transaction) => {
    if (!transaction || transaction.status !== 'blocked') return false;
    if (!transaction.blockReason || typeof transaction.blockReason !== 'string') return false;
    // Rate limit blocks always use our throttling messages.
    return /too many transactions|transaction limit exceeded/i.test(transaction.blockReason);
  };

  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskLevelBadge = (riskLevel) => {
    switch (riskLevel) {
      case 'high': return '🔴 HIGH';
      case 'medium': return '🟠 MEDIUM';
      case 'low': return '🟢 LOW';
      default: return 'UNKNOWN';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Transaction Management</h2>
        <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="failed">Failed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer">Transfer</option>
              <option value="payment">Payment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="fraudOnly"
              checked={filters.fraudOnly}
              onChange={handleFilterChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">Show Fraud Detected Only</span>
          </label>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="text-sm font-medium opacity-90">Total Transactions</div>
          <div className="mt-2 text-3xl font-bold">{transactions.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="text-sm font-medium opacity-90">Total Volume</div>
          <div className="mt-2 text-3xl font-bold">RM{getTotalAmount().toFixed(2)}</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow p-6 text-white">
          <div className="text-sm font-medium opacity-90">ML Fraud Detected</div>
          <div className="mt-2 text-3xl font-bold">{getFraudCount()}</div>
        </div>
        <div className="bg-gradient-to-br from-red-700 to-red-800 rounded-lg shadow p-6 text-white">
          <div className="text-sm font-medium opacity-90">🚫 Fraud Sites</div>
          <div className="mt-2 text-3xl font-bold">{getFraudWebsiteBlockCount()}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
          <div className="text-sm font-medium opacity-90">⏱️ Rate Limited</div>
          <div className="mt-2 text-3xl font-bold">{getRateLimitBlockCount()}</div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            All Transactions {filters.fraudOnly && '(Fraud Detected Only)'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fraud Risk</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr 
                    key={transaction._id} 
                    className={`hover:bg-gray-50 ${
                      transaction.fraudDetection?.isFraud ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.userId?.firstName} {transaction.userId?.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{transaction.userId?.accountNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm capitalize text-gray-900">{transaction.type}</span>
                        {transaction.type === 'payment' && (
                          <span className="ml-2 px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded">
                            GATEWAY
                          </span>
                        )}
                      </div>
                      {transaction.merchantName && (
                        <div className="text-xs text-gray-500 mt-1">{transaction.merchantName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        RM{Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        transaction.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                        transaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                        transaction.status === 'blocked' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.fraudWebsiteDetection?.detected ? (
                        <div className="space-y-1">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-600 text-white">
                            🚫 FRAUD SITE
                          </span>
                          <div className="text-xs text-red-600 font-medium">
                            {transaction.fraudWebsiteDetection.riskLevel?.toUpperCase()}
                          </div>
                        </div>
                      ) : transaction.fraudDetection?.checked ? (
                        <div className="space-y-1">
                          {transaction.fraudDetection.isFraud ? (
                            <>
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                getRiskLevelColor(transaction.fraudDetection.riskLevel)
                              }`}>
                                {getRiskLevelBadge(transaction.fraudDetection.riskLevel)}
                              </span>
                              <div className="text-xs text-gray-500">
                                {(transaction.fraudDetection.fraudProbability * 100).toFixed(1)}% fraud
                              </div>
                            </>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              ✓ SAFE
                            </span>
                          )}
                        </div>
                      ) : isRateLimitBlock(transaction) ? (
                        <div className="space-y-1">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                            ⏱️ RATE LIMITED
                          </span>
                          <div className="text-xs text-gray-500">
                            Too frequent
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not checked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(transaction.fraudWebsiteDetection?.detected || 
                        (transaction.status === 'blocked' && transaction.blockReason) || 
                        transaction.fraudDetection?.isFraud) && (
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          className={`font-medium ${
                            transaction.fraudWebsiteDetection?.detected 
                              ? 'text-red-600 hover:text-red-900'
                              : transaction.blockReason
                              ? 'text-orange-600 hover:text-orange-900'
                              : 'text-primary-600 hover:text-primary-900'
                          }`}
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fraud Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedTransaction.fraudWebsiteDetection?.detected 
                      ? 'Fraud Website Block Details'
                      : selectedTransaction.fraudDetection?.checked
                      ? 'Fraud Detection Details'
                      : isRateLimitBlock(selectedTransaction)
                      ? 'Rate Limit Block Details'
                      : 'Transaction Details'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Transaction ID: {selectedTransaction._id}</p>
                </div>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Transaction Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="mt-1 text-sm text-gray-900">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Amount</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">RM{Math.abs(selectedTransaction.amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">User</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTransaction.userId?.firstName} {selectedTransaction.userId?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{selectedTransaction.userId?.accountNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedTransaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                    selectedTransaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    selectedTransaction.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedTransaction.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Fraud Website Block Info */}
              {selectedTransaction.fraudWebsiteDetection?.detected && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Fraud Website Detection</h4>
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-8 h-8 text-red-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <p className="font-bold text-red-900 text-lg">⚠️ Fraudulent Merchant Detected</p>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-red-800">Merchant Name:</span>
                            <span className="text-sm text-red-900 font-semibold">{selectedTransaction.fraudWebsiteDetection.merchantName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-red-800">Domain:</span>
                            <span className="text-sm text-red-900 font-mono">{selectedTransaction.fraudWebsiteDetection.domain}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-red-800">Risk Level:</span>
                            <span className={`text-sm font-bold uppercase ${
                              selectedTransaction.fraudWebsiteDetection.riskLevel === 'critical' ? 'text-red-700' :
                              selectedTransaction.fraudWebsiteDetection.riskLevel === 'high' ? 'text-red-600' :
                              'text-orange-600'
                            }`}>
                              {selectedTransaction.fraudWebsiteDetection.riskLevel}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-red-100 rounded">
                          <p className="text-sm font-medium text-red-900">Reason:</p>
                          <p className="mt-1 text-sm text-red-800">{selectedTransaction.fraudWebsiteDetection.reason}</p>
                        </div>
                        <p className="mt-3 text-xs text-red-700">
                          This payment was automatically blocked by the payment gateway because the merchant domain 
                          is listed in the fraud website blacklist. The transaction was prevented before any money transfer occurred.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Gateway Details */}
                  {selectedTransaction.merchantUrl && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h5 className="font-semibold text-gray-900 mb-2">Payment Gateway Transaction</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Original URL:</span>
                          <span className="text-gray-900 font-mono text-xs break-all max-w-xs text-right">{selectedTransaction.merchantUrl}</span>
                        </div>
                        {selectedTransaction.orderId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Order ID:</span>
                            <span className="text-gray-900 font-mono">{selectedTransaction.orderId}</span>
                          </div>
                        )}
                        {selectedTransaction.sessionId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Session ID:</span>
                            <span className="text-gray-900 font-mono text-xs">{selectedTransaction.sessionId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rate Limit Block Info */}
              {isRateLimitBlock(selectedTransaction) && !selectedTransaction.fraudWebsiteDetection?.detected && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Rate Limit Block Information</h4>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="font-medium text-orange-900">Transaction Blocked Due to Rate Limit</p>
                        <p className="mt-2 text-sm text-orange-800">{selectedTransaction.blockReason}</p>
                        <p className="mt-3 text-xs text-orange-700">
                          This transaction was automatically blocked because the user exceeded the allowed transaction frequency. 
                          The user was temporarily blocked from making transactions to prevent potential fraud or abuse.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fraud Risk Score */}
              {selectedTransaction.fraudDetection?.checked && !selectedTransaction.fraudWebsiteDetection?.detected && (
                <>
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Fraud Risk Assessment</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-500">Risk Level</p>
                        <p className={`mt-1 text-lg font-bold ${
                          selectedTransaction.fraudDetection.riskLevel === 'high' ? 'text-red-600' :
                          selectedTransaction.fraudDetection.riskLevel === 'medium' ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {getRiskLevelBadge(selectedTransaction.fraudDetection.riskLevel)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-500">Fraud Probability</p>
                        <p className="mt-1 text-lg font-bold text-gray-900">
                          {(selectedTransaction.fraudDetection.fraudProbability * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Failure Reasons */}
                  {selectedTransaction.fraudDetection.reasons && selectedTransaction.fraudDetection.reasons.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">
                        {selectedTransaction.status === 'failed' || selectedTransaction.status === 'blocked' 
                          ? 'Why This Transaction Failed' 
                          : 'Fraud Detection Reasons'}
                      </h4>
                      <div className="bg-red-50 border-l-4 border-red-400 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Fraud Indicators Detected</h3>
                            <div className="mt-2 text-sm text-red-700">
                              <ul className="list-disc pl-5 space-y-1">
                                {selectedTransaction.fraudDetection.reasons.map((reason, index) => (
                                  <li key={index}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedTransaction.description && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                      <p className="text-sm text-gray-600">{selectedTransaction.description}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
