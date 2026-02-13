import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { useI18n } from '../context/i18n';
import { useDarkMode } from '../hooks/useDarkMode';
import { useUser } from '../context/UserContext';

type PermissionKey = 'can_view_dashboard' | 'can_manage_tenants' | 'can_manage_subscriptions' | 'can_manage_payment_gateways' | 'can_view_reports' | 'can_manage_communication' | 'can_manage_settings';

interface SidebarProps {
  activePage: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, isSidebarOpen, setIsSidebarOpen }) => {
  const { t, language } = useI18n();
  const { hasPermission, isSuperAdmin } = useUser();
  const [colorTheme] = useDarkMode();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const canAccess = (permission: PermissionKey) => isSuperAdmin() || hasPermission(permission);

  const allMenuItems: { path: string; labelKey: string; icon: string; permission: PermissionKey }[] = [
    { path: '/dashboard', labelKey: 'sidebar.dashboard', icon: 'dashboard', permission: 'can_view_dashboard' },
    { path: '/tenants', labelKey: 'sidebar.tenants', icon: 'tenants', permission: 'can_manage_tenants' },
    { path: '/subscriptions', labelKey: 'sidebar.subscriptions', icon: 'subscriptions', permission: 'can_manage_subscriptions' },
    { path: '/payment-gateways', labelKey: 'sidebar.paymentGateways', icon: 'cash', permission: 'can_manage_payment_gateways' },
    { path: '/reports', labelKey: 'sidebar.reports', icon: 'reports', permission: 'can_view_reports' },
    { path: '/communication', labelKey: 'sidebar.communication', icon: 'communication', permission: 'can_manage_communication' },
  ];

  const menuItems = allMenuItems.filter((item) => canAccess(item.permission));
  const canAccessSettings = canAccess('can_manage_settings');
  
  // Monitor dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    // Check immediately
    checkDarkMode();
    
    // Watch for class changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, [colorTheme]);
  
  // Get logo path based on theme
  const logoPath = isDarkMode ? '/logo_dark.png' : '/logo.png';

  const sidebarBaseClasses = "flex-shrink-0 w-64 bg-white dark:bg-gray-900 flex flex-col fixed md:relative inset-y-0 z-40 transform transition-transform duration-300 ease-in-out";
  const languageSpecificClasses = language === 'ar' 
    ? 'border-l border-gray-200 dark:border-gray-800 right-0' 
    : 'border-r border-gray-200 dark:border-gray-800 left-0';
  
  const mobileTransformClass = language === 'ar'
    ? (isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0')
    : (isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0');

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      ></div>

      <div className={`${sidebarBaseClasses} ${languageSpecificClasses} ${mobileTransformClass}`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <img 
              src={logoPath} 
              alt="Admin Panel Logo" 
              className="h-10 w-auto object-contain" 
            />
          </div>
          <button
            className="md:hidden p-2 rounded-md text-gray-500 dark:text-gray-400"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <Icon name="x" className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 font-medium rounded-md transition-colors duration-150 ${
                    isActive
                      ? 'bg-primary-600 text-white dark:bg-primary-700 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`
                }
              >
                <Icon name={item.icon} className={`w-5 h-5 ${language === 'ar' ? 'ml-3' : 'mr-3'}`} />
                {t(item.labelKey)}
              </NavLink>
            );
          })}
        </nav>
        {canAccessSettings && (
          <div className="px-4 py-6 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <NavLink
              to="/settings"
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-4 py-2 font-medium rounded-md transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary-600 text-white dark:bg-primary-700 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <Icon name="settings" className={`w-5 h-5 ${language === 'ar' ? 'ml-3' : 'mr-3'}`} />
              {t('sidebar.settings')}
            </NavLink>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;