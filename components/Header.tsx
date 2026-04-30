
import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { useDarkMode } from '../hooks/useDarkMode';
import { useI18n } from '../context/i18n';
import ResetPasswordModal from './ResetPasswordModal';

interface HeaderProps {
  setIsSidebarOpen: (isOpen: boolean | ((isOpen: boolean) => boolean)) => void;
  onLogoutClick?: () => void;
  isInternetOnline: boolean;
}

const Header: React.FC<HeaderProps> = ({ setIsSidebarOpen, onLogoutClick, isInternetOnline }) => {
  const [colorTheme, toggleTheme] = useDarkMode();
  const { language, setLanguage, t } = useI18n();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center">
            <button
              className="md:hidden p-2 -ml-2 rounded-md text-gray-500 dark:text-gray-400"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Icon name="menu" className="w-6 h-6" />
            </button>
            <div className={`hidden sm:flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${isInternetOnline ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900/40' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/40'}`}>
              <span className={`inline-block h-2 w-2 rounded-full ${isInternetOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{isInternetOnline ? t('connectivity.online') : t('connectivity.offline')}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              aria-label={`Switch to ${language === 'ar' ? 'English' : 'Arabic'}`}
            >
              <span className="font-bold text-sm">{language === 'ar' ? 'EN' : 'AR'}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {colorTheme === 'dark' ? <Icon name="moon" /> : <Icon name="sun" />}
            </button>
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={`flex items-center ${language === 'ar' ? 'space-x-reverse' : ''} gap-2`}>
                <img
                  className="h-8 w-8 rounded-full object-cover"
                  src="https://picsum.photos/100"
                  alt="Your avatar"
                />
                <span className="hidden md:inline text-sm font-medium">{t('header.superAdmin')}</span>
                <Icon name="chevronDown" className="w-4 h-4" />
              </button>
              {isDropdownOpen && (
                  <div className={`absolute ${language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 ring-1 ring-black ring-opacity-5`}>
                      <a
                          href="#"
                          onClick={(e) => {
                              e.preventDefault();
                              setIsPasswordModalOpen(true);
                              setIsDropdownOpen(false);
                          }}
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                          {t('header.changePassword')}
                      </a>
                      {onLogoutClick && (
                          <a
                              href="#"
                              onClick={(e) => {
                                  e.preventDefault();
                                  onLogoutClick();
                                  setIsDropdownOpen(false);
                              }}
                              className="block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                              {t('sidebar.logout')}
                          </a>
                      )}
                  </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <ResetPasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};

export default Header;
