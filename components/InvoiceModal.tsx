import React from 'react';
import type { BillingBranding, Invoice } from '../types';
import Icon from './Icon';
import InvoiceTemplate from './InvoiceTemplate';
import { useI18n } from '../context/i18n';

interface InvoiceModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  logoUrl: string | null;
  branding?: Partial<BillingBranding> | null;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, isOpen, onClose, logoUrl, branding }) => {
  const { t } = useI18n();
  if (!isOpen || !invoice) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-gray-100 dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[calc(100vh-2rem)] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('invoice.title')}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full text-gray-500 bg-white/80 dark:bg-black/60 hover:bg-gray-200 dark:hover:bg-gray-700 z-10 shadow-sm"
          aria-label={t('common.close') || 'Close'}
        >
          <Icon name="x" className="w-6 h-6" />
        </button>
        <div className="overflow-y-auto overscroll-contain flex-1 min-h-0 p-4 sm:p-6">
          <InvoiceTemplate invoice={invoice} logoUrl={logoUrl} branding={branding} t={t} />
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
