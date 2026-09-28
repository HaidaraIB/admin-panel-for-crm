import React from 'react';

import { RealtimeProvider } from '../context/RealtimeContext';
import { useUser } from '../context/UserContext';

/** Mounts the super-admin WebSocket for the whole authenticated session. */
export function RealtimeGate({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, loading } = useUser();
  const hasToken =
    typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
  const enabled = !loading && isSuperAdmin() && hasToken;
  return <RealtimeProvider enabled={enabled}>{children}</RealtimeProvider>;
}
