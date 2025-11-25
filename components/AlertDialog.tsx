
import React from 'react';
import Icon from './Icon';
import { useI18n } from '../context/i18n';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
  cancelText?: string;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText,
  onConfirm,
  showCancel = false,
  cancelText,
}) => {
  const { language, t } = useI18n();

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const typeConfig = {
    success: {
      icon: 'check',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      buttonBg: 'bg-primary-600 hover:bg-primary-700',
    },
    error: {
      icon: 'x',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      buttonBg: 'bg-primary-600 hover:bg-primary-700',
    },
    warning: {
      icon: 'alert',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      buttonBg: 'bg-primary-600 hover:bg-primary-700',
    },
    info: {
      icon: 'info',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      buttonBg: 'bg-primary-600 hover:bg-primary-700',
    },
  };

  const config = typeConfig[type];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start">
            <div className={`flex items-center justify-center h-12 w-12 rounded-full ${config.iconBg} flex-shrink-0 ${language === 'ar' ? 'ml-4' : 'mr-4'}`}>
              <Icon name={config.icon as any} className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {message}
              </p>
              <div className={`flex ${language === 'ar' ? 'flex-row-reverse gap-4' : 'gap-3'}`}>
                {showCancel && (
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors"
                  >
                    {cancelText || t('common.cancel')}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className={`flex-1 px-4 py-2 ${config.buttonBg} text-white rounded-md font-medium transition-colors`}
                >
                  {confirmText || t('common.ok')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;

