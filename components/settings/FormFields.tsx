import React, { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useI18n } from '../../context/i18n';

/** Shared settings-page field tokens (matches General / Integrations, not filter drawers). */
export const SETTINGS_FIELD_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed';

export const FormInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { className?: string }
>(({ className = '', dir, ...rest }, ref) => {
  const { language } = useI18n();
  return (
    <input
      ref={ref}
      dir={dir ?? (language === 'ar' ? 'rtl' : 'ltr')}
      className={`${SETTINGS_FIELD_CLASS} ${className}`.trim()}
      {...rest}
    />
  );
});
FormInput.displayName = 'FormInput';

export const FormTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
>(({ className = '', dir, ...rest }, ref) => {
  const { language } = useI18n();
  return (
    <textarea
      ref={ref}
      dir={dir ?? (language === 'ar' ? 'rtl' : 'ltr')}
      className={`${SETTINGS_FIELD_CLASS} ${className}`.trim()}
      {...rest}
    />
  );
});
FormTextarea.displayName = 'FormTextarea';

export const FormSelect = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { className?: string }
>(({ className = '', dir, children, ...rest }, ref) => {
  const { language } = useI18n();
  return (
    <select
      ref={ref}
      dir={dir ?? (language === 'ar' ? 'rtl' : 'ltr')}
      className={`${SETTINGS_FIELD_CLASS} ${className}`.trim()}
      {...rest}
    >
      {children}
    </select>
  );
});
FormSelect.displayName = 'FormSelect';
