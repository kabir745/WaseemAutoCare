import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredPermission }) {
  const { isAuthenticated, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="p-5 text-center">
        <div className="alert alert-danger d-inline-block shadow-sm p-4">
          <h4 className="alert-heading fw-bold">403 — Access Denied</h4>
          <p className="mb-0">You do not have the required permission (<code>{requiredPermission}</code>) to access this management area.</p>
        </div>
      </div>
    );
  }

  return children;
}
