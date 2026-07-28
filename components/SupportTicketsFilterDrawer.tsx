import React, { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../context/i18n';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from './filters';

export interface SupportTicketsFilters {
  search: string;
  status: string;
  fromDate: string;
  toDate: string;
}

export const supportTicketsFilterDefaults: SupportTicketsFilters = {
  search: '',
  status: '',
  fromDate: '',
  toDate: '',
};

interface SupportTicketsFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SupportTicketsFilters;
  onApply: (filters: SupportTicketsFilters) => void;
  onReset: () => void;
  statusOptions: { value: string; label: string }[];
}

const SupportTicketsFilterDrawer: React.FC<SupportTicketsFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
  statusOptions,
}) => {
  const { t } = useI18n();
  const [localFilters, setLocalFilters] = useState<SupportTicketsFilters>(filters);

  const syncDraft = useCallback(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleClose = () => {
    setLocalFilters(filters);
    onClose();
  };

  const updateField = (field: keyof SupportTicketsFilters, value: string) => {
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
    setLocalFilters(supportTicketsFilterDefaults);
    onReset();
  };

  return (
    <FilterDrawerShell
      isOpen={isOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      subtitle={t('tickets.filters.title')}
      title={t('tickets.title')}
      onReset={handleReset}
      onApply={handleApply}
      applyDisabled={isInvalidRange}
    >
      <FilterSection title={t('filters.search')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="tickets-filter-search">{t('filters.search')}</FilterLabel>
            <FilterInput
              id="tickets-filter-search"
              value={localFilters.search}
              onChange={(event) => updateField('search', event.target.value)}
              placeholder={t('tickets.filters.searchPlaceholder')}
            />
          </div>
        </div>
      </FilterSection>

      <FilterSection title={t('filters.status')}>
        <div className="pt-2">
          <FilterLabel htmlFor="tickets-filter-status">{t('filters.status')}</FilterLabel>
          <FilterSelect
            id="tickets-filter-status"
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
            <FilterLabel htmlFor="tickets-filter-from">{t('filters.from')}</FilterLabel>
            <FilterInput
              id="tickets-filter-from"
              type="date"
              value={localFilters.fromDate}
              onChange={(event) => updateField('fromDate', event.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="tickets-filter-to">{t('filters.to')}</FilterLabel>
            <FilterInput
              id="tickets-filter-to"
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

export default SupportTicketsFilterDrawer;
