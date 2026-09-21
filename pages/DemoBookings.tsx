import React, { useCallback, useEffect, useMemo, useState } from 'react';
import FilterButton from '../components/FilterButton';
import RefreshButton from '../components/RefreshButton';
import LoadingSpinner from '../components/LoadingSpinner';
import PaginationControls from '../components/PaginationControls';
import Icon from '../components/Icon';
import LoadingButton from '../components/LoadingButton';
import { NumberInput } from '../components/NumberInput';
import { FormInput, FormSelect, FormTextarea, SettingsSectionHeader, SettingsSectionLayout } from '../components/settings';
import DemoBookingsFilterDrawer, {
  DemoBookingsFilters,
  demoBookingsFilterDefaults,
} from '../components/DemoBookingsFilterDrawer';
import { hasActiveFilters as filtersAreActive } from '../components/filters';
import { useI18n } from '../context/i18n';
import { usePersistedPageSize } from '../hooks/usePersistedPageSize';
import { ADMIN_PAGE_TAB_ACTIVE, ADMIN_PAGE_TAB_INACTIVE } from '../utils/pageTabNavClasses';
import { withLatinDigits } from '../utils/latinNumerals';
import {
  DemoBookingRecord,
  DemoBookingSettings,
  DemoBookingWeeklyDay,
  createDemoBookingBlockedDateAPI,
  deleteDemoBookingBlockedDateAPI,
  getDemoBookingBlockedDatesAPI,
  getDemoBookingSettingsAPI,
  getDemoBookingsAPI,
  patchDemoBookingSettingsAPI,
  updateDemoBookingStatusAPI,
  approveDemoBookingAPI,
  notConfirmDemoBookingAPI,
  deleteDemoBookingAPI,
} from '../services/api';
import { useToast } from '../context/ToastContext';
import DemoBookingStatusCell, {
  DEMO_BOOKING_STATUS_BADGE_CLASS,
} from '../components/DemoBookingStatusCell';

