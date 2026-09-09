import React from 'react';
import { useI18n } from '../../context/i18n';

export type SettingsNavItem = {
  id: string;
  label: string;
};

type SettingsNavProps = {
  items: SettingsNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

/**
 * Desktop: sticky vertical list. Mobile: horizontal scrollable chips.
 */
const SettingsNav: React.FC<SettingsNavProps> = ({ items, activeId, onSelect }) => {
  const { language } = useI18n();
  const isRtl = language === 'ar';

  const itemClass = (id: string, compact: boolean) => {
    const active = activeId === id;
    const base = compact
      ? 'shrink-0 whitespace-nowrap px-3 py-2 rounded-full text-sm font-medium transition-colors'
      : `w-full ${isRtl ? 'text-right' : 'text-left'} px-3 py-2 rounded-md text-sm font-medium transition-colors`;
    return active
      ? `${base} bg-primary-600 text-white dark:bg-primary-700 dark:text-white`
      : `${base} text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700`;
  };

  return (
    <>
      {/* Mobile / tablet chip bar */}
      <nav
        className="md:hidden -mx-1 px-1 overflow-x-auto pb-1"
        aria-label="Settings sections"
      >
        <div className="flex gap-2 min-w-min">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={activeId === item.id ? 'page' : undefined}
              className={itemClass(item.id, true)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop sticky sidebar */}
      <aside className="hidden md:block md:w-1/4 shrink-0 self-stretch">
        <nav
          className="sticky top-0 max-h-full overflow-y-auto space-y-1 pr-1"
          aria-label="Settings sections"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={activeId === item.id ? 'page' : undefined}
              className={itemClass(item.id, false)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default SettingsNav;
