import React, { useState } from 'react';
import { useI18n } from '../context/i18n';
import Icon from './Icon';

interface AdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: { name: string; email: string }) => void;
}

const AdminUserModal: React.FC<AdminUserModalProps> = ({ isOpen, onClose, onSave }) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email) {
      onSave({ name, email });
      setName('');
      setEmail('');
    }
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500";
  const labelClasses = "block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg transform transition-all" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('settings.admins.modal.addTitle')}</h2>
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <Icon name="x" className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <label htmlFor="adminName" className={labelClasses}>{t('settings.admins.table.name')}</label>
              <input 
                id="adminName" 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className={inputClasses} 
                placeholder={t('settings.admins.modal.namePlaceholder')}
                required 
              />
            </div>
            <div>
              <label htmlFor="adminEmail" className={labelClasses}>{t('settings.admins.table.email')}</label>
              <input 
                id="adminEmail" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className={inputClasses} 
                placeholder={t('settings.admins.modal.emailPlaceholder')}
                required 
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

export default AdminUserModal;