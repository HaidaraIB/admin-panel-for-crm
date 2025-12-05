import React, { useEffect, useMemo, useState } from 'react';
import { TenantStatus } from '../types';
import { useI18n } from '../context/i18n';
import Icon from './Icon';

export interface TenantFilters {
  search: string;
  plan: string;
  statuses: TenantStatus[];
  startDateFrom: string;
  startDateTo: string;
  endDateFrom: string;
  endDateTo: string;
}

export const tenantFilterDefaults: TenantFilters = {
  search: '',
  plan: '',
  statuses: [],
  startDateFrom: '',
  startDateTo: '',
  endDateFrom: '',
  endDateTo: '',
};

interface TenantsFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: TenantFilters;
  onApply: (filters: TenantFilters) => void;
  onReset: () => void;
  plans: string[];
}

const statusOptions = [
  TenantStatus.Active,
  TenantStatus.Trial,
  TenantStatus.Expired,
  TenantStatus.Deactivated,
];

const TenantsFilterDrawer: React.FC<TenantsFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
  plans,
}) => {
  const { t, language } = useI18n();
  const [localFilters, setLocalFilters] = useState<TenantFilters>(filters);

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  const handleClose = () => {
    setLocalFilters(filters);
    onClose();
  };

  const updateField = (field: keyof TenantFilters, value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleStatus = (status: TenantStatus) => {
    setLocalFilters((prev) => {
      const exists = prev.statuses.includes(status);
      return {
        ...prev,
        statuses: exists ? prev.statuses.filter((item) => item !== status) : [...prev.statuses, status],
      };
    });
  };

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    setLocalFilters(tenantFilterDefaults);
    onReset();
  };

  const drawerPositionClasses = language === 'ar'
    ? 'justify-start'
    : 'justify-end';

  const drawerBorderClasses = language === 'ar'
    ? 'border-r border-gray-100 dark:border-gray-800'
    : 'border-l border-gray-100 dark:border-gray-800';

  const hasPlans = useMemo(() => plans.length > 0, [plans]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex ${drawerPositionClasses}`}>
      <div className="flex-1 bg-black/40" onClick={handleClose} />
      <aside
        className={`relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl ${drawerBorderClasses} flex flex-col`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">{t('tenants.filters.title')}</p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('tenants.title')}</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            aria-label="Close filters"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 pb-28">
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('tenants.filters.general')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('tenants.filters.search')}
                </label>
                <input
                  type="text"
                  value={localFilters.search}
                  onChange={(event) => updateField('search', event.target.value)}
                  placeholder={t('tenants.filters.searchPlaceholder')}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('tenants.filters.plan')}
                </label>
                <select
                  value={localFilters.plan}
                  onChange={(event) => updateField('plan', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                >
                  <option value="">{t('tenants.filters.planPlaceholder')}</option>
                  {hasPlans && plans.map((plan) => (
                    <option key={plan} value={plan}>{plan}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('tenants.filters.status')}</h3>
            <div className="grid grid-cols-1 gap-2">
              {statusOptions.map((status) => {
                const isChecked = localFilters.statuses.includes(status);
                return (
                  <label
                    key={status}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                      isChecked
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-600 dark:bg-primary-900/30 dark:text-primary-200'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <span>{t(`status.${status}`)}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStatus(status)}
                      className="accent-primary-600"
                    />
                  </label>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('tenants.filters.dates')}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('tenants.filters.startDateFrom')}
                  </label>
                  <input
                    type="date"
                    value={localFilters.startDateFrom}
                    onChange={(event) => updateField('startDateFrom', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('tenants.filters.startDateTo')}
                  </label>
                  <input
                    type="date"
                    value={localFilters.startDateTo}
                    onChange={(event) => updateField('startDateTo', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('tenants.filters.endDateFrom')}
                  </label>
                  <input
                    type="date"
                    value={localFilters.endDateFrom}
                    onChange={(event) => updateField('endDateFrom', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('tenants.filters.endDateTo')}
                  </label>
                  <input
                    type="date"
                    value={localFilters.endDateTo}
                    onChange={(event) => updateField('endDateTo', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-4 flex flex-col gap-3 sm:flex-row flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            {t('tenants.filters.reset')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="w-full rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition"
          >
            {t('tenants.filters.apply')}
          </button>
        </div>
      </aside>
    </div>
  );
};

export default TenantsFilterDrawer;

