import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../context/i18n';
import {
  getCompaniesAPI,
  sendAdminTenantWhatsAppAPI,
  getAdminTenantWhatsAppMessagesAPI,
  type ApiError,
} from '../services/api';
import type { Tenant } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import RefreshButton from '../components/RefreshButton';
import { withLatinDigits } from '../utils/latinNumerals';
import {
  WhatsAppFormattedText,
  WhatsAppFormatToolbar,
  applyWhatsAppFormatToInput,
  textLooksWhatsAppFormatted,
  type WhatsAppFormatKind,
} from '../utils/whatsappFormatting';

type ChatRow = {
  id: number;
  direction: string;
  body: string;
  created_at: string;
  whatsapp_message_id?: string | null;
};

function formatSendError(e: unknown, fallback: string): string {
  const err = e as ApiError;
  if (err?.code === 'platform_whatsapp_not_configured') {
    return 'Platform WhatsApp is not configured. Open Settings → Platform WhatsApp.';
  }
  if (err?.code === 'owner_phone_missing') {
    return 'Company owner has no phone number.';
  }
  if (err?.details && typeof err.details === 'object') {
    const d = err.details as Record<string, unknown>;
    if (d.error === 'platform_whatsapp_token_invalid' || err.code === 'whatsapp_send_failed') {
      const msg = typeof d.message === 'string' ? d.message : null;
      if (msg) return msg;
      if (d.error === 'platform_whatsapp_token_invalid') {
        return 'Platform WhatsApp access token is invalid. Paste a Meta System User token in Settings → Platform WhatsApp.';
      }
      const graph = d.error;
      if (graph && typeof graph === 'object') {
        const ge = graph as { message?: string };
        if (ge.message) return ge.message;
      }
    }
  }
  if (err?.message) return err.message;
  return fallback;
}

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
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

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

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMessages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!selectedId || !text || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendAdminTenantWhatsAppAPI(selectedId, text);
      setDraft('');
      if (composerRef.current) {
        composerRef.current.style.height = 'auto';
      }
      await loadMessages(selectedId);
    } catch (e: unknown) {
      setError(formatSendError(e, 'Send failed'));
    } finally {
      setSending(false);
    }
  };

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const selected = tenants.find((x) => x.id === selectedId);
  const canSend = Boolean(selectedId && draft.trim() && !sending);

  return (
    <div className="p-6 max-w-5xl mx-auto" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
        {t('tenantWhatsapp.title')}
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('tenantWhatsapp.subtitle')}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
        {t('tenantWhatsapp.setupHint')}{' '}
        <Link to="/settings" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
          Settings
        </Link>
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('tenantWhatsapp.selectCompany')}
          </label>
          {loadingList ? (
            <div className="py-2">
              <LoadingSpinner label={t('common.loading') || 'Loading'} />
            </div>
          ) : (
            <select
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-900/60 px-3 py-2.5">
              <Icon name="phone" className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t('tenantWhatsapp.ownerPhone')}
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {selected.owner_phone || '—'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2 flex flex-col border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 min-h-[460px] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {selected?.name || t('tenantWhatsapp.selectCompany')}
              </p>
              {selected?.owner_phone ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selected.owner_phone}</p>
              ) : null}
            </div>
            <RefreshButton
              iconOnly
              disabled={selectedId == null}
              loading={loadingMessages}
              onClick={() => selectedId != null && void loadMessages(selectedId)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px] bg-gray-50/40 dark:bg-gray-900/20">
            {loadingMessages && messages.length === 0 ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner label={t('common.loading') || 'Loading'} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="mb-3 rounded-full bg-primary-100 dark:bg-primary-900/40 p-3 text-primary-600 dark:text-primary-300">
                  <Icon name="communication" className="w-6 h-6" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                  {t('tenantWhatsapp.noMessages')}
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                      m.direction === 'outbound'
                        ? 'bg-primary-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-bl-md'
                    }`}
                  >
                    <WhatsAppFormattedText
                      text={m.body}
                      as="div"
                      className="whitespace-pre-wrap break-words"
                    />
                    <div className="text-[10px] opacity-80 mt-1.5">
                      {new Date(m.created_at).toLocaleString(
                        undefined,
                        withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' })
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={threadEndRef} />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800 space-y-1.5">
            <WhatsAppFormatToolbar
              disabled={sending || !selectedId}
              onFormat={(kind: WhatsAppFormatKind) =>
                applyWhatsAppFormatToInput(composerRef.current, draft, kind, setDraft)
              }
            />
            <div className="flex items-end gap-2">
              <textarea
                ref={composerRef}
                className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3.5 py-2.5 text-sm leading-5 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px] max-h-28"
                rows={1}
                value={draft}
                placeholder={t('tenantWhatsapp.messagePlaceholder')}
                onChange={(e) => {
                  setDraft(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
                }}
                onKeyDown={onComposerKeyDown}
                disabled={sending || !selectedId}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!canSend}
                aria-label={t('tenantWhatsapp.send')}
                title={t('tenantWhatsapp.send')}
                className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Icon name="send" className="w-5 h-5 rotate-90 rtl:-rotate-90" />
                )}
              </button>
            </div>
            {textLooksWhatsAppFormatted(draft) && (
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1.5">
                <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">Preview</p>
                <WhatsAppFormattedText
                  text={draft}
                  as="div"
                  className="text-sm whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100"
                />
              </div>
            )}
            <p className="text-[11px] text-gray-400 dark:text-gray-500 px-0.5">
              Format: *bold* _italic_ ~strike~ ```code``` · Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantWhatsAppChat;
