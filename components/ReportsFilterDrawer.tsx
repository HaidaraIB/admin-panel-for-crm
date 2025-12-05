import React, { useEffect, useState } from 'react';
import Icon from './Icon';
import { useI18n } from '../context/i18n';

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
  const { t, language } = useI18n();
  const [localFilters, setLocalFilters] = useState<ReportsFilters>(filters);

  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters);
    }
  }, [isOpen, filters]);

  if (!isOpen) {
    return null;
  }

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

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    setLocalFilters(reportsFilterDefaults);
    onReset();
  };

  const drawerPositionClasses = language === 'ar' ? 'justify-start' : 'justify-end';
  const drawerBorderClasses = language === 'ar'
    ? 'border-r border-gray-100 dark:border-gray-800'
    : 'border-l border-gray-100 dark:border-gray-800';

  return (
    <div className={`fixed inset-0 z-50 flex ${drawerPositionClasses}`}>
      <div className="flex-1 bg-black/40" onClick={handleClose} />
      <aside
        className={`relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl ${drawerBorderClasses} flex flex-col`}
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              {t('reports.filters.title')}
            </p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('reports.title')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t('reports.filters.description')}
            </p>
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
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('reports.filters.dateRange')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('reports.filter.from')}
                </label>
                <input
                  type="date"
                  value={localFilters.fromDate}
                  onChange={(event) => updateField('fromDate', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('reports.filter.to')}
                </label>
                <input
                  type="date"
                  value={localFilters.toDate}
                  onChange={(event) => updateField('toDate', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
                />
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
            {t('reports.filters.reset')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="w-full rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition"
          >
            {t('reports.filters.apply')}
          </button>
        </div>
      </aside>
    </div>
  );
};

export default ReportsFilterDrawer;


