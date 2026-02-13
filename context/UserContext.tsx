import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { getCurrentUserAPI } from '../services/api';

interface LimitedAdminPermissions {
  can_view_dashboard: boolean;
  can_manage_tenants: boolean;
  can_manage_subscriptions: boolean;
  can_manage_payment_gateways: boolean;
  can_view_reports: boolean;
  can_manage_communication: boolean;
  can_manage_settings: boolean;
  can_manage_limited_admins: boolean;
}

interface LimitedAdmin {
  id: number;
  is_active: boolean;
  permissions: LimitedAdminPermissions;
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_photo: string | null;
  role: string;
  company: number | null;
  company_name: string | null;
  company_specialization: string | null;
  is_active: boolean;
  email_verified: boolean;
  is_superuser: boolean;
  limited_admin?: LimitedAdmin;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: keyof LimitedAdminPermissions) => boolean;
  isSuperAdmin: () => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const userData = await getCurrentUserAPI();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [loadUser]);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const hasPermission = useCallback((permission: keyof LimitedAdminPermissions): boolean => {
    if (!user) return false;
    
    // Super admin has all permissions
    if (user.is_superuser) return true;
    
    // Check limited admin permissions
    if (user.limited_admin?.permissions) {
      return user.limited_admin.permissions[permission] || false;
    }
    
    return false;
  }, [user]);

  const isSuperAdmin = useCallback((): boolean => {
    return user?.is_superuser || false;
  }, [user]);

  return (
    <UserContext.Provider value={{ user, loading, refreshUser, hasPermission, isSuperAdmin }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
