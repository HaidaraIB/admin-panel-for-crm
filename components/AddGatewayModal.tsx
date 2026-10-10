
import React, { useState } from 'react';
import { useI18n } from '../context/i18n';
import { useToast } from '../context/ToastContext';
import { translateAdminApiError } from '../utils/translateApiError';
import { catalogFieldErrors, serverFieldErrors } from '../forms';
import Icon from './Icon';
import LoadingButton from './LoadingButton';

interface AddGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (gateway: { name: string; description: string }) => Promise<void>;
}

const PROVIDER_BY_NAME: Record<string, string> = {
  PayTabs: 'paytabs',
  Stripe: 'stripe',
  'Zain Cash': 'zaincash',
  QiCard: 'qicard',
  FIB: 'fib',
  'Al Qaseh': 'alqaseh',
};

const AddGatewayModal: React.FC<AddGatewayModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useI18n();
  const translate = (key: string) => {
    const value = t(key);
    return value && value !== key ? value : undefined;
  };
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const catalogValues = () => ({
    name,
    provider: PROVIDER_BY_NAME[name] || '',
  });

  const blurField = (field: string) => {
    const next = catalogFieldErrors('payment_gateway.create', catalogValues(), translate);
    setErrors((prev) => {
      const copy = { ...prev };
      if (next[field]) copy[field] = next[field];
      else delete copy[field];
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const next = catalogFieldErrors('payment_gateway.create', catalogValues(), translate);
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSave({ name, description });
      setName('');
      setDescription('');
      setErrors({});
    } catch (err: unknown) {
      const serverErrors = serverFieldErrors(err, 'payment_gateway.create', translate);
      if (Object.keys(serverErrors).length > 0) setErrors((prev) => ({ ...prev, ...serverErrors }));
      else showToast(translateAdminApiError(err, t) || t('paymentGateways.errors.createFailed'), { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500";
  const labelClasses = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg transform transition-all flex flex-col max-h-[90vh] my-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
            <h2 className="text-xl font-semibold">{t('paymentGateways.addModal.title')}</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <Icon name="x" className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-6 overflow-y-auto flex-1 min-h-0">
            <div>
              <label className={labelClasses}>{t('paymentGateways.addModal.name')}</label>
              <div
                className="grid grid-cols-1 gap-3 mt-2"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    blurField('name');
                    blurField('provider');
                  }
                }}
              >
                {[
                  { value: 'PayTabs', logo: '/paytabs_logo.png', label: 'PayTabs' },
                  { value: 'Stripe', logo: '/stripe_logo.png', label: 'Stripe' },
                  { value: 'Zain Cash', logo: '/zain_cash_logo.png', label: 'Zain Cash' },
                  { value: 'QiCard', logo: '/q_card_logo.svg', label: 'QiCard' },
                  { value: 'FIB', logo: null, label: 'FIB (First Iraqi Bank)' },
                  { value: 'Al Qaseh', logo: '/alqaseh_logo.png', label: 'Al Qaseh' }
                ].map((gateway) => (
                  <button
                    key={gateway.value}
                    type="button"
                    onClick={() => {
                      setName(gateway.value);
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.name;
                        delete copy.provider;
                        return copy;
                      });
                    }}
                    className={`flex items-center gap-3 rtl:gap-3 p-4 border-2 rounded-lg transition-all ${
                      name === gateway.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-700 bg-white dark:bg-gray-700'
                    }`}
                  >
                    {gateway.logo ? (
                      <img 
                        src={gateway.logo} 
                        alt={gateway.label}
                        className="h-8 w-auto object-contain"
                      />
                    ) : gateway.value === 'FIB' ? (
                      <span className="text-lg font-bold text-blue-700 dark:text-blue-400">FIB</span>
                    ) : null}
                    <span className="text-lg font-medium text-gray-900 dark:text-white">{gateway.label}</span>
                    {name === gateway.value && (
                      <Icon name="check" className="w-5 h-5 text-primary-600 ml-auto rtl:ml-0 rtl:mr-auto" />
                    )}
                  </button>
                ))}
              </div>
              {!name && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('paymentGateways.addModal.selectGateway')}</p>
              )}
              {(errors.name || errors.provider) && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name || errors.provider}</p>
              )}
              {errors._general && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors._general}</p>}
            </div>
            <div>
              <label htmlFor="gatewayDescription" className={labelClasses}>{t('paymentGateways.addModal.description')}</label>
              <textarea 
                id="gatewayDescription" 
                value={description} 
                onChange={(e) => {
                  setDescription(e.target.value);
                }} 
                className={inputClasses} 
                rows={3}
                placeholder={t('paymentGateways.addModal.descriptionPlaceholder')}
              />
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4 rtl:space-x-reverse bg-gray-50 dark:bg-gray-800/50 rounded-b-lg flex-shrink-0">
            <LoadingButton type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </LoadingButton>
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              loadingText={t('common.saving')}
            >
              {t('common.save')}
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGatewayModal;
