import React from 'react';
import { Invoice } from '../types';
import Icon from './Icon';
import InvoiceTemplate from './InvoiceTemplate';
import { useI18n } from '../context/i18n';

interface InvoiceModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  logoUrl: string | null;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, isOpen, onClose, logoUrl }) => {
  const { t } = useI18n();
  if (!isOpen || !invoice) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-gray-100 dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl transform transition-all relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-gray-500 bg-white/50 dark:bg-black/50 hover:bg-gray-200 dark:hover:bg-gray-700 z-10">
            <Icon name="x" className="w-6 h-6" />
        </button>
        <div className="p-4 sm:p-6">
          <InvoiceTemplate invoice={invoice} logoUrl={logoUrl} t={t} />
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
