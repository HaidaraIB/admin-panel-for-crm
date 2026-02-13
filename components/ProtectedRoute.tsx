import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const hasToken = localStorage.getItem('accessToken');
  const sessionAuth = sessionStorage.getItem('isAuthenticated') === 'true';
  const isAuthenticated = !!(hasToken || sessionAuth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
