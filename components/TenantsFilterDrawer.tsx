import React, { useCallback, useMemo, useState } from 'react';
import { TenantStatus } from '../types';
import { useI18n } from '../context/i18n';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from './filters';

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
  const { t } = useI18n();
  const [localFilters, setLocalFilters] = useState<TenantFilters>(filters);

  const syncDraft = useCallback(() => {
    setLocalFilters(filters);
  }, [filters]);

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
        statuses: exists
          ? prev.statuses.filter((item) => item !== status)
          : [...prev.statuses, status],
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

  const hasPlans = useMemo(() => plans.length > 0, [plans]);

  return (
    <FilterDrawerShell
      isOpen={isOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      subtitle={t('tenants.filters.title')}
      title={t('tenants.title')}
      onReset={handleReset}
      onApply={handleApply}
    >
      <FilterSection title={t('tenants.filters.general')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="tenants-filter-search">{t('tenants.filters.search')}</FilterLabel>
            <FilterInput
              id="tenants-filter-search"
              value={localFilters.search}
              onChange={(event) => updateField('search', event.target.value)}
              placeholder={t('tenants.filters.searchPlaceholder')}
            />
          </div>
          <div>
            <FilterLabel htmlFor="tenants-filter-plan">{t('tenants.filters.plan')}</FilterLabel>
            <FilterSelect
              id="tenants-filter-plan"
              value={localFilters.plan}
              onChange={(event) => updateField('plan', event.target.value)}
            >
              <option value="">{t('tenants.filters.planPlaceholder')}</option>
              {hasPlans &&
                plans.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
            </FilterSelect>
          </div>
        </div>
      </FilterSection>

      <FilterSection title={t('tenants.filters.status')}>
        <div className="grid grid-cols-1 gap-2 pt-2">
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
      </FilterSection>

      <FilterSection title={t('tenants.filters.dates')}>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FilterLabel htmlFor="tenants-filter-start-from">
                {t('tenants.filters.startDateFrom')}
              </FilterLabel>
              <FilterInput
                id="tenants-filter-start-from"
                type="date"
                value={localFilters.startDateFrom}
                onChange={(event) => updateField('startDateFrom', event.target.value)}
              />
            </div>
            <div>
              <FilterLabel htmlFor="tenants-filter-start-to">
                {t('tenants.filters.startDateTo')}
              </FilterLabel>
              <FilterInput
                id="tenants-filter-start-to"
                type="date"
                value={localFilters.startDateTo}
                onChange={(event) => updateField('startDateTo', event.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FilterLabel htmlFor="tenants-filter-end-from">
                {t('tenants.filters.endDateFrom')}
              </FilterLabel>
              <FilterInput
                id="tenants-filter-end-from"
                type="date"
                value={localFilters.endDateFrom}
                onChange={(event) => updateField('endDateFrom', event.target.value)}
              />
            </div>
            <div>
              <FilterLabel htmlFor="tenants-filter-end-to">
                {t('tenants.filters.endDateTo')}
              </FilterLabel>
              <FilterInput
                id="tenants-filter-end-to"
                type="date"
                value={localFilters.endDateTo}
                onChange={(event) => updateField('endDateTo', event.target.value)}
              />
            </div>
          </div>
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};

export default TenantsFilterDrawer;
