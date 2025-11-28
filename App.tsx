
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import Subscriptions from './pages/Subscriptions';
import Reports from './pages/Reports';
import Communication from './pages/Communication';
import SystemSettings from './pages/SystemSettings';
import LoginPage from './pages/LoginPage';
import PaymentGateways from './pages/PaymentGateways';
import { Page, Tenant, TenantStatus } from './types';
import { useAuditLog } from './context/AuditLogContext';
import { useI18n } from './context/i18n';
import FullPageLoader from './components/FullPageLoader';
import { getCompaniesAPI, getSubscriptionsAPI, getPlansAPI, createCompanyAPI, updateCompanyAPI, deleteCompanyAPI } from './services/api';

const App: React.FC = () => {
  const { language, t } = useI18n();
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const hasToken = localStorage.getItem('accessToken');
    const sessionAuth = sessionStorage.getItem('isAuthenticated') === 'true';
    return !!(hasToken || sessionAuth);
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const { addLog } = useAuditLog();
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Fetch tenants from API
  useEffect(() => {
    if (isAuthenticated) {
      loadTenants();
    }
  }, [isAuthenticated]);

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
      const subscriptions = subscriptionsResponse.results || [];
      const plans = plansResponse.results || [];

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
          const plan = plans.find((p: any) => p.id === subscription.plan);
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
          created_at: company.created_at,
          updated_at: company.updated_at,
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
      // If Forbidden or Unauthorized, user might not be super admin or token expired
      const errorMessage = error.message || '';
      if (errorMessage.includes('Forbidden') || errorMessage.includes('403') || 
          errorMessage.includes('Session expired') || errorMessage.includes('401') ||
          errorMessage.includes('Unauthorized')) {
        // Clear auth and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('isAuthenticated');
        setIsAuthenticated(false);
        setActivePage('Login');
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
  };

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  const handleSaveTenant = async (newTenant: Omit<Tenant, 'id'>) => {
    try {
      // Use API field names: name, domain, specialization
      const companyData = {
        name: newTenant.name,
        domain: newTenant.domain.replace('.platform.com', ''), // Remove domain suffix if present
        specialization: newTenant.specialization || 'real_estate',
      };

      const createdCompany = await createCompanyAPI(companyData);
      addLog('audit.log.tenantCreated', { companyName: newTenant.name });
      
      // Reload tenants to get updated list
      await loadTenants();
      setActivePage('Tenants');
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      alert(error.message || 'Failed to create tenant');
    }
  };
  
  const handleUpdateTenant = async (updatedTenant: Tenant) => {
    try {
      // Use API field names: name, domain, specialization
      const companyData = {
        name: updatedTenant.name,
        domain: updatedTenant.domain.replace('.platform.com', ''), // Remove domain suffix if present
        specialization: updatedTenant.specialization || 'real_estate',
      };

      await updateCompanyAPI(updatedTenant.id, companyData);
      addLog('audit.log.tenantUpdated', { companyName: updatedTenant.name });
      
      // Reload tenants to get updated list
      await loadTenants();
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      alert(error.message || 'Failed to update tenant');
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard':
        return <Dashboard key={language} />;
      case 'Tenants':
        return <Tenants key={language} tenants={tenants} setActivePage={setActivePage} onUpdateTenant={handleUpdateTenant} isLoading={isLoadingTenants} onRefresh={loadTenants} />;
      case 'Subscriptions':
        return <Subscriptions key={language} tenants={tenants} />;
      case 'PaymentGateways':
        return <PaymentGateways key={language} />;
      case 'Reports':
        return <Reports key={language} />;
      case 'Communication':
        return <Communication key={language} />;
      case 'Settings':
        return <SystemSettings key={language} />;
      default:
        return <Dashboard key={language} />;
    }
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onLogout={handleLogout}
        onLogoutClick={() => setIsLogoutConfirmOpen(true)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header setIsSidebarOpen={setIsSidebarOpen} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 relative">
          {isPageLoading && <FullPageLoader />}
          <div className={isPageLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}>
            {renderPage()}
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

export default App;