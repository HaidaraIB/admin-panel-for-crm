import React from 'react';
import { useI18n } from '../context/i18n';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';

export type SubscriptionDetail = {
  id: number;
  company_name?: string;
  plan_name?: string;
  start_date?: string;
  end_date?: string;
  current_period_start?: string;
  billing_cycle?: string;
  subscription_status?: string;
  pending_plan_name?: string | null;
  is_active?: boolean;
  auto_renew?: boolean;
};

interface SubscriptionViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SubscriptionDetail | null;
  loading?: boolean;
}

const SubscriptionViewModal: React.FC<SubscriptionViewModalProps> = ({
  isOpen,
  onClose,
  subscription,
  loading = false,
}) => {
  const { t, language } = useI18n();
  if (!isOpen) return null;

  const formatDate = (value?: string) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US');
    } catch {
      return value;
    }
  };

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-start sm:text-end">{value}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('subscriptions.subscriptions.viewTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={t('common.close')}
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 min-h-[120px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : !subscription ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
              {t('common.error')}
            </p>
          ) : (
            <>
              {row(t('subscriptions.subscriptions.table.companyName'), subscription.company_name || '—')}
              {row(t('subscriptions.subscriptions.table.plan'), subscription.plan_name || '—')}
              {row(t('subscriptions.subscriptions.table.startDate'), formatDate(subscription.start_date))}
              {row(t('subscriptions.subscriptions.table.endDate'), formatDate(subscription.end_date))}
              {row(
                t('subscriptions.subscriptions.view.billingCycle'),
                subscription.billing_cycle || '—',
              )}
              {row(
                t('subscriptions.subscriptions.view.status'),
                subscription.is_active ? t('status.Active') : t('status.Inactive'),
              )}
              {subscription.pending_plan_name
                ? row(
                    t('subscriptions.subscriptions.view.pendingPlan'),
                    subscription.pending_plan_name,
                  )
                : null}
              {row(
                t('subscriptions.subscriptions.view.autoRenew'),
                subscription.auto_renew ? t('common.yes') : t('common.no'),
              )}
            </>
          )}
        </div>
        <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionViewModal;
