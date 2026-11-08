import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, user, validateSession } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      validateSession();
    }
  }, [isAuthenticated, user?.id, validateSession]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
