import React from 'react';
import LoadingButton from '../LoadingButton';
import { useI18n } from '../../context/i18n';

type SettingsSectionHeaderProps = {
  title: string;
  description?: string;
  /** When provided, shows a Save Changes control pinned with the title. */
  onSave?: () => void;
  isSaving?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  savingLabel?: string;
  /** Extra actions on the right (e.g. before Save). */
  actions?: React.ReactNode;
};

/**
 * Pinned title bar for a settings section. Lives outside the scroll body
 * (see SettingsSectionLayout) so Save never drifts under long forms.
 */
const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({
  title,
  description,
  onSave,
  isSaving = false,
  saveDisabled = false,
  saveLabel,
  savingLabel,
  actions,
}) => {
  const { t } = useI18n();
  const label = saveLabel ?? t('settings.general.save');
  const loadingText = savingLabel ?? t('settings.general.saving');

  return (
    <div className="shrink-0 px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          ) : null}
        </div>
        {(onSave || actions) && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
            {onSave ? (
              <LoadingButton
                onClick={onSave}
                isLoading={isSaving}
                disabled={saveDisabled}
                loadingText={loadingText}
              >
                {label}
              </LoadingButton>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsSectionHeader;
