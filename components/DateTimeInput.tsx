import React from 'react';
import { FormInput } from './settings/FormFields';
import IconButton from './IconButton';
import { useI18n } from '../context/i18n';
import { fromLocalInputValue, toLocalInputValue } from '../utils/datetime';

interface DateTimeInputProps {
  id: string;
  /** ISO UTC or null. */
  value: string | null | undefined;
  onChange: (iso: string | null) => void;
  onBlur?: () => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}

/** Local date+time picker that reads/writes ISO UTC, with a clear control. */
const DateTimeInput: React.FC<DateTimeInputProps> = ({ id, value, onChange, onBlur, invalid, describedBy, disabled }) => {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1">
      <FormInput
        id={id}
        type="datetime-local"
        dir="ltr"
        value={toLocalInputValue(value)}
        onChange={(e) => onChange(fromLocalInputValue(e.target.value))}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
      />
      {value && !disabled && (
        <IconButton icon="x" size="md" label={t('common.clear')} onClick={() => onChange(null)} />
      )}
    </div>
  );
};

export default DateTimeInput;
