import React, { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../context/i18n';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from './filters';

export interface DemoBookingsFilters {
  search: string;
  status: string;
  fromDate: string;
  toDate: string;
}

export const demoBookingsFilterDefaults: DemoBookingsFilters = {
  search: '',
  status: '',
  fromDate: '',
  toDate: '',
};

interface DemoBookingsFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: DemoBookingsFilters;
  onApply: (filters: DemoBookingsFilters) => void;
  onReset: () => void;
  statusOptions: { value: string; label: string }[];
}

const DemoBookingsFilterDrawer: React.FC<DemoBookingsFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
  statusOptions,
}) => {
  const { t } = useI18n();
  const [localFilters, setLocalFilters] = useState<DemoBookingsFilters>(filters);

  const syncDraft = useCallback(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleClose = () => {
    setLocalFilters(filters);
    onClose();
  };

  const updateField = (field: keyof DemoBookingsFilters, value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const isInvalidRange = useMemo(() => {
    if (!localFilters.fromDate || !localFilters.toDate) return false;
    return localFilters.fromDate > localFilters.toDate;
  }, [localFilters.fromDate, localFilters.toDate]);

  const handleApply = () => {
    if (isInvalidRange) return;
    onApply(localFilters);
  };

  const handleReset = () => {
    setLocalFilters(demoBookingsFilterDefaults);
    onReset();
  };

  return (
    <FilterDrawerShell
      isOpen={isOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      subtitle={t('demoBookings.filters.title')}
      title={t('demoBookings.title')}
      onReset={handleReset}
      onApply={handleApply}
      applyDisabled={isInvalidRange}
    >
      <FilterSection title={t('filters.search')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="demo-filter-search">{t('filters.search')}</FilterLabel>
            <FilterInput
              id="demo-filter-search"
              value={localFilters.search}
              onChange={(event) => updateField('search', event.target.value)}
              placeholder={t('demoBookings.filters.searchPlaceholder')}
            />
          </div>
        </div>
      </FilterSection>

      <FilterSection title={t('filters.status')}>
        <div className="pt-2">
          <FilterLabel htmlFor="demo-filter-status">{t('filters.status')}</FilterLabel>
          <FilterSelect
            id="demo-filter-status"
            value={localFilters.status}
            onChange={(event) => updateField('status', event.target.value)}
          >
            <option value="">{t('filters.all')}</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterSelect>
        </div>
      </FilterSection>

      <FilterSection title={t('filters.dateRange')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="demo-filter-from">{t('filters.from')}</FilterLabel>
            <FilterInput
              id="demo-filter-from"
              type="date"
              value={localFilters.fromDate}
              onChange={(event) => updateField('fromDate', event.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="demo-filter-to">{t('filters.to')}</FilterLabel>
            <FilterInput
              id="demo-filter-to"
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
    </FilterDrawerShell>
  );
};

export default DemoBookingsFilterDrawer;
