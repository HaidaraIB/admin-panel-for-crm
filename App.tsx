
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
import { getCompaniesAPI, getSubscriptionsAPI, createCompanyAPI, updateCompanyAPI, deleteCompanyAPI } from './services/api';

const App: React.FC = () => {
  const { language } = useI18n();
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
      // Fetch companies and subscriptions
      const [companiesResponse, subscriptionsResponse] = await Promise.all([
        getCompaniesAPI(),
        getSubscriptionsAPI()
      ]);

      const companies = companiesResponse.results || [];
      const subscriptions = subscriptionsResponse.results || [];

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
          : 'N/A';
        const startDate = subscription?.start_date
          ? new Date(subscription.start_date).toISOString().split('T')[0]
          : company.created_at ? new Date(company.created_at).toISOString().split('T')[0] : 'N/A';

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

        return {
          id: company.id,
          companyName: company.name, // API field: name
          subdomain: company.domain || `${company.name.toLowerCase().replace(/\s+/g, '')}.platform.com`, // API field: domain
          currentPlan: subscription?.plan_name || '', // From subscription relation - will be translated in component
          status: status,
          startDate: startDate,
          endDate: endDate,
          users: '0/0', // TODO: Get actual user count from API
        };
      });

      setTenants(mappedTenants);
    } catch (error: any) {
      console.error('Error loading tenants:', error);
      // If Forbidden, user might not be super admin or token expired
      if (error.message && (error.message.includes('Forbidden') || error.message.includes('403'))) {
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
        name: newTenant.companyName, // API expects 'name'
        domain: newTenant.subdomain.replace('.platform.com', ''), // Remove domain suffix if present
        specialization: 'real_estate', // Default, can be made configurable
      };

      const createdCompany = await createCompanyAPI(companyData);
      addLog('audit.log.tenantCreated', { companyName: newTenant.companyName });
      
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
        name: updatedTenant.companyName, // API expects 'name'
        domain: updatedTenant.subdomain.replace('.platform.com', ''), // Remove domain suffix if present
        specialization: 'real_estate', // Default, can be made configurable
      };

      await updateCompanyAPI(updatedTenant.id, companyData);
      addLog('audit.log.tenantUpdated', { companyName: updatedTenant.companyName });
      
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
    </div>
  );
};

export default App;