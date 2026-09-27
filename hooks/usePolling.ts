import { useCallback, useEffect, useRef, useState } from 'react';

type PollingResult<T> = {
  data: T | null;
  etag: string | null;
  notModified: boolean;
};

/**
 * Polls a fetcher on an interval; pauses while the document is hidden.
 * Fetcher receives the last ETag and may return notModified when the server sends 304.
 */
export function usePolling<T>(
  fetcher: (etag: string | null) => Promise<PollingResult<T>>,
  intervalMs: number | false,
  enabled = true,
  /** When this changes, drop the cached ETag so filter/search switches always refetch. */
  resetKey?: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const etagRef = useRef<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const prevResetKey = useRef(resetKey);

  const run = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await fetcherRef.current(etagRef.current);
      if (result.etag) etagRef.current = result.etag;
      if (!result.notModified && result.data !== null) {
        setData(result.data);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (resetKey !== undefined && prevResetKey.current !== resetKey) {
      prevResetKey.current = resetKey;
      etagRef.current = null;
    }
    void run();
  }, [enabled, resetKey, run]);

  useEffect(() => {
    if (!enabled || intervalMs === false || intervalMs <= 0) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void run();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs, run]);

  return { data, loading, refresh: run, etag: etagRef.current };
}
