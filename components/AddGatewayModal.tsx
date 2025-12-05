
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
              <label htmlFor="gatewayName" className={labelClasses}>{t('paymentGateways.addModal.name')}</label>
              <input 
                id="gatewayName" 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className={inputClasses} 
                placeholder={t('paymentGateways.addModal.namePlaceholder')}
                required 
              />
              <p className="text-xs text-gray-500 mt-1">{t('paymentGateways.addModal.nameHint')}</p>
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
