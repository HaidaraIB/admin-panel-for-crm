import { useEffect, useRef } from 'react';

import { useRealtime } from '../context/RealtimeContext';

/**
 * Debounced sync when the support inbox or an open thread moves.
 * Prefer app-wide {@link RealtimeProvider} + {@link useRealtime} directly.
 */
export function useSupportChatRealtime(
  onSync: () => void,
  enabled = true,
  scopes: string[] = ['support_inbox', 'support_conversation']
): boolean {
  const { connected, subscribe } = useRealtime();
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;
  const scopesRef = useRef(scopes);
  scopesRef.current = scopes;

  useEffect(() => {
    if (!enabled) return;
    let bumpTimer: number | undefined;
    const bump = () => {
      if (bumpTimer) window.clearTimeout(bumpTimer);
      bumpTimer = window.setTimeout(() => {
        bumpTimer = undefined;
        onSyncRef.current();
      }, 400);
    };
    const unsub = subscribe((frame) => {
      const scope = frame.scope;
      if (!scope) return;
      if (scopesRef.current.includes(scope)) {
        bump();
      }
    });
    return () => {
      unsub();
      if (bumpTimer) window.clearTimeout(bumpTimer);
    };
  }, [enabled, subscribe]);

  return enabled ? connected : false;
}
