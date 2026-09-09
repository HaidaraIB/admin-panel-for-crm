
import React from 'react';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';

interface LoadingButtonProps {
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  /** `toolbar` matches RefreshButton / FilterButton height (`h-9`). */
  size?: 'sm' | 'md' | 'toolbar';
  icon?: string;
  title?: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  type = 'button',
  onClick,
  disabled = false,
  isLoading = false,
  loadingText,
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  icon,
  title,
}) => {
  const baseClasses = "rounded-lg text-sm font-semibold shadow-sm transition-colors duration-200 inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-60";

  const sizeClasses =
    size === 'sm' ? 'px-3 py-1.5' : size === 'toolbar' ? 'h-9 px-4 py-0' : 'px-5 py-2.5';

  const variantClasses = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 focus:ring-primary-500",
    secondary: "bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 focus:ring-red-500",
  };

  // "Busy" and "unavailable" are different states and deserve different cursors.
  const cursorClass = isLoading ? 'cursor-wait' : disabled ? 'cursor-not-allowed' : '';

  const combinedClasses = `${baseClasses} ${sizeClasses} ${variantClasses[variant]} ${cursorClass} ${className}`;
  const iconSize = size === 'sm' || size === 'toolbar' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={combinedClasses}
      title={title}
      aria-busy={isLoading || undefined}
      aria-label={isLoading && loadingText ? loadingText : undefined}
    >
      {/*
        Replace the label with a centered spinner. The original content stays in
        the layout (opacity-0) so the button does not shrink or jump.
      */}
      <span className="relative inline-flex items-center justify-center">
        <span className={`inline-flex items-center justify-center gap-2${isLoading ? ' opacity-0' : ''}`}>
          {icon && <Icon name={icon} className={iconSize} />}
          {children}
        </span>
        {isLoading ? (
          <span className="absolute inset-0 inline-flex items-center justify-center">
            <LoadingSpinner size="sm" tone={variant === 'primary' || variant === 'danger' ? 'light' : 'default'} presentational />
          </span>
        ) : null}
      </span>
    </button>
  );
};

export default LoadingButton;

