import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'light' | 'muted';
  label?: string;
  className?: string;
  /**
   * Render as decoration only (no role/aria-live). Use inside buttons and other
   * controls that already announce their own busy state, so screen readers
   * don't hear the status twice.
   */
  presentational?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  tone = 'default',
  label = 'Loading',
  className = '',
  presentational = false,
}) => {
  const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6';
  // currentColor lets one spinner sit on primary, danger, light and dark
  // surfaces without extra variants.
  const colorClass =
    tone === 'light'
      ? 'text-white'
      : tone === 'muted'
        ? 'text-gray-400 dark:text-gray-500'
        : 'text-primary-600 dark:text-primary-300';

  return (
    <span
      className={`inline-flex items-center justify-center ${colorClass} ${className}`}
      {...(presentational
        ? { 'aria-hidden': true }
        : { role: 'status', 'aria-live': 'polite' as const, 'aria-label': label })}
    >
      <svg className={`animate-spin ${sizeClass}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
};

export default LoadingSpinner;
