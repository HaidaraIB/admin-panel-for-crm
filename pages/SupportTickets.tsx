import React, { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '../components/Icon';
import { useI18n } from '../context/i18n';
import { getSupportTicketsAPI, updateSupportTicketStatusAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'open', labelKey: 'tickets.status.open', className: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100 border-amber-300 dark:border-amber-700' },
  { value: 'in_progress', labelKey: 'tickets.status.in_progress', className: 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100 border-blue-300 dark:border-blue-700' },
  { value: 'closed', labelKey: 'tickets.status.closed', className: 'bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-100 border-green-300 dark:border-green-700' },
] as const;

const SupportTickets: React.FC = () => {
  const { t, language } = useI18n();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<number | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSupportTicketsAPI();
      setTickets(res.results || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setOpenStatusDropdownId(null);
      }
    };
    if (openStatusDropdownId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openStatusDropdownId]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    setUpdatingId(id);
    setOpenStatusDropdownId(null);
    try {
      await updateSupportTicketStatusAPI(id, { status: newStatus });
      await loadTickets();
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusStyle = (status: string) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status) || STATUS_OPTIONS[0];
    return opt.className;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'closed') return t('tickets.status.closed');
    if (status === 'in_progress') return t('tickets.status.in_progress');
    return t('tickets.status.open');
  };

  const isRtl = language === 'ar';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('tickets.title')}
        </h1>
        <button
          type="button"
          onClick={loadTickets}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isRtl ? 'flex-row-reverse' : ''
          } bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50`}
        >
          <Icon name="refresh" className="w-4 h-4" />
          {t('common.refresh') || 'Refresh'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" label={t('common.loading') || 'Loading'} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            {t('tickets.noTickets')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th scope="col" className="px-6 py-3">
                    {t('tickets.company')}
                  </th>
                  <th scope="col" className="px-6 py-3">
                    {t('tickets.sender')}
                  </th>
                  <th scope="col" className="px-6 py-3">
                    {t('tickets.subject')}
                  </th>
                  <th scope="col" className="px-6 py-3">
                    {t('tickets.date')}
                  </th>
                  <th scope="col" className="px-6 py-3">
                    {t('tickets.changeStatus')}
                  </th>
                  <th scope="col" className="px-6 py-3">
                    {t('tickets.actions') || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {ticket.company_name ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                      {ticket.created_by_username ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-900 dark:text-gray-100 max-w-xs truncate">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(ticket)}
                        className="cursor-pointer hover:underline focus:outline-none focus:underline"
                      >
                        {ticket.title}
                      </button>
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {ticket.created_at
                        ? new Date(ticket.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')
                        : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <div
                        className="relative inline-block min-w-[8rem]"
                        ref={openStatusDropdownId === ticket.id ? statusDropdownRef : undefined}
                      >
                        <button
                          type="button"
                          onClick={() => updatingId !== ticket.id && setOpenStatusDropdownId((id) => (id === ticket.id ? null : ticket.id))}
                          disabled={updatingId === ticket.id}
                          className={`inline-flex items-center justify-between gap-1.5 w-full text-sm font-medium rounded border px-2 py-1.5 ${getStatusStyle(ticket.status || 'open')} ${isRtl ? 'flex-row-reverse' : ''} disabled:opacity-60`}
                        >
                          <span>{getStatusLabel(ticket.status || 'open')}</span>
                          <Icon name="chevronDown" className="w-4 h-4 shrink-0" />
                        </button>
                        {openStatusDropdownId === ticket.id && (
                          <ul
                            className="absolute z-10 mt-1 w-full rounded border border-gray-300 dark:border-gray-600 shadow-lg overflow-hidden min-w-[10rem] bg-white dark:bg-gray-700"
                            role="listbox"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <li key={opt.value} role="option">
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(ticket.id, opt.value)}
                                  className="w-full text-left text-sm font-medium px-2 py-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 ${isRtl ? 'text-right' : ''}"
                                >
                                  {t(opt.labelKey)}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(ticket)}
                        className="inline-flex items-center justify-center p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 focus:outline-none"
                        title={t('tickets.viewDetails') || 'View details'}
                        aria-label={t('tickets.viewDetails') || 'View details'}
                      >
                        <Icon name="eye" className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTicket && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTicket(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-detail-title"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start gap-3 flex-shrink-0">
              <h2 id="ticket-detail-title" className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
                {selectedTicket.title}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label={t('common.close') || 'Close'}
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  {t('tickets.description') || 'Description'}
                </h3>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600/50 p-4">
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                    {selectedTicket.description ?? '—'}
                  </p>
                </div>
              </section>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  {t('tickets.details') || 'Details'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 border border-gray-100 dark:border-gray-600/40">
                    <Icon name="building" className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('tickets.company')}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{selectedTicket.company_name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 border border-gray-100 dark:border-gray-600/40">
                    <Icon name="user" className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('tickets.sender')}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{selectedTicket.created_by_username ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 border border-gray-100 dark:border-gray-600/40">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">S</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('tickets.statusLabel') || 'Status'}</p>
                      <span
                        className={`inline-block mt-0.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${
                          selectedTicket.status === 'closed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                            : selectedTicket.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                        }`}
                      >
                        {selectedTicket.status === 'closed'
                          ? t('tickets.status.closed')
                          : selectedTicket.status === 'in_progress'
                          ? t('tickets.status.in_progress')
                          : t('tickets.status.open')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 border border-gray-100 dark:border-gray-600/40">
                    <Icon name="calendar" className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('tickets.date')}</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selectedTicket.created_at
                          ? new Date(selectedTicket.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')
                          : '—'}
                      </p>
                    </div>
                  </div>
                  {selectedTicket.updated_at && (
                    <div className="sm:col-span-2 flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 p-3 border border-gray-100 dark:border-gray-600/40">
                      <Icon name="clock" className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('tickets.updatedAt') || 'Last updated'}</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {new Date(selectedTicket.updated_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
              {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    {t('tickets.screenshots') || 'Screenshots'}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedTicket.attachments.map((att: { id: number; url: string }) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-700/50 hover:opacity-90 focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                      >
                        <img
                          src={att.url}
                          alt=""
                          className="h-24 w-auto object-cover max-w-[180px]"
                        />
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTickets;
