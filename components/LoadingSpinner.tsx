import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'light' | 'muted';
  label?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  tone = 'default',
  label = 'Loading',
  className = '',
}) => {
  const heightClass = size === 'sm' ? 'h-4' : size === 'lg' ? 'h-10' : 'h-6';
  const barClass = size === 'sm' ? 'w-1' : size === 'lg' ? 'w-2' : 'w-1.5';
  const colorClass =
    tone === 'light'
      ? 'text-white/90'
      : tone === 'muted'
        ? 'text-gray-400 dark:text-gray-500'
        : 'text-primary-500';

  return (
    <div
      className={`inline-flex items-center justify-center gap-1 ${heightClass} ${colorClass} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={`${barClass} flex-shrink-0 h-2/3 bg-current rounded-full animate-wave-bars`} style={{ animationDelay: '0s' }} />
      <div className={`${barClass} flex-shrink-0 h-full bg-current rounded-full animate-wave-bars`} style={{ animationDelay: '0.1s' }} />
      <div className={`${barClass} flex-shrink-0 h-2/3 bg-current rounded-full animate-wave-bars`} style={{ animationDelay: '0.2s' }} />
      <div className={`${barClass} flex-shrink-0 h-full bg-current rounded-full animate-wave-bars`} style={{ animationDelay: '0.3s' }} />
      <div className={`${barClass} flex-shrink-0 h-2/3 bg-current rounded-full animate-wave-bars`} style={{ animationDelay: '0.4s' }} />
      <style>{`
        @keyframes waveBars {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
        .animate-wave-bars {
          animation: waveBars 1s infinite ease-in-out;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
