import React, { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../context/i18n';
import {
  getCompaniesAPI,
  sendAdminTenantWhatsAppAPI,
  getAdminTenantWhatsAppMessagesAPI,
} from '../services/api';
import type { Tenant } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

type ChatRow = {
  id: number;
  direction: string;
  body: string;
  created_at: string;
  whatsapp_message_id?: string | null;
};

const TenantWhatsAppChat: React.FC = () => {
  const { t, language } = useI18n();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadTenants = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await getCompaniesAPI();
      const rows = (res.results || []) as Tenant[];
      setTenants(rows);
      if (rows.length && selectedId == null) {
        setSelectedId(rows[0].id);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load companies');
    } finally {
      setLoadingList(false);
    }
  }, [selectedId]);

  const loadMessages = useCallback(async (companyId: number) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await getAdminTenantWhatsAppMessagesAPI(companyId, { page: 1, page_size: 100 });
      setMessages((data.results || []) as ChatRow[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    if (selectedId != null) {
      void loadMessages(selectedId);
    }
  }, [selectedId, loadMessages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!selectedId || !text) return;
    setSending(true);
    setError(null);
    try {
      await sendAdminTenantWhatsAppAPI(selectedId, text);
      setDraft('');
      await loadMessages(selectedId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const selected = tenants.find((x) => x.id === selectedId);

  return (
    <div className="p-6 max-w-5xl mx-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
        {t('tenantWhatsapp.title')}
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{t('tenantWhatsapp.subtitle')}</p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('tenantWhatsapp.selectCompany')}
          </label>
          {loadingList ? (
            <div className="py-2">
              <LoadingSpinner label={t('common.loading') || 'Loading'} />
            </div>
          ) : (
            <select
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              {tenants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.owner_phone ? `(${c.owner_phone})` : ''}
                </option>
              ))}
            </select>
          )}
          {selected && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {t('tenantWhatsapp.ownerPhone')}: {selected.owner_phone || '—'}
            </p>
          )}
        </div>

        <div className="md:col-span-2 flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 min-h-[420px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[480px]">
            {loadingMessages ? (
              <div className="py-2">
                <LoadingSpinner label={t('common.loading') || 'Loading'} />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-500">{t('tenantWhatsapp.noMessages')}</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.direction === 'outbound'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className="text-[10px] opacity-80 mt-1">
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex gap-2">
            <textarea
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm min-h-[44px] max-h-32"
              rows={2}
              value={draft}
              placeholder={t('tenantWhatsapp.messagePlaceholder')}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending || !selectedId}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !draft.trim() || !selectedId}
              className="shrink-0 self-end px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {sending ? '…' : t('tenantWhatsapp.send')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantWhatsAppChat;
