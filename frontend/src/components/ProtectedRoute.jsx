import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false, userOnly = false }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  // ⏳ Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading-spinner-large"></div>
      </div>
    );
  }

  // 🔐 Not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 🛡️ Admin-only route
  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // 👤 User-only route (block admin)
  if (userOnly && isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;