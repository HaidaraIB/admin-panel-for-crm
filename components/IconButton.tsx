import React from 'react';
import Icon from './Icon';

type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** `Icon` name, e.g. `trash`, `edit`, `view`, `x`. */
  icon: string;
  /** Accessible name and tooltip. Required — icon-only controls have no visible text. */
  label: string;
  /** `danger` for delete/remove, `warning` for reversible risky actions (deactivate, impersonate), `neutral` for view/edit. */
  tone?: 'neutral' | 'danger' | 'warning' | 'primary';
  /** `sm` (32px) in tables and lists, `md` (40px) when inline with form fields. */
  size?: 'sm' | 'md';
};

const toneClasses = {
  neutral: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-400 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white',
  danger: 'text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-red-500 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300',
  warning: 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 focus:ring-amber-500 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300',
  primary: 'text-primary-600 hover:bg-primary-50 focus:ring-primary-500 dark:text-primary-400 dark:hover:bg-primary-900/30',
};

/**
 * Square icon-only action. The standard control for per-row actions
 * (delete a list item, edit/view a table row).
 */
const IconButton: React.FC<IconButtonProps> = ({ icon, label, tone = 'neutral', size = 'sm', type = 'button', className = '', title, ...props }) => (
  <button
    type={type}
    aria-label={label}
    title={title ?? label}
    className={`${size === 'md' ? 'h-10 w-10' : 'h-8 w-8'} inline-flex shrink-0 items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${toneClasses[tone]} ${className}`}
    {...props}
  >
    <Icon name={icon} className="h-4 w-4" />
  </button>
);

export default IconButton;
