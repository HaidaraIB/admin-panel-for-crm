import React from 'react';
import { useI18n } from '../context/i18n';
import { PAGE_SIZE_OPTIONS } from '../hooks/usePersistedPageSize';
import { getPaginationItems, totalPagesFromCount } from '../utils/pagination';

export interface PaginationControlsProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  disabled?: boolean;
  className?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  className = '',
}) => {
  const { t } = useI18n();
  const totalPages = totalPagesFromCount(totalCount, pageSize);
  const paginationItems = getPaginationItems(currentPage, totalPages);
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  const btnBase =
    'px-3 py-1.5 text-sm font-medium rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const btnSecondary =
    `${btnBase} text-gray-700 bg-white border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700`;
  const btnPrimary =
    `${btnBase} text-white bg-primary-600 border-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:border-primary-600`;

  return (
    <nav
      className={`mt-4 px-2 sm:px-0 flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`.trim()}
      aria-label={t('pagination.pageLabel')}
    >
      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
        {t('pagination.pageLabel')}{' '}
        <span className="font-semibold text-gray-900 dark:text-white">{currentPage}</span>{' '}
        {t('pagination.ofLabel')}{' '}
        <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span>
        {totalCount > 0 && (
          <span className="text-gray-500 dark:text-gray-500">
            {' '}
            ({totalCount})
          </span>
        )}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2" dir="ltr">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100"
            aria-label={t('pagination.perPage')}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {`${size} ${t('pagination.perPage')}`}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={disabled || currentPage === 1}
          className={btnSecondary}
          aria-label={t('pagination.first')}
        >
          &laquo;
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={disabled || !hasPreviousPage}
          className={btnSecondary}
        >
          {t('pagination.previous')}
        </button>
        {paginationItems.map((item, idx) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              disabled={disabled}
              className={item === currentPage ? btnPrimary : btnSecondary}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={disabled || !hasNextPage}
          className={btnSecondary}
        >
          {t('pagination.next')}
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || currentPage === totalPages}
          className={btnSecondary}
          aria-label={t('pagination.last')}
        >
          &raquo;
        </button>
      </div>
    </nav>
  );
};

export default PaginationControls;
