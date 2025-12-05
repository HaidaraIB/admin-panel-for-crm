
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
  icon?: string;
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
  icon,
}) => {
  const baseClasses = "px-6 py-2 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700",
    secondary: "bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700",
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={combinedClasses}
    >
      {isLoading ? (
        <>
          <LoadingSpinner />
          {loadingText && <span>{loadingText}</span>}
        </>
      ) : (
        <>
          {icon && <Icon name={icon} className="w-5 h-5" />}
          {children}
        </>
      )}
    </button>
  );
};

export default LoadingButton;

