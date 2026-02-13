import React from 'react';
import { useAlert, AlertVariant } from '../context/AlertContext';
import { useI18n } from '../context/i18n';
import Icon from './Icon';

const variantStyles: Record<AlertVariant | 'warning' | 'info', { icon: string; iconBg: string; iconColor: string; titleKey?: string }> = {
  error: {
    icon: 'alert',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    titleKey: 'alert.errorTitle',
  },
  warning: {
    icon: 'alert',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    titleKey: 'alert.warningTitle',
  },
  info: {
    icon: 'info',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    titleKey: 'alert.infoTitle',
  },
  success: {
    icon: 'check',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    titleKey: 'alert.successTitle',
  },
};

interface AlertDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onConfirm?: () => void;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
  disabled?: boolean;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  title: propTitle,
  message: propMessage,
  type: propType,
  onConfirm,
  showCancel = false,
  confirmText,
  cancelText,
  disabled = false,
}) => {
  const { alert, closeAlert } = useAlert();
  const { t, language } = useI18n();

  // If props are provided, use them (new usage)
  // Otherwise, use AlertContext (old usage for backward compatibility)
  const isOpen = propIsOpen !== undefined ? propIsOpen : (alert !== null);
  const onClose = propOnClose || closeAlert;
  const type = propType || alert?.variant || 'info';
  const style = variantStyles[type];
  const defaultTitle = style.titleKey ? t(style.titleKey) : null;
  const title = propTitle || alert?.title || defaultTitle || (type === 'error' ? t('alert.errorTitle') || 'Error' : '');
  const message = (propMessage || alert?.message || '').replace(/^\.\s*/, '').trim();

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (!disabled) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/60 z-[100] flex items-center justify-center p-4"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${style.iconBg} ${style.iconColor}`}>
              <Icon name={style.icon} className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              {title && (
                <h3 id="alert-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {title}
                </h3>
              )}
              <p id="alert-dialog-description" className="text-sm text-gray-600 dark:text-gray-300">
                {message}
              </p>
            </div>
          </div>
          <div className={`flex gap-3 mt-6 ${language === 'ar' ? 'flex-row-reverse' : 'justify-end'}`}>
            {showCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={disabled}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText || t('common.cancel') || 'Cancel'}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={disabled}
              className={`px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                type === 'error' || type === 'warning'
                  ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 disabled:hover:bg-red-600'
                  : type === 'success'
                  ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 disabled:hover:bg-green-600'
                  : 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 disabled:hover:bg-primary-600'
              }`}
            >
              {confirmText || (onConfirm ? (t('common.confirm') || 'Confirm') : (t('common.ok') || 'OK'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;
