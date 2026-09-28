import { useCallback, useEffect, useState } from 'react';

import { useRealtime } from '../context/RealtimeContext';
import { getSupportChatUnreadCountAPI } from '../services/api';

export const SUPPORT_CHAT_UNREAD_EVENT = 'loop-support-chat-unread';

export function broadcastSupportChatUnread(count: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SUPPORT_CHAT_UNREAD_EVENT, { detail: count }));
}

/** Super-admin sidebar badge; listens for updates from the Support chat page. */
export function useSupportChatUnreadBadge(enabled: boolean): number {
  const [count, setCount] = useState(0);
  const { connected, subscribe } = useRealtime();

  const refresh = useCallback(() => {
    if (!enabled) return;
    void getSupportChatUnreadCountAPI().then((r) => {
      setCount(r.unread_count);
      broadcastSupportChatUnread(r.unread_count);
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    refresh();
    const pollMs = connected ? 120_000 : 25_000;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      refresh();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [enabled, refresh, connected]);

  useEffect(() => {
    if (!enabled) return;
    return subscribe((frame) => {
      if (frame.scope === 'support_inbox') {
        refresh();
      }
    });
  }, [enabled, subscribe, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const onEvent = (e: Event) => {
      const next = (e as CustomEvent<number>).detail;
      if (typeof next === 'number') setCount(next);
    };
    window.addEventListener(SUPPORT_CHAT_UNREAD_EVENT, onEvent);
    return () => window.removeEventListener(SUPPORT_CHAT_UNREAD_EVENT, onEvent);
  }, [enabled]);

  return count;
}
