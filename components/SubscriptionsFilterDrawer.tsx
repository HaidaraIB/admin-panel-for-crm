import React, { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../context/i18n';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from './filters';

export interface SubscriptionsFilters {
  search: string;
  status: string;
  fromDate: string;
  toDate: string;
}

export const subscriptionsFilterDefaults: SubscriptionsFilters = {
  search: '',
  status: '',
  fromDate: '',
  toDate: '',
};

interface SubscriptionsFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SubscriptionsFilters;
  onApply: (filters: SubscriptionsFilters) => void;
  onReset: () => void;
  statusOptions: string[];
  showStatus?: boolean;
  showDates?: boolean;
  /** Optional i18n key prefix for status option labels, e.g. `status.` → `status.Active`. */
  statusLabelPrefix?: string;
  /** Map a status value to a display label (overrides statusLabelPrefix). */
  getStatusLabel?: (status: string) => string;
}

const SubscriptionsFilterDrawer: React.FC<SubscriptionsFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
  statusOptions,
  showStatus = true,
  showDates = true,
  statusLabelPrefix = 'status.',
  getStatusLabel,
}) => {
  const { t } = useI18n();
  const [localFilters, setLocalFilters] = useState<SubscriptionsFilters>(filters);

  const syncDraft = useCallback(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleClose = () => {
    setLocalFilters(filters);
    onClose();
  };

  const updateField = (field: keyof SubscriptionsFilters, value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const isInvalidRange = useMemo(() => {
    if (!showDates || !localFilters.fromDate || !localFilters.toDate) return false;
    return localFilters.fromDate > localFilters.toDate;
  }, [showDates, localFilters.fromDate, localFilters.toDate]);

  const handleApply = () => {
    if (isInvalidRange) return;
    onApply(localFilters);
  };

  const handleReset = () => {
    setLocalFilters(subscriptionsFilterDefaults);
    onReset();
  };

  const resolveStatusLabel = (status: string) => {
    if (getStatusLabel) return getStatusLabel(status);
    return t(`${statusLabelPrefix}${status}`);
  };

  return (
    <FilterDrawerShell
      isOpen={isOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      subtitle={t('subscriptions.filters.title')}
      title={t('subscriptions.title')}
      onReset={handleReset}
      onApply={handleApply}
      applyDisabled={isInvalidRange}
    >
      <FilterSection title={t('filters.search')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="subscriptions-filter-search">{t('filters.search')}</FilterLabel>
            <FilterInput
              id="subscriptions-filter-search"
              value={localFilters.search}
              onChange={(event) => updateField('search', event.target.value)}
              placeholder={t('subscriptions.filters.searchPlaceholder')}
            />
          </div>
        </div>
      </FilterSection>

      {showStatus && (
        <FilterSection title={t('filters.status')}>
          <div className="pt-2">
            <FilterLabel htmlFor="subscriptions-filter-status">{t('filters.status')}</FilterLabel>
            <FilterSelect
              id="subscriptions-filter-status"
              value={localFilters.status}
              onChange={(event) => updateField('status', event.target.value)}
            >
              <option value="">{t('filters.all')}</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {resolveStatusLabel(status)}
                </option>
              ))}
            </FilterSelect>
          </div>
        </FilterSection>
      )}

      {showDates && (
        <FilterSection title={t('filters.dateRange')}>
          <div className="space-y-4 pt-2">
            <div>
              <FilterLabel htmlFor="subscriptions-filter-from">{t('filters.from')}</FilterLabel>
              <FilterInput
                id="subscriptions-filter-from"
                type="date"
                value={localFilters.fromDate}
                onChange={(event) => updateField('fromDate', event.target.value)}
              />
            </div>
            <div>
              <FilterLabel htmlFor="subscriptions-filter-to">{t('filters.to')}</FilterLabel>
              <FilterInput
                id="subscriptions-filter-to"
                type="date"
                value={localFilters.toDate}
                onChange={(event) => updateField('toDate', event.target.value)}
              />
            </div>
            {isInvalidRange && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {t('filters.invalidRange')}
              </p>
            )}
          </div>
        </FilterSection>
      )}
    </FilterDrawerShell>
  );
};

export default SubscriptionsFilterDrawer;
