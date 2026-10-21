/**
 * Building blocks for the Telephony console (Loop Cloud PBX platform admin):
 * a modal shell, status badges, error text from coded API refusals, and the
 * catalog-validated form state every console form uses.
 */
import React, { useCallback, useState } from 'react';

import { catalogFieldErrors, serverFieldErrors } from '../../forms';
import { useI18n } from '../../context/i18n';
import { translateAdminApiError } from '../../utils/translateApiError';
import Icon from '../Icon';

export const inputClass =
  'w-full h-10 px-3 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
export const labelClass = 'block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300';
export const thClass = 'px-4 py-3 text-start font-semibold';
export const tdClass = 'px-4 py-3 align-top';

export const ModalShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({
  title,
  onClose,
  children,
  wide,
}) => {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const TONES = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
};

export const Badge: React.FC<{ tone: keyof typeof TONES; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>
);

/** A coded refusal ("same_node", "pbx_unavailable", …) in the UI language, else the server's message. */
export function useApiErrorText() {
  const { t } = useI18n();
  return useCallback(
    (error: unknown) => {
      const code = (error as { code?: string })?.code;
      const key = code ? `telephony.errors.${code}` : '';
      const localized = key ? t(key) : '';
      return localized && localized !== key ? localized : translateAdminApiError(error, t) || t('telephony.errors.generic');
    },
    [t],
  );
}

/** Field errors from the validation catalog (client) and from the API (server) for one form id. */
export function useCatalogForm(formId: string) {
  const { t } = useI18n();
  const errorText = useApiErrorText();
  const translate = useCallback((key: string) => {
    const value = t(key);
    return value && value !== key ? value : undefined;
  }, [t]) as (key: string) => string;
  const [errors, setErrors] = useState<Record<string, string>>({});
  return {
    errors,
    setErrors,
    validate: (values: Record<string, unknown>) => {
      const next = catalogFieldErrors(formId, values, translate);
      setErrors(next);
      return Object.keys(next).length === 0;
    },
    fromServer: (error: unknown) => {
      const mapped = serverFieldErrors(error, formId, translate);
      setErrors(Object.keys(mapped).length ? mapped : { _general: errorText(error) });
    },
  };
}

export const when = (iso: string | null | undefined, language: string) =>
  iso ? new Date(iso).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB', { numberingSystem: 'latn' }) : '—';

/** E.164 numbers keep their leading + in RTL. */
export const Ltr: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span dir="ltr" className={`inline-block ${className}`}>{children}</span>
);
