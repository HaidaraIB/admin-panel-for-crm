
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import AddTenant from './pages/AddTenant';
import Subscriptions from './pages/Subscriptions';
import Reports from './pages/Reports';
import Communication from './pages/Communication';
import SystemSettings from './pages/SystemSettings';
import SupportTickets from './pages/SupportTickets';
import TenantWhatsAppChat from './pages/TenantWhatsAppChat';
import LoginPage from './pages/LoginPage';
import PaymentGateways from './pages/PaymentGateways';
import ProtectedRoute from './components/ProtectedRoute';
import { Page, Tenant, TenantStatus } from './types';
import { useAuditLog } from './context/AuditLogContext';
import { useI18n } from './context/i18n';
import { useUser } from './context/UserContext';
import { useAlert } from './context/AlertContext';
import { translateAdminApiError } from './utils/translateApiError';
import FullPageLoader from './components/FullPageLoader';
import { getCompaniesAPI, getCompanyAPI, getSubscriptionsAPI, getPlansAPI, updateCompanyAPI, deleteCompanyAPI, createSubscriptionAPI, updateSubscriptionAPI, getSubscriptionAPI, invalidateListCache } from './services/api';

/** GET /plans/ row subset used when resolving tenant current plan label */
type ApiPlanRow = { id: number; name?: string; name_ar?: string };
/** GET /subscriptions/ list item — allows object spread for update payloads */
type ApiSubscriptionRow = Record<string, unknown> & { id: number; company: number; is_active?: boolean };

type RoutePermission = 'can_view_dashboard' | 'can_manage_tenants' | 'can_manage_subscriptions' | 'can_manage_payment_gateways' | 'can_view_reports' | 'can_manage_communication' | 'can_manage_settings' | 'can_manage_support_tickets';

const PermissionGuard: React.FC<{ permission: RoutePermission; children: React.ReactNode }> = ({ permission, children }) => {
  const { hasPermission, isSuperAdmin, loading } = useUser();
  if (loading) return <FullPageLoader />;
  if (isSuperAdmin() || hasPermission(permission)) return <>{children}</>;
  return <Navigate to="/dashboard" replace />;
};

