import React from 'react';
import Icon from './Icon';
import { useI18n } from '../context/i18n';

type RefreshButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Button label. Defaults to `t('common.refresh')`. Ignored when `iconOnly`. */
  children?: React.ReactNode;
  /** Spins the refresh icon and disables the control. */
  loading?: boolean;
  /** Hide the text label below the `sm` breakpoint (icon stays visible). */
  hideLabelOnMobile?: boolean;
  /** Compact icon-only control (e.g. chat header). */
  iconOnly?: boolean;
};

/**
 * Shared refresh control sized to match `FilterButton` (`h-9`).
 */
const RefreshButton: React.FC<RefreshButtonProps> = ({
  children,
  loading = false,
  hideLabelOnMobile = true,
  iconOnly = false,
  className = '',
  type = 'button',
  title,
  disabled,
  ...props
}) => {
  const { t } = useI18n();
  const label = children ?? t('common.refresh');
  const tooltip = title ?? t('common.refresh');

  if (iconOnly) {
    return (
      <button
        type={type}
        disabled={disabled || loading}
        title={tooltip}
        aria-label={t('common.refresh')}
        aria-busy={loading || undefined}
        className={`inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
        {...props}
      >
        <Icon name="refresh" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      title={tooltip}
      aria-label={t('common.refresh')}
      aria-busy={loading || undefined}
      className={`inline-flex h-9 items-center justify-center gap-1.5 px-3 text-sm font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-gray-900 dark:text-white shadow-sm hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      <Icon name="refresh" className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
      <span className={hideLabelOnMobile ? 'hidden sm:inline' : undefined}>{label}</span>
    </button>
  );
};

export default RefreshButton;
