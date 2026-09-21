import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import LoadingSpinner from './LoadingSpinner';

/** Pill select / badge styling aligned with demo booking status colors. */
export const DEMO_BOOKING_STATUS_BADGE_CLASS: Record<string, string> = {
  pending:
    'bg-amber-100 text-amber-900 ring-1 ring-amber-200/90 dark:bg-amber-950/50 dark:text-amber-50 dark:ring-amber-800/70',
  confirmed:
    'bg-blue-100 text-blue-900 ring-1 ring-blue-200/90 dark:bg-blue-950/50 dark:text-blue-50 dark:ring-blue-800/70',
  not_confirmed:
    'bg-slate-100 text-slate-800 ring-1 ring-slate-200/90 dark:bg-slate-800/60 dark:text-slate-100 dark:ring-slate-600/70',
  completed:
    'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/90 dark:bg-emerald-950/45 dark:text-emerald-50 dark:ring-emerald-800/70',
  cancelled:
    'bg-slate-100 text-slate-700 ring-1 ring-slate-200/90 dark:bg-slate-800/50 dark:text-slate-200 dark:ring-slate-600/60',
  no_show:
    'bg-orange-100 text-orange-900 ring-1 ring-orange-200/90 dark:bg-orange-950/45 dark:text-orange-50 dark:ring-orange-800/70',
};

const SELECT_FOCUS_CLASS: Record<string, string> = {
  pending: 'focus-visible:ring-amber-500/40',
  confirmed: 'focus-visible:ring-blue-500/40',
  not_confirmed: 'focus-visible:ring-slate-500/40',
  completed: 'focus-visible:ring-emerald-500/40',
  cancelled: 'focus-visible:ring-slate-500/40',
  no_show: 'focus-visible:ring-orange-500/40',
};

const DEFAULT_BADGE = DEMO_BOOKING_STATUS_BADGE_CLASS.pending;

const pillSizeClass =
  'inline-flex items-center justify-center max-w-[10.5rem] rounded-full px-2 py-0.5 text-[11px] font-semibold leading-snug';

const MENU_MIN_WIDTH = 184;

export type DemoBookingStatusOption = {
  value: string;
  labelKey: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

type DemoBookingStatusCellProps = {
  status: string;
  editable: boolean;
  busy?: boolean;
  options: DemoBookingStatusOption[];
  label: string;
  onStatusChange: (next: string) => void;
  t: (key: string) => string;
  ariaLabel: string;
  /** Table cells center the control; modal/detail rows align to start. */
  align?: 'start' | 'center';
};

const DemoBookingStatusCell: React.FC<DemoBookingStatusCellProps> = ({
  status,
  editable,
  busy = false,
  options,
  label,
  onStatusChange,
  t,
  ariaLabel,
  align = 'center',
}) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const surface = DEMO_BOOKING_STATUS_BADGE_CLASS[status] || DEFAULT_BADGE;
  const focusRing = SELECT_FOCUS_CLASS[status] || SELECT_FOCUS_CLASS.pending;

  const updateMenuPosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, MENU_MIN_WIDTH);
    const containerDir =
      el.closest('[dir]')?.getAttribute('dir') || document.documentElement.getAttribute('dir') || 'ltr';
    const rtl = containerDir === 'rtl';
    let left = rect.left;
    if (rtl) {
      left = rect.right - width;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setMenuPos({
      top: rect.bottom + 4,
      left,
      width,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const alignClass = align === 'start' ? 'inline-flex' : 'inline-flex mx-auto';

  if (!editable) {
    return (
      <span className={`${pillSizeClass} ${surface} ${alignClass}`}>
        <span className="truncate">{label}</span>
      </span>
    );
  }

  const pickOption = (value: string) => {
    setOpen(false);
    if (value !== status) onStatusChange(value);
  };

  const menu =
    open && !busy && menuPos
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 9999,
            }}
            className="rounded-xl border border-gray-200/90 dark:border-gray-600
              bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-lg p-1 flex flex-col gap-0.5"
          >
            {options.map((o) => {
              const itemSurface = DEMO_BOOKING_STATUS_BADGE_CLASS[o.value] || DEFAULT_BADGE;
              const selected = o.value === status;
              return (
                <li key={o.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => pickOption(o.value)}
                    className={`w-full text-start rounded-lg px-2 py-1 text-[11px] font-semibold leading-snug transition-[filter,transform]
                      hover:brightness-[1.06] active:scale-[0.99] ${itemSurface}
                      ${selected ? 'ring-2 ring-primary-500/70 dark:ring-primary-400/60' : ''}`}
                  >
                    {t(o.labelKey)}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <>
      <div className={`relative ${alignClass}`}>
        <button
          ref={buttonRef}
          type="button"
          disabled={busy}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            if (busy) return;
            setOpen((v) => !v);
          }}
          className={`${pillSizeClass} gap-1 ps-2.5 pe-1 shadow-sm transition-[filter,box-shadow]
            hover:brightness-[1.04] disabled:opacity-60 disabled:cursor-not-allowed
            focus:outline-none focus-visible:ring-2 ${surface} ${focusRing}`}
        >
          <span className="truncate">{label}</span>
          {busy ? (
            <LoadingSpinner size="sm" presentational className="!h-3 !w-3 shrink-0" />
          ) : (
            <Icon
              name="chevronDown"
              className={`h-3 w-3 shrink-0 opacity-80 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          )}
        </button>
      </div>
      {menu}
    </>
  );
};

export default DemoBookingStatusCell;
