import React from 'react';
import { Navigate } from 'react-router-dom';
import { useI18n } from '../context/i18n';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission: string;
  fallbackPath?: string;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  children, 
  permission,
  fallbackPath = '/dashboard'
}) => {
  const { t } = useI18n();
  
  // For now, we'll check permissions from API
  // In a real implementation, you'd get this from the user's profile
  // This is a placeholder - you'll need to implement actual permission checking
  const hasPermission = true; // TODO: Implement actual permission check
  
  if (!hasPermission) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default PermissionGuard;
