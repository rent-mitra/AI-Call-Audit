import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import CallDetail from './components/CallDetail';
import QASettings from './components/QASettings';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './components/AdminDashboard';
import RegisterBusiness from './components/RegisterBusiness';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register-business" element={<RegisterBusiness />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={
              <Layout>
                <Routes>
                  {/* Role-aware dashboard (root) */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/call/:id" element={<CallDetail />} />

                  {/* QA Only */}
                  <Route element={<ProtectedRoute allowedRoles={['QA']} />}>
                    <Route path="/settings" element={<QASettings />} />
                  </Route>

                  {/* Admin Only */}
                  <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Route>
                </Routes>
              </Layout>
            } />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
