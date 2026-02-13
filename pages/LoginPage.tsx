
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../context/i18n';
import { useDarkMode } from '../hooks/useDarkMode';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import { loginAPI, getCurrentUserAPI } from '../services/api';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t, language, setLanguage } = useI18n();
  const [colorTheme, toggleTheme] = useDarkMode();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  
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

  const translateLoginError = (errorMessage: string): string => {
    const lowerMessage = errorMessage.toLowerCase();
    
    if (lowerMessage.includes('no active account') || lowerMessage.includes('active account')) {
      return t('login.errorNoActiveAccount') || 'No active account found with the given credentials';
    }
    if (lowerMessage.includes('unable to log in') || lowerMessage.includes('unable to login')) {
      return t('login.errorUnableToLogin') || 'Unable to log in with provided credentials';
    }
    if (lowerMessage.includes('account is inactive') || lowerMessage.includes('inactive')) {
      return t('login.errorAccountInactive') || 'Account is inactive';
    }
    if (lowerMessage.includes('invalid') || lowerMessage.includes('incorrect')) {
      return t('login.errorInvalidCredentials') || 'Invalid username or password';
    }
    
    // Default fallback
    return t('login.invalidCredentials') || 'Invalid username or password';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      // Login and get tokens
      await loginAPI(username, password);
      
      // Get current user data
      const userData = await getCurrentUserAPI();
      
      // Store authentication state
      localStorage.setItem('isAuthenticated', 'true');
      sessionStorage.setItem('isAuthenticated', 'true');
      
      // Call success callback if provided
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error.message || '';
      setError(translateLoginError(errorMessage));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Theme and Language Toggle Buttons */}
      <div className={`absolute top-4 z-10 flex gap-2 ${language === 'ar' ? 'left-4' : 'right-4'}`}>
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          aria-label={`Switch to ${language === 'ar' ? 'English' : 'Arabic'}`}
        >
          <span className="font-bold text-sm">{language === 'ar' ? 'EN' : 'AR'}</span>
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          aria-label={`Switch to ${colorTheme === 'light' ? 'dark' : 'light'} mode`}
        >
          {colorTheme === 'dark' ? <Icon name="moon" className="w-5 h-5" /> : <Icon name="sun" className="w-5 h-5" />}
        </button>
      </div>
      <div className="flex w-full max-w-4xl mx-auto overflow-hidden bg-white rounded-lg shadow-lg dark:bg-gray-800">
        <div className="hidden md:block md:w-1/2 bg-primary-600 p-12 text-white flex flex-col justify-center relative">
           <div className="absolute top-0 left-0 w-full h-full bg-primary-700 opacity-20 transform -skew-y-12"></div>
           <div className="relative z-10">
              <img 
                src="/logo_white.png" 
                alt="Admin Panel Logo" 
                className="h-20 w-auto object-contain mb-6" 
              />
              <p className="mt-4 text-primary-200">
                  {t('login.welcomeMessage')}
              </p>
           </div>
        </div>
        <div className="w-full p-8 md:w-1/2">
            <div className="flex flex-col items-center mb-6">
              <img 
                src="/logo_purple.png" 
                alt="Admin Panel Logo" 
                className="h-12 w-auto object-contain mb-4 md:hidden" 
              />
              <h2 className="text-2xl font-semibold text-center text-gray-700 dark:text-white">
                  {t('login.welcomeBack')}
              </h2>
              <p className="mt-2 text-sm text-center text-gray-600 dark:text-gray-400">
                  {t('login.signInToAccess')}
              </p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm">
                <div>
                <label htmlFor="username" className="sr-only">
                    {t('login.username')}
                </label>
                <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    className="relative block w-full px-3 py-3 text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    placeholder={t('login.username')}
                    value={username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                />
                </div>
                <div className="mt-4 relative">
                <label htmlFor="password-input" className="sr-only">
                    {t('login.password')}
                </label>
                <input
                    id="password-input"
                    name="password"
                    type={passwordVisible ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className={`relative block w-full px-3 py-3 ${language === 'ar' ? 'pl-10' : 'pr-10'} text-gray-900 placeholder-gray-500 bg-gray-50 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white`}
                    dir={language === 'ar' ? 'rtl' : 'ltr'}
                    placeholder={t('login.password')}
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                />
                <button
                    type="button"
                    className={`absolute inset-y-0 ${language === 'ar' ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center z-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none`}
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    aria-label={passwordVisible ? t('login.hidePassword') : t('login.showPassword')}
                    tabIndex={-1}
                >
                    {passwordVisible ? (
                        <Icon name="view" className="w-5 h-5" />
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                    )}
                </button>
                </div>
            </div>

            {error && (
                <p className="text-sm text-center text-red-500">{error}</p>
            )}

            <div>
                <button
                type="submit"
                disabled={isLoading}
                className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white border border-transparent rounded-md group bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400 dark:disabled:bg-primary-800 transition-colors"
                >
                {isLoading ? <LoadingSpinner /> : t('login.signIn')}
                </button>
            </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
