import React from 'react';

type SettingsSectionLayoutProps = {
  /** Typically a SettingsSectionHeader, or a custom toolbar (e.g. Limited Admins). */
  header: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Pins `header` at the top of the settings content card while `children`
 * scroll independently — avoids CSS sticky unsticking at the end of long forms.
 */
const SettingsSectionLayout: React.FC<SettingsSectionLayoutProps> = ({ header, children }) => {
  return (
    <div className="flex flex-col min-h-0 flex-1 h-full overflow-hidden">
      {header}
      <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">{children}</div>
    </div>
  );
};

export default SettingsSectionLayout;
