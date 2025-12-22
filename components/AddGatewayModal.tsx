
import React, { useState } from 'react';
import { useI18n } from '../context/i18n';
import Icon from './Icon';

interface AddGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (gateway: { name: string; description: string }) => void;
}

const AddGatewayModal: React.FC<AddGatewayModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      onSave({ name, description });
      setName('');
      setDescription('');
    }
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500";
  const labelClasses = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg transform transition-all" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('paymentGateways.addModal.title')}</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <Icon name="x" className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <label className={labelClasses}>{t('paymentGateways.addModal.name')}</label>
              <div className="grid grid-cols-1 gap-3 mt-2">
                {[
                  { value: 'PayTabs', logo: '/paytabs_logo.png', label: 'PayTabs' },
                  { value: 'Stripe', logo: '/stripe_logo.png', label: 'Stripe' },
                  { value: 'Zain Cash', logo: '/zain_cash_logo.png', label: 'Zain Cash' }
                ].map((gateway) => (
                  <button
                    key={gateway.value}
                    type="button"
                    onClick={() => setName(gateway.value)}
                    className={`flex items-center gap-3 rtl:gap-3 p-4 border-2 rounded-lg transition-all ${
                      name === gateway.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-700 bg-white dark:bg-gray-700'
                    }`}
                  >
                    <img 
                      src={gateway.logo} 
                      alt={gateway.label}
                      className="h-8 w-auto object-contain"
                    />
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
            </div>
            <div>
              <label htmlFor="gatewayDescription" className={labelClasses}>{t('paymentGateways.addModal.description')}</label>
              <textarea 
                id="gatewayDescription" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className={inputClasses} 
                rows={3}
                placeholder={t('paymentGateways.addModal.descriptionPlaceholder')}
              />
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4 rtl:space-x-reverse bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 font-medium">
              {t('common.cancel')}
            </button>
            <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium">
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGatewayModal;
