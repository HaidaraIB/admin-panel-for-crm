import { useEffect, useRef, useState } from 'react';

const REALTIME_ENABLED =
  String(import.meta.env.VITE_REALTIME_ENABLED ?? '').toLowerCase() === 'true';

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

function realtimeUrl(): string | null {
  const explicit = import.meta.env.VITE_REALTIME_URL;
  if (explicit && typeof explicit === 'string' && explicit.trim()) {
    return explicit.trim();
  }
  const api = import.meta.env.VITE_API_URL;
  if (!api || typeof api !== 'string') return null;
  try {
    const u = new URL(api);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/ws/sync/';
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

type RealtimeFrame = { scope?: string; version?: number };

/**
 * Super-admin support inbox: version-only frames on scope ``support_inbox``.
 * HTTP stays the source of truth for message bodies.
 */
export function useSupportChatRealtime(
  onSync: () => void,
  enabled = true
): boolean {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !REALTIME_ENABLED) {
      setConnected(false);
      return;
    }
    const url = realtimeUrl();
    if (!url) {
      setConnected(false);
      return;
    }

    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let attempt = 0;
    let disposed = false;

    let bumpTimer: number | undefined;
    const bump = () => {
      if (bumpTimer) window.clearTimeout(bumpTimer);
      bumpTimer = window.setTimeout(() => {
        bumpTimer = undefined;
        if (!disposed) onSyncRef.current();
      }, 400);
    };

    const connect = () => {
      if (disposed) return;
      const token = localStorage.getItem('accessToken');
      if (!token) {
        retryTimer = window.setTimeout(connect, MIN_BACKOFF_MS);
        return;
      }

      try {
        socket = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
      } catch {
        scheduleRetry();
        return;
      }

      socket.onopen = () => {
        if (disposed) return;
        attempt = 0;
        setConnected(true);
        bump();
      };

      socket.onmessage = (event) => {
        let frame: RealtimeFrame | null = null;
        try {
          frame = JSON.parse(String(event.data)) as RealtimeFrame;
        } catch {
          frame = null;
        }
        if (frame?.scope === 'support_inbox') {
          bump();
        }
      };

      socket.onclose = () => {
        setConnected(false);
        scheduleRetry();
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    const scheduleRetry = () => {
      if (disposed) return;
      const base = Math.min(MAX_BACKOFF_MS, MIN_BACKOFF_MS * 2 ** attempt);
      attempt += 1;
      retryTimer = window.setTimeout(connect, base * (0.5 + Math.random()));
    };

    connect();

    return () => {
      disposed = true;
      if (bumpTimer) window.clearTimeout(bumpTimer);
      if (retryTimer) window.clearTimeout(retryTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [enabled]);

  return connected;
}
