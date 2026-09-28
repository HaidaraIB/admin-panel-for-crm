import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { refreshTokensViaFetch } from '../services/httpClient';

const REALTIME_ENABLED =
  String(import.meta.env.VITE_REALTIME_ENABLED ?? '').toLowerCase() === 'true';

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const HEARTBEAT_MS = 45_000;

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

export type RealtimeFrame = {
  scope?: string;
  version?: number;
  conversation?: number;
};

type FrameListener = (frame: RealtimeFrame) => void;

type OutboundPayload = Record<string, unknown>;

type RealtimeContextValue = {
  connected: boolean;
  subscribe: (listener: FrameListener) => () => void;
  send: (payload: OutboundPayload) => boolean;
};

const noopContext: RealtimeContextValue = {
  connected: false,
  subscribe: () => () => {},
  send: () => false,
};

const RealtimeContext = createContext<RealtimeContextValue>(noopContext);

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}

export function RealtimeProvider({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) {
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef(new Set<FrameListener>());

  const subscribe = useCallback((listener: FrameListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const sendRef = useRef<(payload: OutboundPayload) => boolean>(() => false);

  const send = useCallback((payload: OutboundPayload) => sendRef.current(payload), []);

  const dispatch = useCallback((frame: RealtimeFrame) => {
    listenersRef.current.forEach((listener) => {
      try {
        listener(frame);
      } catch {
        /* listener fault must not kill the socket */
      }
    });
  }, []);

  useEffect(() => {
    if (!enabled || !REALTIME_ENABLED) {
      setConnected(false);
      sendRef.current = () => false;
      return;
    }
    const url = realtimeUrl();
    if (!url) {
      setConnected(false);
      return;
    }

    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let heartbeatTimer: number | undefined;
    let attempt = 0;
    let disposed = false;

    const clearHeartbeat = () => {
      if (heartbeatTimer) window.clearInterval(heartbeatTimer);
      heartbeatTimer = undefined;
    };

    const startHeartbeat = () => {
      clearHeartbeat();
      heartbeatTimer = window.setInterval(() => {
        sendRef.current({ action: 'heartbeat' });
      }, HEARTBEAT_MS);
    };

    const scheduleRetry = () => {
      if (disposed) return;
      const base = Math.min(MAX_BACKOFF_MS, MIN_BACKOFF_MS * 2 ** attempt);
      attempt += 1;
      retryTimer = window.setTimeout(connect, base * (0.5 + Math.random()));
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
        sendRef.current = (payload) => {
          if (!socket || socket.readyState !== WebSocket.OPEN) return false;
          try {
            socket.send(JSON.stringify(payload));
            return true;
          } catch {
            return false;
          }
        };
        setConnected(true);
        startHeartbeat();
      };

      socket.onmessage = (event) => {
        let frame: RealtimeFrame | null = null;
        try {
          frame = JSON.parse(String(event.data)) as RealtimeFrame;
        } catch {
          frame = null;
        }
        if (frame?.scope) {
          dispatch(frame);
        }
      };

      socket.onclose = (event) => {
        clearHeartbeat();
        sendRef.current = () => false;
        setConnected(false);
        if (event.code === 4401) {
          void refreshTokensViaFetch()
            .then(() => {
              if (disposed) return;
              attempt = 0;
              connect();
            })
            .catch(() => {
              scheduleRetry();
            });
          return;
        }
        scheduleRetry();
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      disposed = true;
      clearHeartbeat();
      if (retryTimer) window.clearTimeout(retryTimer);
      sendRef.current = () => false;
      setConnected(false);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [enabled, dispatch]);

  const value = useMemo(
    () => ({ connected, subscribe, send }),
    [connected, subscribe, send]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
