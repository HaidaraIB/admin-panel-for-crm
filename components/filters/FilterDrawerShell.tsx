import React, { useEffect, useRef } from 'react';
import { useI18n } from '../../context/i18n';
import Icon from '../Icon';

export type FilterDrawerShellProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Optional eyebrow above the title. */
  subtitle?: string;
  onReset: () => void;
  onApply: () => void;
  children: React.ReactNode;
  /** Called when the drawer opens (e.g. sync draft from committed filters). */
  onOpen?: () => void;
  /** Disable Apply (e.g. invalid date range). */
  applyDisabled?: boolean;
};

/**
 * Shared slide-over shell for admin filter drawers.
 * Close without Apply discards drafts (caller resets local state via onClose/onOpen sync).
 */
export const FilterDrawerShell = ({
  isOpen,
  onClose,
  title,
  subtitle,
  onReset,
  onApply,
  children,
  onOpen,
  applyDisabled = false,
}: FilterDrawerShellProps) => {
  const { t } = useI18n();
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      onOpen?.();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, onOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      <aside
        className={`fixed inset-y-0 end-0 z-50 flex h-full w-full max-w-md flex-col bg-white dark:bg-gray-900 border-s border-gray-100 dark:border-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-gray-800 h-auto min-h-16 flex-shrink-0 gap-4">
          <div>
            {subtitle ? (
              <p className="text-xs uppercase tracking-wide text-gray-400">{subtitle}</p>
            ) : null}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            aria-label={t('common.close')}
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 divide-y divide-gray-100 dark:divide-gray-800 pb-28">
          {children}
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-4 flex flex-col gap-3 sm:flex-row flex-shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            {t('filters.reset')}
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={applyDisabled}
            className="w-full rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('filters.apply')}
          </button>
        </div>
      </aside>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          aria-hidden="true"
          onClick={onClose}
        />
      )}
    </>
  );
};
