import React from 'react';

interface ToggleProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Keep the label for screen readers only (e.g. inside a table cell). */
  hideLabel?: boolean;
}

/** Accessible switch (role="switch") with a visible label; RTL-aware knob travel. */
const Toggle: React.FC<ToggleProps> = ({ id, checked, onChange, label, description, disabled, hideLabel }) => (
  <div className={`flex items-start gap-4 ${hideLabel ? 'justify-center' : 'justify-between'}`}>
    <div className={hideLabel ? 'sr-only' : 'min-w-0'}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
        {label}
      </label>
      {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[22px] rtl:-translate-x-[22px]' : 'translate-x-0.5 rtl:-translate-x-0.5'
        }`}
      />
    </button>
  </div>
);

export default Toggle;