const App: React.FC = () => {
  const { language, t } = useI18n();
  const { showAlert } = useAlert();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const hasToken = localStorage.getItem('accessToken');
    const sessionAuth = sessionStorage.getItem('isAuthenticated') === 'true';
    return !!(hasToken || sessionAuth);
  });
  
  // Get active page from route
  const getActivePageFromRoute = (pathname: string): Page => {
    const routeMap: Record<string, Page> = {
      '/dashboard': 'Dashboard',
      '/tenants': 'Tenants',
      '/tenant-whatsapp': 'TenantWhatsApp',
      '/subscriptions': 'Subscriptions',
      '/payment-gateways': 'PaymentGateways',
      '/reports': 'Reports',
      '/communication': 'Communication',
      '/settings': 'Settings',
      '/support-tickets': 'SupportTickets',
    };
    return routeMap[pathname] || 'Dashboard';
  };
  
  const activePage = getActivePageFromRoute(location.pathname);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const { addLog } = useAuditLog();
  const [isPageLoading, setIsPageLoading] = useState(false);
  const prevPathnameRef = useRef<string>(location.pathname);

  // On any page navigation, clear list cache so the new page always gets fresh API data
  useEffect(() => {
    invalidateListCache();
  }, [location.pathname]);

  // Fetch tenants when authenticated (e.g. after login)
  useEffect(() => {
    if (isAuthenticated) {
      loadTenants();
    }
  }, [isAuthenticated]);

  // When user navigates TO the companies/tenants page, refetch
  useEffect(() => {
    const currentPath = location.pathname;
    const cameFromAnotherPage = prevPathnameRef.current !== '/tenants';
    prevPathnameRef.current = currentPath;

    if (isAuthenticated && currentPath === '/tenants' && cameFromAnotherPage) {
      loadTenants();
    }
  }, [isAuthenticated, location.pathname]);

  const loadTenants = async () => {
    setIsLoadingTenants(true);
    try {
      // Fetch companies, subscriptions, and plans
      const [companiesResponse, subscriptionsResponse, plansResponse] = await Promise.all([
        getCompaniesAPI(),
        getSubscriptionsAPI(),
        getPlansAPI()
      ]);

      const companies = companiesResponse.results || [];
      const subscriptions = (subscriptionsResponse.results || []) as any[];
      const plans = (plansResponse.results || []) as ApiPlanRow[];

      // Create a map of company_id -> active subscription
      const subscriptionMap = new Map();
      subscriptions.forEach((sub: any) => {
        if (sub.is_active && (!subscriptionMap.has(sub.company) || 
            new Date(sub.end_date) > new Date(subscriptionMap.get(sub.company)?.end_date || 0))) {
          subscriptionMap.set(sub.company, sub);
        }
      });

      // Map companies to tenants using API field names
      const mappedTenants: Tenant[] = companies.map((company: any) => {
        const subscription = subscriptionMap.get(company.id);
        const endDate = subscription?.end_date 
          ? new Date(subscription.end_date).toISOString().split('T')[0]
          : undefined;
        const startDate = subscription?.start_date
          ? new Date(subscription.start_date).toISOString().split('T')[0]
          : company.created_at ? new Date(company.created_at).toISOString().split('T')[0] : undefined;

        // Determine status based on API subscription data
        let status = TenantStatus.Deactivated;
        if (subscription) {
          if (subscription.is_active) {
            const now = new Date();
            const end = new Date(subscription.end_date);
            if (end < now) {
              status = TenantStatus.Expired;
            } else {
              status = TenantStatus.Active;
            }
          } else {
            status = TenantStatus.Deactivated;
          }
        }

        // Get plan name with Arabic support
        let currentPlan = '';
        if (subscription?.plan) {
          const plan = plans.find((p) => p.id === subscription.plan);
          if (plan) {
            currentPlan = language === 'ar' && plan.name_ar?.trim() ? plan.name_ar : plan.name;
          } else {
            currentPlan = subscription.plan_name || '';
          }
        }

        return {
          id: company.id,
          name: company.name,
          domain: company.domain,
          specialization: company.specialization,
          owner: company.owner,
          owner_username: company.owner_username,
          owner_email: company.owner_email,
          owner_phone: company.owner_phone,
          created_at: company.created_at,
          updated_at: company.updated_at,
          freeTrialConsumed: Boolean(company.free_trial_consumed),
          // Legacy fields from subscriptions
          currentPlan: currentPlan,
          status: status,
          startDate: startDate,
          endDate: endDate,
        };
      });

      setTenants(mappedTenants);
    } catch (error: any) {
      console.error('Error loading tenants:', error);
      const status = error?.status as number | undefined;
      const code = error?.code as string | undefined;
      const errorMessage = error?.message || '';
      if (
        status === 401 ||
        status === 403 ||
        code === 'permission_denied' ||
        code === 'authentication_failed' ||
        errorMessage.includes('Forbidden') ||
        errorMessage.includes('403') ||
        errorMessage.includes('Session expired') ||
        errorMessage.includes('401') ||
        errorMessage.includes('Unauthorized')
      ) {
        // Clear auth and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
        navigate('/login');
      }
      // Set empty array on error to show "no tenants" message
      setTenants([]);
    } finally {
      setIsLoadingTenants(false);
    }
  };


  useEffect(() => {
    setIsPageLoading(true);
    const timer = setTimeout(() => setIsPageLoading(false), 300); // Simulate loading
    return () => clearTimeout(timer);
  }, [activePage]);

  const handleLoginSuccess = () => {
    sessionStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
    // Navigate will be handled by LoginPage component
  };

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const handleAddTenantSuccess = async (newTenant: Omit<Tenant, 'id'>) => {
    addLog('audit.log.tenantCreated', { companyName: newTenant.name });
    await loadTenants();
    navigate('/tenants');
  };
  
  const handleUpdateTenant = async (updatedTenant: Tenant) => {
    try {
      // Use API field names: name, domain, specialization
      const companyData = {
        name: updatedTenant.name,
        domain: updatedTenant.domain.replace('.platform.com', ''), // Remove domain suffix if present
        specialization: updatedTenant.specialization || 'real_estate',
        free_trial_consumed: updatedTenant.freeTrialConsumed ?? false,
      };

      await updateCompanyAPI(updatedTenant.id, companyData);
      addLog('audit.log.tenantUpdated', { companyName: updatedTenant.name });
      
      // Reload tenants to get updated list
      await loadTenants();
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      showAlert(translateAdminApiError(error, t) || t('errors.updateTenant'), { variant: 'error' });
    }
  };

  const handleActivateTenant = async (tenantId: number, planId: number, startDate: string, endDate: string) => {
    try {
      // Get company to find owner
      const company = await getCompanyAPI(tenantId);
      
      // Owner can be a number (ID) or an object with id property
      let ownerId: number;
      if (typeof company.owner === 'number') {
        ownerId = company.owner;
      } else if (company.owner && typeof company.owner === 'object' && 'id' in company.owner) {
        ownerId = company.owner.id;
      } else {
        // Try to find owner from tenant data
        const tenant = tenants.find(t => t.id === tenantId);
        if (tenant?.owner) {
          ownerId = tenant.owner;
        } else {
          throw new Error('Company owner is required. Please ensure the company has an owner assigned.');
        }
      }

      // Use existing subscription for this company if any (active or not) so only one sub per company
      const subscriptionsResponse = await getSubscriptionsAPI();
      const subscriptionRows = (subscriptionsResponse.results || []) as ApiSubscriptionRow[];
      const existingSubscription = subscriptionRows.find((sub) => sub.company === tenantId);

      const subscriptionData = {
        company: tenantId,
        plan: planId,
        owner: ownerId,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      };

      if (existingSubscription) {
        // Update existing subscription - backend will deactivate other subs for this company
        await updateSubscriptionAPI(existingSubscription.id, {
          ...existingSubscription,
          ...subscriptionData,
        });
        addLog('audit.log.tenantActivated', { companyName: company.name });
      } else {
        // Create new subscription - backend will ensure only one active per company
        await createSubscriptionAPI(subscriptionData);
        addLog('audit.log.tenantActivated', { companyName: company.name });
      }

      // Reload tenants to get updated list
      await loadTenants();
    } catch (error: any) {
      console.error('Error activating tenant:', error);
      // Handle field-specific errors
      if (error.fields) {
        const fieldErrors = Object.entries(error.fields)
          .map(([field, messages]: [string, any]) => {
            const msg = Array.isArray(messages) ? messages[0] : messages;
            return `${field}: ${msg}`;
          })
          .join(', ');
        throw new Error(fieldErrors || 'Failed to activate tenant');
      }
      throw new Error(error.message || 'Failed to activate tenant');
    }
  };

  const handleDeactivateTenant = async (tenantId: number) => {
    try {
      // Get company name for logging
      const company = await getCompanyAPI(tenantId);

      // Find active subscription and deactivate it
      const subscriptionsResponse = await getSubscriptionsAPI();
      const deactivateRows = (subscriptionsResponse.results || []) as ApiSubscriptionRow[];
      const activeSubscription = deactivateRows.find((sub) => sub.company === tenantId && sub.is_active);

      if (activeSubscription) {
        await updateSubscriptionAPI(activeSubscription.id, {
          ...activeSubscription,
          is_active: false,
        });
        addLog('audit.log.tenantDeactivated', { companyName: company.name });
      }

      // Reload tenants to get updated list
      await loadTenants();
    } catch (error: any) {
      console.error('Error deactivating tenant:', error);
      throw new Error(error.message || 'Failed to deactivate tenant');
    }
  };

  const handleDeleteTenant = async (tenantId: number) => {
    try {
      const company = await getCompanyAPI(tenantId);
      await deleteCompanyAPI(tenantId);
      addLog('audit.log.tenantDeleted', { companyName: company.name });
      await loadTenants();
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      showAlert(translateAdminApiError(error, t) || t('errors.deleteTenant'), { variant: 'error' });
      throw error;
    }
  };

  const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <Sidebar 
          activePage={activePage} 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header setIsSidebarOpen={setIsSidebarOpen} onLogoutClick={() => setIsLogoutConfirmOpen(true)} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 relative">
            {isPageLoading && <FullPageLoader />}
            <div className={isPageLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
              {children}
            </div>
          </main>
        </div>
      {/* Logout Confirmation Dialog */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={() => setIsLogoutConfirmOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('logout.confirmTitle')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t('logout.confirmMessage')}
              </p>
              <div className={`flex gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsLogoutConfirmOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors"
                >
                  {t('sidebar.logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />
      } />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <PermissionGuard permission="can_view_dashboard">
              <Layout>
                <Dashboard key={`dashboard-${language}`} />
              </Layout>
            </PermissionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenants"
        element={
          <ProtectedRoute>
            <PermissionGuard permission="can_manage_tenants">
              <Layout>
                <Tenants 
                  key={`tenants-${language}`} 
                  tenants={tenants} 
                  onUpdateTenant={handleUpdateTenant}
                  onActivateTenant={handleActivateTenant}
                  onDeactivateTenant={handleDeactivateTenant}
                  onDeleteTenant={handleDeleteTenant}
                  isLoading={isLoadingTenants} 
                  onRefresh={loadTenants} 
                />
              </Layout>
            </PermissionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenants/add"
        element={
          <ProtectedRoute>
            <PermissionGuard permission="can_manage_tenants">
              <Layout>
                <AddTenant key={`add-tenant-${language}`} onSave={handleAddTenantSuccess} />
              </Layout>
            </PermissionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenant-whatsapp"
        element={
          <ProtectedRoute>
            <PermissionGuard permission="can_manage_tenants">
              <Layout>
                <TenantWhatsAppChat key={`tenant-whatsapp-${language}`} />
              </Layout>
            </PermissionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscriptions"
        element={
          <ProtectedRoute>
            <PermissionGuard permission="can_manage_subscriptions">
              <Layout>
                <Subscriptions key={`subscriptions-${language}`} tenants={tenants} />
              </Layout>
            </PermissionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment-gateways"
        element={
          <ProtectedRoute>
            <PermissionGuard permission="can_manage_payment_gateways">
              <Layout>
                <PaymentGateways key={`payment-gateways-${language}`} />
              </Layout>
            </PermissionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <PermissionGuard permission="can_view_reports">
              <Layout>
                <Reports key={`reports-${language}`} />
              </Layout>
            </PermissionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/communication"
        element={
          <ProtectedRoute>
            <PermissionGuard permission="can_manage_communication">
              <Layout>
                <Communication key={`communication-${language}`} />
              </Layout>
            </PermissionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <PermissionGuard permission="can_manage_settings">
              <Layout>
                <SystemSettings key={`settings-${language}`} />
              </Layout>
            </PermissionGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/support-tickets"
        element={
          <ProtectedRoute>
            <PermissionGuard permission="can_manage_support_tickets">
              <Layout>
                <SupportTickets key={`support-tickets-${language}`} />
              </Layout>
            </PermissionGuard>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;