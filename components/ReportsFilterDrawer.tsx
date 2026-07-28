import React, { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../context/i18n';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterInput,
} from './filters';

export interface ReportsFilters {
  fromDate: string;
  toDate: string;
}

export const reportsFilterDefaults: ReportsFilters = {
  fromDate: '',
  toDate: '',
};

interface ReportsFilterDrawerProps {
  isOpen: boolean;
  filters: ReportsFilters;
  onClose: () => void;
  onApply: (filters: ReportsFilters) => void;
  onReset: () => void;
}

const ReportsFilterDrawer: React.FC<ReportsFilterDrawerProps> = ({
  isOpen,
  filters,
  onClose,
  onApply,
  onReset,
}) => {
  const { t } = useI18n();
  const [localFilters, setLocalFilters] = useState<ReportsFilters>(filters);

  const syncDraft = useCallback(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleClose = () => {
    setLocalFilters(filters);
    onClose();
  };

  const updateField = (field: keyof ReportsFilters, value: string) => {
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
    setLocalFilters(reportsFilterDefaults);
    onReset();
  };

  return (
    <FilterDrawerShell
      isOpen={isOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      subtitle={t('reports.filters.title')}
      title={t('reports.title')}
      onReset={handleReset}
      onApply={handleApply}
      applyDisabled={isInvalidRange}
    >
      <FilterSection title={t('reports.filters.dateRange')}>
        <div className="space-y-4 pt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('reports.filters.description')}
          </p>
          <div>
            <FilterLabel htmlFor="reports-filter-from">{t('reports.filters.from')}</FilterLabel>
            <FilterInput
              id="reports-filter-from"
              type="date"
              value={localFilters.fromDate}
              onChange={(event) => updateField('fromDate', event.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="reports-filter-to">{t('reports.filters.to')}</FilterLabel>
            <FilterInput
              id="reports-filter-to"
              type="date"
              value={localFilters.toDate}
              onChange={(event) => updateField('toDate', event.target.value)}
            />
          </div>
          {isInvalidRange && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {t('reports.filters.invalidRange')}
            </p>
          )}
        </div>
      </FilterSection>
    </FilterDrawerShell>
  );
};

export default ReportsFilterDrawer;
