/**
 * Register web push and refresh support-chat unread when a push arrives
 * while a tab is open.
 */

import { useEffect } from 'react';

import { registerWebPush, subscribeToPushMessages, type PushData } from '../services/webPush';
import { getSupportChatUnreadCountAPI } from '../services/api';
import { broadcastSupportChatUnread } from './useSupportChatUnread';

function handlePush(data: PushData): void {
  if (data.kind === 'support_chat' || data.invalidate === 'support_chat:conversations') {
    void getSupportChatUnreadCountAPI().then((r) => {
      broadcastSupportChatUnread(r.unread_count);
    });
  }
}

export function useWebPush(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    void registerWebPush();

    const unsubscribe = subscribeToPushMessages(handlePush);
    return unsubscribe;
  }, [enabled]);
}
