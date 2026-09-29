import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed mb-4 animate-bounce">
          <span className="material-symbols-outlined text-2xl" data-icon="restaurant">restaurant</span>
        </div>
        <p className="text-body-md font-medium text-on-surface-variant">Connecting to CampusBites...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'CUSTOMER') return <Navigate to="/customer" replace />;
    if (role === 'PROVIDER') return <Navigate to="/provider" replace />;
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
