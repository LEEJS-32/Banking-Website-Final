import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BiometricProvider } from './context/BiometricContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Transfer from './pages/Transfer';
import Security from './pages/Security';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <BiometricProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transactions"
                element={
                  <PrivateRoute>
                    <Transactions />
                  </PrivateRoute>
                }
              />
              <Route
                path="/transfer"
                element={
                  <PrivateRoute>
                    <Transfer />
                  </PrivateRoute>
                }
              />
              <Route
                path="/security"
                element={
                  <PrivateRoute>
                    <Security />
                  </PrivateRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </BiometricProvider>
    </AuthProvider>
  );
}

export default App;