const STATUS_OPTIONS = [
  { value: 'pending', labelKey: 'demoBookings.status.pending', className: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' },
  { value: 'confirmed', labelKey: 'demoBookings.status.confirmed', className: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' },
  { value: 'not_confirmed', labelKey: 'demoBookings.status.not_confirmed', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  { value: 'completed', labelKey: 'demoBookings.status.completed', className: 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100' },
  { value: 'cancelled', labelKey: 'demoBookings.status.cancelled', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  { value: 'no_show', labelKey: 'demoBookings.status.no_show', className: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100' },
] as const;

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const defaultWeeklyHours = (): Record<string, DemoBookingWeeklyDay> => ({
  sunday: { enabled: true, start: '10:00', end: '17:00' },
  monday: { enabled: true, start: '10:00', end: '17:00' },
  tuesday: { enabled: true, start: '10:00', end: '17:00' },
  wednesday: { enabled: true, start: '10:00', end: '17:00' },
  thursday: { enabled: true, start: '10:00', end: '17:00' },
  friday: { enabled: false, start: '10:00', end: '17:00' },
  saturday: { enabled: false, start: '10:00', end: '17:00' },
});

const formatBookingDateTime = (iso: string, timeZone: string, language: string) => {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(
      language === 'ar' ? 'ar-EG' : 'en-GB',
      withLatinDigits({
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: timeZone || 'Asia/Baghdad',
      })
    ).format(d);
  } catch {
    return String(iso).slice(0, 16).replace('T', ' ');
  }
};

type BookingDetailRowProps = {
  icon: string;
  label: string;
  children: React.ReactNode;
  isRtl: boolean;
};

const BookingDetailRow: React.FC<BookingDetailRowProps> = ({ icon, label, children, isRtl: _isRtl }) => (
  <div className="flex gap-3 p-3.5 text-start">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700/80 dark:text-gray-300">
      <Icon name={icon} className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{children}</dd>
    </div>
  </div>
);

const DemoBookings: React.FC = () => {
  const { t, language } = useI18n();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('demoBookings.activeTab') || 'reservations');

  useEffect(() => {
    localStorage.setItem('demoBookings.activeTab', activeTab);
  }, [activeTab]);

  const tabs = [
    { id: 'reservations', label: t('demoBookings.tabs.reservations') },
    { id: 'availability', label: t('demoBookings.tabs.availability') },
  ];

  return (
    <div
      className={`flex flex-col space-y-4 ${
        activeTab === 'availability' ? 'h-[calc(100vh-7rem)] min-h-0' : ''
      }`}
    >
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 shrink-0">
        {t('demoBookings.title')}
      </h1>
      <nav className="flex gap-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm transition-colors ${
              activeTab === tab.id ? ADMIN_PAGE_TAB_ACTIVE : ADMIN_PAGE_TAB_INACTIVE
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {activeTab === 'reservations' ? <ReservationsTab language={language} t={t} showToast={showToast} /> : null}
      {activeTab === 'availability' ? (
        <div className="flex-1 min-h-0 min-w-0">
          <AvailabilityTab t={t} showToast={showToast} />
        </div>
      ) : null}
    </div>
  );
};

const ReservationsTab: React.FC<{
  language: string;
  t: (k: string) => string;
  showToast: (msg: string, opts?: { variant?: 'success' | 'error' | 'info' | 'warning' }) => void;
}> = ({ language, t, showToast }) => {
  const isRtl = language === 'ar';
  const [bookings, setBookings] = useState<DemoBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('admin-demo-bookings');
  const [filters, setFilters] = useState<DemoBookingsFilters>(demoBookingsFilterDefaults);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<DemoBookingRecord | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<DemoBookingRecord | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [pendingDecision, setPendingDecision] = useState<{
    bookingId: number;
    action: 'approve' | 'not_confirm';
  } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [displayTimezone, setDisplayTimezone] = useState('Asia/Baghdad');

  const loadBookings = useCallback(async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await getDemoBookingsAPI({
        page,
        page_size: pageSize,
        search: filters.search.trim() || undefined,
        status: filters.status || undefined,
        from_date: filters.fromDate || undefined,
        to_date: filters.toDate || undefined,
      });
      setTotalCount(res.count || 0);
      setBookings(res.results || []);
    } catch {
      setBookings([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, pageSize]);

  useEffect(() => {
    void getDemoBookingSettingsAPI()
      .then((s) => setDisplayTimezone(s.timezone || 'Asia/Baghdad'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    void loadBookings(currentPage);
  }, [currentPage, filters, pageSize, loadBookings]);

  const statusOptions = useMemo(
    () => STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );

  const filtersActive = useMemo(
    () => filtersAreActive(filters, demoBookingsFilterDefaults),
    [filters],
  );

  const getStatusLabel = (status: string) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status);
    return opt ? t(opt.labelKey) : status;
  };

  const getStatusClass = (status: string) =>
    DEMO_BOOKING_STATUS_BADGE_CLASS[status] || DEMO_BOOKING_STATUS_BADGE_CLASS.pending;

  const isTableStatusEditable = (status: string) => status === 'pending' || status === 'confirmed';

  const getTableStatusOptions = (status: string) => {
    if (status === 'pending') {
      return [
        { value: 'pending', labelKey: 'demoBookings.status.pending' as const },
        { value: 'confirmed', labelKey: 'demoBookings.approve' as const },
        { value: 'not_confirmed', labelKey: 'demoBookings.notConfirm' as const },
      ];
    }
    if (status === 'confirmed') {
      return STATUS_OPTIONS.filter((o) =>
        ['confirmed', 'completed', 'cancelled', 'no_show'].includes(o.value),
      );
    }
    return STATUS_OPTIONS.filter((o) => o.value === status);
  };

  const isRowStatusBusy = (id: number) =>
    updatingId === id || pendingDecision?.bookingId === id;

  const handleTableStatusSelect = async (booking: DemoBookingRecord, nextStatus: string) => {
    if (nextStatus === booking.status) return;
    if (booking.status === 'pending') {
      if (nextStatus === 'confirmed') {
        await handleApprove(booking.id);
      } else if (nextStatus === 'not_confirmed') {
        await handleNotConfirm(booking.id);
      }
      return;
    }
    if (booking.status === 'confirmed') {
      await handleStatusChange(booking.id, nextStatus);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await updateDemoBookingStatusAPI(id, { status });
      await loadBookings(currentPage);
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status: status as DemoBookingRecord['status'] } : null));
      }
      showToast(t('demoBookings.statusUpdated'), { variant: 'success' });
    } catch {
      showToast(t('common.error') || 'Error', { variant: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApprove = async (id: number) => {
    setPendingDecision({ bookingId: id, action: 'approve' });
    try {
      const updated = await approveDemoBookingAPI(id);
      await loadBookings(currentPage);
      setSelected((prev) => (prev?.id === id ? updated : prev));
      showToast(t('demoBookings.approve.success'), { variant: 'success' });
    } catch {
      showToast(t('common.error') || 'Error', { variant: 'error' });
    } finally {
      setPendingDecision(null);
    }
  };

  const handleNotConfirm = async (id: number) => {
    setPendingDecision({ bookingId: id, action: 'not_confirm' });
    try {
      const updated = await notConfirmDemoBookingAPI(id);
      await loadBookings(currentPage);
      setSelected((prev) => (prev?.id === id ? updated : prev));
      showToast(t('demoBookings.notConfirm.success'), { variant: 'success' });
    } catch {
      showToast(t('common.error') || 'Error', { variant: 'error' });
    } finally {
      setPendingDecision(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!bookingToDelete) return;
    const id = bookingToDelete.id;
    setDeletingId(id);
    try {
      await deleteDemoBookingAPI(id);
      setBookingToDelete(null);
      if (selected?.id === id) {
        setSelected(null);
      }
      showToast(t('demoBookings.delete.success'), { variant: 'success' });
      await loadBookings(currentPage);
    } catch {
      showToast(t('common.error') || 'Error', { variant: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className={`flex items-center gap-2 justify-end ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
        <FilterButton onClick={() => setIsFilterDrawerOpen(true)} hasActiveFilters={filtersActive}>
          {t('demoBookings.filters.open')}
        </FilterButton>
        <RefreshButton onClick={() => void loadBookings(currentPage)} loading={loading} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" label={t('common.loading') || 'Loading'} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            {t('demoBookings.noBookings')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3">{t('demoBookings.datetime')}</th>
                  <th className="px-4 py-3">{t('demoBookings.guest')}</th>
                  <th className="px-4 py-3">{t('demoBookings.phone')}</th>
                  <th className="px-4 py-3">{t('demoBookings.email')}</th>
                  <th className="px-4 py-3">{t('demoBookings.company')}</th>
                  <th className="px-4 py-3">{t('demoBookings.status')}</th>
                  <th className="px-4 py-3">{t('tickets.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatBookingDateTime(b.starts_at, displayTimezone, language)}
                    </td>
                    <td className="px-4 py-3">{b.name}</td>
                    <td className="px-4 py-3">
                      <span dir="ltr" className="[unicode-bidi:isolate] inline-block">
                        {b.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3">{b.email}</td>
                    <td className="px-4 py-3">{b.company_name || '—'}</td>
                    <td className="px-4 py-3 align-middle">
                      <DemoBookingStatusCell
                        status={b.status}
                        editable={isTableStatusEditable(b.status)}
                        busy={isRowStatusBusy(b.id)}
                        options={getTableStatusOptions(b.status)}
                        label={getStatusLabel(b.status)}
                        t={t}
                        ariaLabel={`${t('demoBookings.changeStatus')} #${b.id}`}
                        onStatusChange={(next) => void handleTableStatusSelect(b, next)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <button
                          type="button"
                          onClick={() => setSelected(b)}
                          className="inline-flex items-center justify-center p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none"
                          title={t('demoBookings.viewDetails')}
                          aria-label={t('demoBookings.viewDetails')}
                        >
                          <Icon name="eye" className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookingToDelete(b)}
                          disabled={deletingId === b.id}
                          className="inline-flex items-center justify-center p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none disabled:opacity-50"
                          title={t('demoBookings.delete')}
                          aria-label={t('demoBookings.delete')}
                        >
                          <Icon name="trash" className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        disabled={loading}
      />

      <DemoBookingsFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          setIsFilterDrawerOpen(false);
          setCurrentPage(1);
        }}
        onReset={() => {
          setFilters(demoBookingsFilterDefaults);
          setCurrentPage(1);
        }}
        statusOptions={statusOptions}
      />

      {selected ? (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-booking-detail-title"
        >
          <div
            dir={isRtl ? 'rtl' : 'ltr'}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gradient-to-b from-primary-50/80 to-white dark:from-primary-950/30 dark:to-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 text-start">
                  <p className="text-xs font-bold tabular-nums text-primary-700 dark:text-primary-300">
                    #{selected.id}
                  </p>
                  <h2
                    id="demo-booking-detail-title"
                    className="text-lg font-bold text-gray-900 dark:text-white mt-1.5 truncate"
                  >
                    {selected.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{selected.email}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/80 transition-colors"
                    aria-label={t('common.close') || 'Close'}
                  >
                    <Icon name="x" className="w-5 h-5" />
                  </button>
                  <DemoBookingStatusCell
                    align="start"
                    status={selected.status}
                    editable={isTableStatusEditable(selected.status)}
                    busy={isRowStatusBusy(selected.id)}
                    options={getTableStatusOptions(selected.status)}
                    label={getStatusLabel(selected.status)}
                    t={t}
                    ariaLabel={`${t('demoBookings.changeStatus')} #${selected.id}`}
                    onStatusChange={(next) => void handleTableStatusSelect(selected, next)}
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary-200/70 dark:border-primary-800/50 bg-white/80 dark:bg-gray-900/40 px-3 py-2.5">
                <Icon name="clock" className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatBookingDateTime(selected.starts_at, displayTimezone, language)}
                </span>
              </div>
              {selected.status === 'pending' ? (
                <p className="mt-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed text-start">
                  {t('demoBookings.details.pendingHint')}
                </p>
              ) : null}
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
              <dl className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
                <BookingDetailRow icon="user" label={t('demoBookings.guest')} isRtl={isRtl}>
                  {selected.name}
                </BookingDetailRow>
                <BookingDetailRow icon="phone" label={t('demoBookings.phone')} isRtl={isRtl}>
                  <span dir="ltr" className="[unicode-bidi:isolate] inline-block">
                    {selected.phone}
                  </span>
                </BookingDetailRow>
                <BookingDetailRow icon="mail" label={t('demoBookings.email')} isRtl={isRtl}>
                  {selected.email}
                </BookingDetailRow>
                <BookingDetailRow icon="building" label={t('demoBookings.company')} isRtl={isRtl}>
                  {selected.company_name || '—'}
                </BookingDetailRow>
              </dl>

              {selected.notes?.trim() ? (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('demoBookings.notes')}
                  </p>
                  <p className="mt-1.5 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{selected.notes}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {bookingToDelete ? (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex justify-center items-center p-4"
          onClick={() => !deletingId && setBookingToDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-booking-delete-title"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="demo-booking-delete-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('demoBookings.delete.confirmTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('demoBookings.delete.confirmMessage')}</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 truncate">
              #{bookingToDelete.id} — {bookingToDelete.name} ·{' '}
              {formatBookingDateTime(bookingToDelete.starts_at, displayTimezone, language)}
            </p>
            <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={() => setBookingToDelete(null)}
                disabled={!!deletingId}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirm()}
                disabled={!!deletingId}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50"
              >
                {deletingId ? '...' : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

const AvailabilityTab: React.FC<{
  t: (k: string) => string;
  showToast: (msg: string, opts?: { variant?: 'success' | 'error' | 'info' | 'warning' }) => void;
}> = ({ t, showToast }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DemoBookingSettings | null>(null);
  const [blockedDates, setBlockedDates] = useState<{ id: number; date: string; reason: string }[]>([]);
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, blocks] = await Promise.all([
        getDemoBookingSettingsAPI(),
        getDemoBookingBlockedDatesAPI(),
      ]);
      setSettings({
        ...s,
        weekly_hours: { ...defaultWeeklyHours(), ...(s.weekly_hours || {}) },
      });
      setBlockedDates(blocks);
    } catch {
      showToast(t('common.error') || 'Error', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const updateWeekly = (day: string, patch: Partial<DemoBookingWeeklyDay>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const dayCfg = prev.weekly_hours[day] || { enabled: false, start: '10:00', end: '17:00' };
      return {
        ...prev,
        weekly_hours: {
          ...prev.weekly_hours,
          [day]: { ...dayCfg, ...patch },
        },
      };
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await patchDemoBookingSettingsAPI({
        is_enabled: settings.is_enabled,
        timezone: settings.timezone,
        duration_minutes: settings.duration_minutes,
        horizon_days: settings.horizon_days,
        min_notice_hours: settings.min_notice_hours,
        weekly_hours: settings.weekly_hours,
        intro_en: settings.intro_en,
        intro_ar: settings.intro_ar,
      });
      showToast(t('demoBookings.availability.saved'), { variant: 'success' });
    } catch {
      showToast(t('common.error') || 'Error', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddBlocked = async () => {
    if (!newBlockDate) return;
    try {
      await createDemoBookingBlockedDateAPI({ date: newBlockDate, reason: newBlockReason });
      setNewBlockDate('');
      setNewBlockReason('');
      const blocks = await getDemoBookingBlockedDatesAPI();
      setBlockedDates(blocks);
    } catch {
      showToast(t('common.error') || 'Error', { variant: 'error' });
    }
  };

  const handleDeleteBlocked = async (id: number) => {
    try {
      await deleteDemoBookingBlockedDateAPI(id);
      setBlockedDates((prev) => prev.filter((b) => b.id !== id));
    } catch {
      showToast(t('common.error') || 'Error', { variant: 'error' });
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" label={t('common.loading') || 'Loading'} />
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900/40 max-w-3xl h-full flex flex-col min-h-0">
      <SettingsSectionLayout
        header={
          <SettingsSectionHeader
            title={t('demoBookings.tabs.availability')}
            onSave={() => void handleSave()}
            isSaving={saving}
            saveLabel={t('demoBookings.availability.save')}
            savingLabel={t('common.loading')}
          />
        }
      >
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.is_enabled}
          onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {t('demoBookings.availability.enabled')}
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="demo-duration">
            {t('demoBookings.availability.duration')}
          </label>
          <NumberInput
            id="demo-duration"
            min={5}
            max={240}
            step={5}
            value={settings.duration_minutes}
            onChange={(e) => setSettings({ ...settings, duration_minutes: Number(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="demo-timezone">
            {t('demoBookings.availability.timezone')}
          </label>
          <FormInput
            id="demo-timezone"
            type="text"
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="demo-horizon">
            {t('demoBookings.availability.horizon')}
          </label>
          <NumberInput
            id="demo-horizon"
            min={1}
            max={90}
            value={settings.horizon_days}
            onChange={(e) => setSettings({ ...settings, horizon_days: Number(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="demo-min-notice">
            {t('demoBookings.availability.minNotice')}
          </label>
          <NumberInput
            id="demo-min-notice"
            min={0}
            max={168}
            value={settings.min_notice_hours}
            onChange={(e) => setSettings({ ...settings, min_notice_hours: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
          {t('demoBookings.availability.weeklyHours')}
        </h3>
        <div className="space-y-2">
          {WEEKDAY_KEYS.map((day) => {
            const cfg = settings.weekly_hours[day] || { enabled: false, start: '10:00', end: '17:00' };
            return (
              <div
                key={day}
                className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <span className="w-24 text-sm font-medium">{t(`demoBookings.weekday.${day}`)}</span>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={cfg.enabled}
                    onChange={(e) => updateWeekly(day, { enabled: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  {t('demoBookings.availability.dayEnabled')}
                </label>
                <FormInput
                  type="time"
                  value={cfg.start}
                  onChange={(e) => updateWeekly(day, { start: e.target.value })}
                  className="w-auto"
                />
                <span className="text-sm text-gray-500">–</span>
                <FormInput
                  type="time"
                  value={cfg.end}
                  onChange={(e) => updateWeekly(day, { end: e.target.value })}
                  className="w-auto"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="demo-intro-en">
          {t('demoBookings.availability.introEn')}
        </label>
        <FormTextarea
          id="demo-intro-en"
          rows={3}
          dir="ltr"
          value={settings.intro_en}
          onChange={(e) => setSettings({ ...settings, intro_en: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="demo-intro-ar">
          {t('demoBookings.availability.introAr')}
        </label>
        <FormTextarea
          id="demo-intro-ar"
          rows={3}
          dir="rtl"
          value={settings.intro_ar}
          onChange={(e) => setSettings({ ...settings, intro_ar: e.target.value })}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
          {t('demoBookings.availability.blockedDates')}
        </h3>
        <div className="flex flex-wrap gap-2 mb-3 items-end">
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400" htmlFor="demo-block-date">
              {t('demoBookings.availability.blockDate')}
            </label>
            <FormInput
              id="demo-block-date"
              type="date"
              value={newBlockDate}
              onChange={(e) => setNewBlockDate(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400" htmlFor="demo-block-reason">
              {t('demoBookings.availability.blockReason')}
            </label>
            <FormInput
              id="demo-block-reason"
              type="text"
              placeholder={t('demoBookings.availability.blockReason')}
              value={newBlockReason}
              onChange={(e) => setNewBlockReason(e.target.value)}
            />
          </div>
          <LoadingButton type="button" onClick={() => void handleAddBlocked()} disabled={!newBlockDate}>
            {t('demoBookings.availability.addBlocked')}
          </LoadingButton>
        </div>
        <ul className="space-y-2">
          {blockedDates.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-2 p-2 rounded border border-gray-200 dark:border-gray-700 text-sm"
            >
              <span>
                {b.date}
                {b.reason ? ` — ${b.reason}` : ''}
              </span>
              <button
                type="button"
                className="text-red-600 dark:text-red-400 hover:underline"
                onClick={() => void handleDeleteBlocked(b.id)}
              >
                {t('tickets.delete')}
              </button>
            </li>
          ))}
        </ul>
      </div>
      </SettingsSectionLayout>
    </div>
  );
};

export default DemoBookings;
