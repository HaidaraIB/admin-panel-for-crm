import React, { useEffect, useState } from 'react';
import { useI18n } from '../context/i18n';
import {
  resolveMaintenanceDisplayMessage,
  type MaintenanceRetryResult,
} from '../utils/maintenanceDisplay';

type MaintenanceScreenProps = {
  message: string;
  onRetry: () => Promise<MaintenanceRetryResult>;
};

const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ message, onRetry }) => {
  const { t, language } = useI18n();
  const [theme] = useState<'light' | 'dark'>(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
    return stored === 'dark' ? 'dark' : 'light';
  });
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<{
    variant: 'info' | 'warning' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const displayMessage = resolveMaintenanceDisplayMessage(
    message,
    t('maintenance.description'),
  );

  const handleRetry = async () => {
    setIsChecking(true);
    setFeedback({ variant: 'info', text: t('maintenance.checking') });
    try {
      const result = await onRetry();
      if (result === 'online') {
        return;
      }
      if (result === 'maintenance') {
        setFeedback({ variant: 'warning', text: t('maintenance.stillActive') });
      } else {
        setFeedback({ variant: 'error', text: t('maintenance.checkFailed') });
      }
    } finally {
      setIsChecking(false);
    }
  };

  const feedbackStyles = {
    info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    warning:
      'bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800',
    error: 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
  };

  const isDark = theme === 'dark';

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className={`min-h-screen flex flex-col items-center justify-center px-6 ${
        language === 'ar' ? 'font-arabic' : ''
      } ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isDark ? 'bg-amber-900/40' : 'bg-amber-100'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-8 w-8 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 5a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z"
            />
          </svg>
        </div>
        <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {t('maintenance.title')}
        </h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{displayMessage}</p>

        {feedback ? (
          <p
            role="status"
            aria-live="polite"
            className={`text-sm rounded-lg border px-4 py-3 ${feedbackStyles[feedback.variant]}`}
          >
            {feedback.text}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleRetry()}
          disabled={isChecking}
          aria-busy={isChecking}
          className="w-full px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition-colors inline-flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <>
              <span
                className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin"
                aria-hidden
              />
              <span>{t('maintenance.checking')}</span>
            </>
          ) : (
            t('maintenance.retry')
          )}
        </button>
      </div>
    </div>
  );
};

export default MaintenanceScreen;
