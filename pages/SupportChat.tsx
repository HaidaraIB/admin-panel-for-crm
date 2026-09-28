import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useI18n } from '../context/i18n';
import { useUser } from '../context/UserContext';
import { usePolling } from '../hooks/usePolling';
import { useRealtime } from '../context/RealtimeContext';
import { useSupportChatRealtime } from '../hooks/useSupportChatRealtime';
import { broadcastSupportChatUnread } from '../hooks/useSupportChatUnread';
import Icon from '../components/Icon';
import LoadingSpinner from '../components/LoadingSpinner';
import RefreshButton from '../components/RefreshButton';
import { ChatMediaViewer } from '../components/chat/ChatMediaViewer';
import { buildChatMediaAlbum, findChatMediaAlbumIndex, type ChatMediaAlbumItem } from '../components/chat/chatMediaAlbum';
import { SupportChatComposer } from '../components/supportChat/SupportChatComposer';
import { SupportChatMessageMedia } from '../components/supportChat/SupportChatMessageMedia';
import { withLatinDigits } from '../utils/latinNumerals';
import {
  getSupportChatInboxAPI,
  getSupportChatMessagesAPI,
  getSupportChatUnreadCountAPI,
  markSupportChatAdminReadAPI,
  reopenSupportChatConversationAPI,
  resolveSupportChatConversationAPI,
  sendSupportChatAdminMessageAPI,
  sendSupportChatAdminMessageWithFileAPI,
  type SupportChatAdminMessage,
  type SupportChatInboxItem,
} from '../services/api';

type InboxFilter = 'all' | 'open' | 'awaiting' | 'resolved';

function companyInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatMessageTime(iso: string, language: string): string {
  try {
    return new Date(iso).toLocaleString(
      language === 'ar' ? 'ar' : undefined,
      withLatinDigits({ dateStyle: 'medium', timeStyle: 'short' })
    );
  } catch {
    return iso;
  }
}

const THREAD_NEAR_BOTTOM_PX = 80;

function isNearThreadBottom(scroller: HTMLElement): boolean {
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < THREAD_NEAR_BOTTOM_PX;
}

const filterChipClass = (active: boolean) =>
  `inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
    active
      ? 'bg-primary-600 text-white shadow-sm'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
  }`;

type StatusKind = 'open' | 'awaiting' | 'resolved';

const STATUS_TONE: Record<StatusKind, { active: string; idle: string }> = {
  open: {
    active: 'bg-emerald-600 text-white ring-emerald-600 shadow-sm shadow-emerald-600/20',
    idle: 'bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800 dark:hover:bg-emerald-900/50',
  },
  awaiting: {
    active: 'bg-amber-500 text-white ring-amber-500 shadow-sm shadow-amber-500/25',
    idle: 'bg-amber-50 text-amber-950 ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800 dark:hover:bg-amber-900/40',
  },
  resolved: {
    active: 'bg-sky-600 text-white ring-sky-600 shadow-sm shadow-sky-600/20',
    idle: 'bg-sky-50 text-sky-900 ring-sky-200 hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-100 dark:ring-sky-800 dark:hover:bg-sky-900/40',
  },
};

function statusKindOf(status: string, awaitingReply: boolean): StatusKind {
  if (status === 'resolved') return 'resolved';
  if (awaitingReply) return 'awaiting';
  return 'open';
}

function StatusMark({ kind, active = false }: { kind: StatusKind; active?: boolean }) {
  if (kind === 'resolved') {
    return <Icon name="check" className={`h-3 w-3 shrink-0 ${active ? 'text-white' : 'text-sky-600 dark:text-sky-300'}`} />;
  }
  if (kind === 'awaiting') {
    return <Icon name="clock" className={`h-3 w-3 shrink-0 ${active ? 'text-white' : 'text-amber-600 dark:text-amber-300'}`} />;
  }
  return (
    <span
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-white' : 'bg-emerald-500'}`}
      aria-hidden
    />
  );
}

function quoteLabel(
  quote: NonNullable<SupportChatAdminMessage['reply_to']>,
  t: (key: string) => string
): string {
  const cap = (quote.body || '').trim();
  let label = '';
  if (quote.attachment_kind === 'image') label = t('supportChat.mediaPhoto');
  else if (quote.attachment_kind === 'video') label = t('supportChat.mediaVideo');
  else if (quote.attachment_kind === 'audio') label = t('supportChat.mediaAudio');
  else if (quote.attachment_kind === 'document') label = t('supportChat.mediaDocument');
  if (label && cap) return `${label}: ${cap}`;
  if (cap) return cap;
  return label;
}

