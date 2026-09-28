/**
 * Web push registration for the Super Admin panel.
 *
 * Complements the realtime socket: the socket covers an open tab; this reaches
 * an admin whose tab is closed (support chat, tickets, etc.).
 *
 * No-ops when Firebase env is missing, the browser lacks Push, or permission
 * is denied.
 */

import { updateFcmTokenAPI } from './api';

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

export type PushData = {
  type?: string;
  kind?: string;
  invalidate?: string;
  conversation_id?: string;
  ticket_id?: string;
  [key: string]: string | undefined;
};

function readConfig(): FirebaseWebConfig | null {
  const env = import.meta.env;
  const config: FirebaseWebConfig = {
    apiKey: String(env.VITE_FIREBASE_API_KEY ?? ''),
    authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN ?? ''),
    projectId: String(env.VITE_FIREBASE_PROJECT_ID ?? ''),
    storageBucket: String(env.VITE_FIREBASE_STORAGE_BUCKET ?? ''),
    messagingSenderId: String(env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? ''),
    appId: String(env.VITE_FIREBASE_APP_ID ?? ''),
  };
  if (!config.messagingSenderId || !config.projectId) return null;
  return config;
}

function vapidKey(): string {
  return String(import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '');
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window
  );
}

export function isWebPushConfigured(): boolean {
  return isWebPushSupported() && readConfig() !== null && Boolean(vapidKey());
}

export function isWebPushReady(): boolean {
  return isWebPushConfigured() && Notification.permission === 'granted';
}

let registrationPromise: Promise<string | null> | null = null;

/**
 * Register this browser for push. Does not prompt — call
 * requestWebPushPermission() from a user gesture.
 */
export function registerWebPush(): Promise<string | null> {
  if (registrationPromise) return registrationPromise;
  registrationPromise = (async () => {
    try {
      if (!isWebPushSupported()) return null;
      const config = readConfig();
      if (!config || !vapidKey()) return null;
      if (Notification.permission !== 'granted') return null;

      const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] =
        await Promise.all([import('firebase/app'), import('firebase/messaging')]);

      if (!(await isSupported())) return null;

      const app = getApps().length ? getApps()[0] : initializeApp(config);

      const swUrl = `/firebase-messaging-sw.js?${new URLSearchParams(
        config as unknown as Record<string, string>
      ).toString()}`;

      const existing = await navigator.serviceWorker.getRegistrations();
      for (const reg of existing) {
        const script =
          reg.active?.scriptURL ||
          reg.waiting?.scriptURL ||
          reg.installing?.scriptURL ||
          '';
        if (script.includes('firebase-messaging-sw.js')) {
          await reg.unregister();
        }
      }

      const registration = await navigator.serviceWorker.register(swUrl);

      const token = await getToken(getMessaging(app), {
        vapidKey: vapidKey(),
        serviceWorkerRegistration: registration,
      });
      if (!token) return null;

      await updateFcmTokenAPI(token, { platform: 'web' });
      return token;
    } catch {
      return null;
    }
  })();
  return registrationPromise;
}

export async function requestWebPushPermission(): Promise<boolean> {
  if (!isWebPushSupported() || !readConfig()) return false;
  try {
    const result = await Notification.requestPermission();
    if (result !== 'granted') return false;
    registrationPromise = null;
    return (await registerWebPush()) !== null;
  } catch {
    return false;
  }
}

export function subscribeToPushMessages(handler: (data: PushData) => void): () => void {
  const disposers: Array<() => void> = [];

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const onSwMessage = (event: MessageEvent) => {
      const payload = event.data as { source?: string; data?: PushData } | undefined;
      if (payload?.source === 'crm-push' || payload?.source === 'crm-push-click') {
        handler(payload.data || {});
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    disposers.push(() =>
      navigator.serviceWorker.removeEventListener('message', onSwMessage)
    );
  }

  void (async () => {
    try {
      if (!isWebPushReady()) return;
      const [{ getApps }, { getMessaging, onMessage, isSupported }] =
        await Promise.all([import('firebase/app'), import('firebase/messaging')]);
      if (!(await isSupported()) || !getApps().length) return;
      const unsubscribe = onMessage(getMessaging(getApps()[0]), (payload) => {
        handler((payload.data || {}) as PushData);
      });
      disposers.push(unsubscribe);
    } catch {
      // service-worker path still works
    }
  })();

  return () => disposers.forEach((dispose) => dispose());
}
