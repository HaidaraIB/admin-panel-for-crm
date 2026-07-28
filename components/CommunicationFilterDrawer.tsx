import React, { useCallback, useMemo, useState } from 'react';
import { useI18n } from '../context/i18n';
import {
  FilterDrawerShell,
  FilterSection,
  FilterLabel,
  FilterSelect,
  FilterInput,
} from './filters';

export interface CommunicationFilters {
  search: string;
  status: string;
  type: string;
  fromDate: string;
  toDate: string;
}

export const communicationFilterDefaults: CommunicationFilters = {
  search: '',
  status: '',
  type: '',
  fromDate: '',
  toDate: '',
};

interface CommunicationFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: CommunicationFilters;
  onApply: (filters: CommunicationFilters) => void;
  onReset: () => void;
  statusOptions: { value: string; label: string }[];
}

const CommunicationFilterDrawer: React.FC<CommunicationFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
  statusOptions,
}) => {
  const { t } = useI18n();
  const [localFilters, setLocalFilters] = useState<CommunicationFilters>(filters);

  const syncDraft = useCallback(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleClose = () => {
    setLocalFilters(filters);
    onClose();
  };

  const updateField = (field: keyof CommunicationFilters, value: string) => {
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
    setLocalFilters(communicationFilterDefaults);
    onReset();
  };

  return (
    <FilterDrawerShell
      isOpen={isOpen}
      onClose={handleClose}
      onOpen={syncDraft}
      subtitle={t('communication.filters.title')}
      title={t('communication.title')}
      onReset={handleReset}
      onApply={handleApply}
      applyDisabled={isInvalidRange}
    >
      <FilterSection title={t('filters.search')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="communication-filter-search">{t('filters.search')}</FilterLabel>
            <FilterInput
              id="communication-filter-search"
              value={localFilters.search}
              onChange={(event) => updateField('search', event.target.value)}
              placeholder={t('communication.filters.searchPlaceholder')}
            />
          </div>
        </div>
      </FilterSection>

      <FilterSection title={t('filters.status')}>
        <div className="pt-2">
          <FilterLabel htmlFor="communication-filter-status">{t('filters.status')}</FilterLabel>
          <FilterSelect
            id="communication-filter-status"
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

      <FilterSection title={t('filters.type')}>
        <div className="pt-2">
          <FilterLabel htmlFor="communication-filter-type">{t('filters.type')}</FilterLabel>
          <FilterSelect
            id="communication-filter-type"
            value={localFilters.type}
            onChange={(event) => updateField('type', event.target.value)}
          >
            <option value="">{t('filters.all')}</option>
            <option value="email">{t('communication.new.broadcastType.email') || 'Email'}</option>
            <option value="push">{t('communication.new.broadcastType.push') || 'Push'}</option>
          </FilterSelect>
        </div>
      </FilterSection>

      <FilterSection title={t('filters.dateRange')}>
        <div className="space-y-4 pt-2">
          <div>
            <FilterLabel htmlFor="communication-filter-from">{t('filters.from')}</FilterLabel>
            <FilterInput
              id="communication-filter-from"
              type="date"
              value={localFilters.fromDate}
              onChange={(event) => updateField('fromDate', event.target.value)}
            />
          </div>
          <div>
            <FilterLabel htmlFor="communication-filter-to">{t('filters.to')}</FilterLabel>
            <FilterInput
              id="communication-filter-to"
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

export default CommunicationFilterDrawer;