const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_SLOP_PX = 24;

function MessageReplyGesture({
  label,
  onReply,
  children,
}: {
  label: string;
  onReply: () => void;
  children: React.ReactNode;
}) {
  const lastTap = useRef({ t: 0, x: 0, y: 0 });

  return (
    <div
      className="max-w-[85%] touch-manipulation"
      onPointerUp={(e) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button, a, video, audio, input')) return;
        const now = performance.now();
        const prev = lastTap.current;
        const dt = now - prev.t;
        const dist = Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
        if (dt > 40 && dt < DOUBLE_TAP_MS && dist < DOUBLE_TAP_SLOP_PX) {
          lastTap.current = { t: 0, x: 0, y: 0 };
          onReply();
          return;
        }
        lastTap.current = { t: now, x: e.clientX, y: e.clientY };
      }}
    >
      {children}
      <button type="button" className="sr-only" aria-label={label} onClick={onReply}>
        {label}
      </button>
    </div>
  );
}

function StatusBadge({ kind, label }: { kind: StatusKind; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 ring-1 ${STATUS_TONE[kind].idle}`}>
      <StatusMark kind={kind} />
      {label}
    </span>
  );
}

const SupportChat: React.FC = () => {
  const { t, language } = useI18n();
  const { isSuperAdmin, loading: userLoading } = useUser();
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportChatAdminMessage[]>([]);
  const [replyTo, setReplyTo] = useState<SupportChatAdminMessage | null>(null);
  const [msgEtag, setMsgEtag] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [unreadBadge, setUnreadBadge] = useState(0);
  const [showJumpFab, setShowJumpFab] = useState(false);
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const replyWasOpenRef = useRef(false);
  const threadHeightRef = useRef(0);
  const pinnedToBottomRef = useRef(true);
  const lastTailIdRef = useRef<number | null>(null);
  const snappedConversationRef = useRef<number | null>(null);
  const ignoreScrollUntilRef = useRef(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(id);
  }, [searchInput]);
  const [mediaViewer, setMediaViewer] = useState<{
    items: ChatMediaAlbumItem[];
    index: number;
  } | null>(null);

  const mediaAlbum = useMemo(
    () =>
      buildChatMediaAlbum(
        messages.map((m) => ({
          id: m.id,
          kind: m.attachment_kind,
          url: m.attachment_url,
          filename: m.original_filename,
        }))
      ),
    [messages]
  );

  const openMediaForMessage = (message: SupportChatAdminMessage) => {
    if (!message.attachment_url) return;
    if (message.attachment_kind !== 'image' && message.attachment_kind !== 'video') return;
    setMediaViewer({
      items: mediaAlbum,
      index: findChatMediaAlbumIndex(mediaAlbum, String(message.id)),
    });
  };

  const inboxFetcher = useCallback(
    (etag: string | null) =>
      getSupportChatInboxAPI(
        { search: debouncedSearch || undefined, status: filter === 'all' ? 'all' : filter },
        etag
      ),
    [filter, debouncedSearch]
  );

  const inboxResetKey = `${filter}|${debouncedSearch}`;

  const refreshUnread = useCallback(() => {
    void getSupportChatUnreadCountAPI().then((r) => {
      setUnreadBadge(r.unread_count);
      broadcastSupportChatUnread(r.unread_count);
    });
  }, []);

  const loadMessages = useCallback(
    async (opts?: { background?: boolean }) => {
      if (!selectedId) return;
      if (!opts?.background) setLoadingMessages(true);
      try {
        const res = await getSupportChatMessagesAPI(selectedId, msgEtag);
        if (res.etag) setMsgEtag(res.etag);
        if (!res.notModified && res.data) {
          setMessages(res.data.results);
          const lastTenant = [...res.data.results].reverse().find((m) => m.side === 'tenant');
          if (lastTenant) {
            void markSupportChatAdminReadAPI(selectedId, lastTenant.id);
          }
        }
      } finally {
        if (!opts?.background) setLoadingMessages(false);
      }
    },
    [selectedId, msgEtag]
  );

  const refreshInboxRef = useRef<() => void | Promise<void>>(() => {});

  const syncFromServer = useCallback(() => {
    void refreshInboxRef.current();
    refreshUnread();
    void loadMessages({ background: true });
  }, [refreshUnread, loadMessages]);

  const realtimeConnected = useSupportChatRealtime(syncFromServer, isSuperAdmin());
  const { send: realtimeSend } = useRealtime();

  const { data: inboxPage, loading: inboxLoading, refresh: refreshInbox } = usePolling(
    inboxFetcher,
    false,
    true,
    inboxResetKey
  );
  refreshInboxRef.current = refreshInbox;

  const inboxItems: SupportChatInboxItem[] = inboxPage?.results ?? [];

  const selected = useMemo(
    () => inboxItems.find((c) => c.id === selectedId) ?? null,
    [inboxItems, selectedId]
  );

  useEffect(() => {
    if (selectedId != null && !inboxItems.some((row) => row.id === selectedId)) {
      setSelectedId(null);
    }
  }, [inboxItems, selectedId]);

  useEffect(() => {
    setMsgEtag(null);
    setMessages([]);
    pinnedToBottomRef.current = true;
    lastTailIdRef.current = null;
    snappedConversationRef.current = null;
    setShowJumpFab(false);
    if (selectedId) void loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload thread only when selection changes
  }, [selectedId]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    if (!selectedId || !isSuperAdmin()) return;
    realtimeSend({ action: 'subscribe', kind: 'support', conversation: selectedId });
    return () => {
      realtimeSend({ action: 'unsubscribe', kind: 'support', conversation: selectedId });
    };
  }, [selectedId, isSuperAdmin, realtimeSend]);

  useEffect(() => {
    if (realtimeConnected) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      syncFromServer();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [realtimeConnected, syncFromServer]);

  const scrollThreadToBottom = () => {
    const sc = threadScrollRef.current;
    if (!sc) return;
    ignoreScrollUntilRef.current = performance.now() + 200;
    sc.scrollTop = sc.scrollHeight;
    pinnedToBottomRef.current = true;
    setShowJumpFab(false);
  };

  useLayoutEffect(() => {
    const sc = threadScrollRef.current;
    if (!sc || !selectedId || messages.length === 0) {
      if (!selectedId) lastTailIdRef.current = null;
      return;
    }
    const last = messages[messages.length - 1];
    const opening = snappedConversationRef.current !== selectedId;
    const prevTail = lastTailIdRef.current;
    lastTailIdRef.current = last.id;

    if (opening) {
      snappedConversationRef.current = selectedId;
      pinnedToBottomRef.current = true;
      scrollThreadToBottom();
      const frame = requestAnimationFrame(() => scrollThreadToBottom());
      return () => cancelAnimationFrame(frame);
    }

    if (last.id === prevTail) return;
    const shouldFollow =
      pinnedToBottomRef.current || isNearThreadBottom(sc) || last.is_mine;
    if (!shouldFollow) return;
    scrollThreadToBottom();
  }, [messages, selectedId]);

  useEffect(() => {
    const sc = threadScrollRef.current;
    if (!sc || !selectedId) return;
    const inner = sc.firstElementChild;
    if (!inner) return;
    const observer = new ResizeObserver(() => {
      if (!pinnedToBottomRef.current) return;
      sc.scrollTop = sc.scrollHeight;
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, [selectedId, messages.length]);

  useEffect(() => {
    const sc = threadScrollRef.current;
    if (!sc) return;
    const onScroll = () => {
      if (performance.now() < ignoreScrollUntilRef.current) return;
      const near = isNearThreadBottom(sc);
      pinnedToBottomRef.current = near;
      setShowJumpFab(!near);
    };
    sc.addEventListener('scroll', onScroll, { passive: true });
    return () => sc.removeEventListener('scroll', onScroll);
  }, [selectedId, messages.length]);

  useEffect(() => {
    setReplyTo(null);
  }, [selectedId]);

  useLayoutEffect(() => {
    const sc = threadScrollRef.current;
    if (!sc) return;
    const prevHeight = threadHeightRef.current;
    const nextHeight = sc.clientHeight;
    const replyOpen = replyTo != null;
    if (replyOpen && !replyWasOpenRef.current && prevHeight > nextHeight) {
      sc.scrollTop += prevHeight - nextHeight;
    }
    replyWasOpenRef.current = replyOpen;
    threadHeightRef.current = sc.clientHeight;
  }, [replyTo]);

  const handleComposerSend = async (payload: { body: string; file?: File }) => {
    if (!selectedId) return;
    const body = payload.body.trim();
    if (!body && !payload.file) return;
    const replyToMessageId = replyTo?.id;
    setSending(true);
    try {
      if (payload.file) {
        await sendSupportChatAdminMessageWithFileAPI(selectedId, payload.file, {
          body: body || undefined,
          replyToMessageId,
        });
      } else {
        await sendSupportChatAdminMessageAPI(selectedId, body, { replyToMessageId });
      }
      setReplyTo(null);
      setMsgEtag(null);
      await loadMessages();
      refreshInbox();
    } finally {
      setSending(false);
    }
  };

  const toggleResolved = async () => {
    if (!selectedId || !selected) return;
    if (selected.status === 'resolved') {
      await reopenSupportChatConversationAPI(selectedId);
    } else {
      await resolveSupportChatConversationAPI(selectedId);
    }
    refreshInbox();
  };

  const showMobileThread = selectedId != null;

  if (userLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <LoadingSpinner label={t('common.loading')} />
      </div>
    );
  }

  if (!isSuperAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  const threadPanel = (
    <>
      {!selected ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="rounded-full bg-primary-100 p-4 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
            <Icon name="communication" className="h-8 w-8" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{t('supportChat.selectThread')}</p>
        </div>
      ) : (
        <>
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/80 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                className="md:hidden -ms-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={() => setSelectedId(null)}
                aria-label={t('supportChat.backToList')}
              >
                <Icon name="arrow-left" className="h-5 w-5 rtl:rotate-180" />
              </button>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-sm font-bold text-white"
                aria-hidden
              >
                {companyInitials(selected.company_name)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-gray-900 dark:text-white">{selected.company_name}</p>
                  <StatusBadge
                    kind={statusKindOf(selected.status, selected.awaiting_reply)}
                    label={
                      selected.status === 'resolved'
                        ? t('supportChat.statusResolved')
                        : selected.awaiting_reply
                          ? t('supportChat.awaiting')
                          : t('supportChat.statusOpen')
                    }
                  />
                </div>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {selected.owner_name} · {selected.owner_email}
                </p>
                <Link
                  to="/tenants"
                  className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  {t('supportChat.viewTenant')}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton
                iconOnly
                loading={loadingMessages}
                onClick={() => void loadMessages()}
              />
              <button
                type="button"
                onClick={() => void toggleResolved()}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {selected.status === 'resolved' ? t('supportChat.reopen') : t('supportChat.resolve')}
              </button>
            </div>
          </header>

          <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={threadScrollRef}
            className="custom-scrollbar flex-1 overflow-y-auto bg-gray-50/50 p-4 dark:bg-gray-900/20"
          >
            {loadingMessages && messages.length === 0 ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner label={t('common.loading')} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">{t('supportChat.noMessages')}</p>
              </div>
            ) : (
              <div className="mx-auto flex max-w-2xl flex-col gap-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.is_mine ? 'justify-end' : 'justify-start'}`}>
                    <MessageReplyGesture
                      label={t('supportChat.reply')}
                      onReply={() => setReplyTo(m)}
                    >
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                        m.is_mine
                          ? 'rounded-br-md bg-primary-600 text-white'
                          : 'rounded-bl-md border border-gray-100 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100'
                      }`}
                    >
                      {!m.is_mine && m.display_name ? (
                        <p className="mb-1 text-xs font-semibold opacity-90">{m.display_name}</p>
                      ) : null}
                      {m.reply_to ? (
                        <div
                          className={`mb-2 rounded-lg border-s-2 ps-2 text-xs ${
                            m.is_mine ? 'border-white/70' : 'border-primary-500'
                          }`}
                        >
                          <p className="font-semibold">{m.reply_to.display_name}</p>
                          <p className="truncate opacity-90">{quoteLabel(m.reply_to, t)}</p>
                        </div>
                      ) : null}
                      {m.attachment_url && m.attachment_kind && m.attachment_kind !== 'document' ? (
                        <SupportChatMessageMedia
                          url={m.attachment_url}
                          kind={m.attachment_kind as 'image' | 'video' | 'audio'}
                          mine={m.is_mine}
                          filename={m.original_filename}
                          onOpen={
                            m.attachment_kind === 'image' || m.attachment_kind === 'video'
                              ? () => openMediaForMessage(m)
                              : undefined
                          }
                        />
                      ) : null}
                      {m.attachment_kind === 'document' && m.attachment_url ? (
                        <SupportChatMessageMedia
                          url={m.attachment_url}
                          kind="document"
                          mine={m.is_mine}
                          filename={m.original_filename}
                        />
                      ) : null}
                      {m.body?.trim() ? (
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      ) : null}
                      <div
                        className={`mt-1.5 flex items-center gap-1.5 text-[10px] ${
                          m.is_mine ? 'justify-end text-white/80' : 'justify-start text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <span>{formatMessageTime(m.created_at, language)}</span>
                        {m.is_mine ? (
                          <span
                            className={`inline-flex shrink-0 items-center ${
                              m.read_by_peer ? 'text-sky-200' : 'text-white/60'
                            }`}
                            title={m.read_by_peer ? t('supportChat.read') : t('supportChat.delivered')}
                            aria-label={m.read_by_peer ? t('supportChat.read') : t('supportChat.delivered')}
                          >
                            <Icon name="check" className="h-3.5 w-3.5" />
                            {m.read_by_peer ? <Icon name="check" className="-ms-2 h-3.5 w-3.5" /> : null}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    </MessageReplyGesture>
                  </div>
                ))}
              </div>
            )}
          </div>
          {showJumpFab ? (
            <button
              type="button"
              onClick={scrollThreadToBottom}
              className="absolute bottom-4 end-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 dark:bg-primary-500"
              aria-label={t('supportChat.jumpToLatest')}
              title={t('supportChat.jumpToLatest')}
            >
              <Icon name="chevronDown" className="h-5 w-5" />
            </button>
          ) : null}
          </div>

          <footer className="border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="mx-auto max-w-2xl">
              <SupportChatComposer
                sending={sending}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                onSend={handleComposerSend}
              />
            </div>
          </footer>
        </>
      )}
    </>
  );

  return (
    <>
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 md:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
            {t('supportChat.title')}
            {unreadBadge > 0 ? (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                {unreadBadge}
              </span>
            ) : null}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t('supportChat.subtitle')}</p>
        </div>
        <RefreshButton loading={inboxLoading} onClick={() => refreshInbox()} />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <aside
          className={`flex w-full flex-col border-gray-200 dark:border-gray-700 md:w-80 md:shrink-0 md:border-e ${
            showMobileThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="space-y-3 border-b border-gray-200 p-3 dark:border-gray-700">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('supportChat.search')}
              className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-400"
            />
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'open', 'awaiting', 'resolved'] as InboxFilter[]).map((f) => {
                const active = filter === f;
                if (f === 'all') {
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={filterChipClass(active)}
                    >
                      {t(`supportChat.filter.${f}`)}
                    </button>
                  );
                }
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors ${
                      active ? STATUS_TONE[f].active : STATUS_TONE[f].idle
                    }`}
                  >
                    <StatusMark kind={f} active={active} />
                    {t(`supportChat.filter.${f}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto">
            {inboxLoading && inboxItems.length === 0 ? (
              <div className="flex justify-center p-8">
                <LoadingSpinner label={t('common.loading')} />
              </div>
            ) : inboxItems.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">{t('supportChat.emptyInbox')}</p>
            ) : (
              inboxItems.map((row) => {
                const active = selectedId === row.id;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full border-b border-gray-100 px-3 py-3 text-start transition-colors hover:bg-gray-50 dark:border-gray-700/80 dark:hover:bg-gray-700/40 ${
                      active ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                          active
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-100'
                        }`}
                      >
                        {companyInitials(row.company_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {row.company_name}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            <StatusBadge
                              kind={statusKindOf(row.status, row.awaiting_reply)}
                              label={
                                row.status === 'resolved'
                                  ? t('supportChat.statusResolved')
                                  : row.awaiting_reply
                                    ? t('supportChat.awaiting')
                                    : t('supportChat.statusOpen')
                              }
                            />
                            {row.last_message_at ? (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {formatMessageTime(row.last_message_at, language).split(',')[0]}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-xs text-gray-500 dark:text-gray-400">
                            {row.last_message_preview || '—'}
                          </p>
                          {row.support_unread_count > 0 ? (
                            <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {row.support_unread_count}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main
          className={`min-w-0 flex-1 flex-col ${
            showMobileThread ? 'flex' : 'hidden md:flex'
          }`}
        >
          {threadPanel}
        </main>
      </div>
    </div>
    {mediaViewer ? (
      <ChatMediaViewer
        items={mediaViewer.items}
        initialIndex={mediaViewer.index}
        onClose={() => setMediaViewer(null)}
        t={t}
      />
    ) : null}
    </>
  );
};

export default SupportChat;
