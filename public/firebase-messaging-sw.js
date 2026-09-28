/* eslint-disable no-undef */
/**
 * Background push handler for the Super Admin panel.
 *
 * Must live at the origin root under exactly this filename — the Firebase
 * messaging SDK looks for `/firebase-messaging-sw.js`. Config arrives as query
 * parameters on the registration URL (see services/webPush.ts).
 */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || '',
  projectId: params.get('projectId') || '',
  storageBucket: params.get('storageBucket') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || '',
};

if (firebaseConfig.messagingSenderId && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const notification = payload.notification || {};

    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ source: 'crm-push', data });
      });
    });

    if (notification.title || notification.body) {
      return;
    }

    const title = data.title || 'LOOP Admin';
    const body = data.body || '';
    const dedupeKey = data.message_id || data.conversation_id || data.ticket_id || '';
    const tag = data.type
      ? `admin-${data.type}-${dedupeKey}`
      : `admin-${dedupeKey || 'general'}`;

    return self.registration.showNotification(title, {
      body,
      tag,
      renotify: Boolean(dedupeKey),
      icon: '/notification-icon.png',
      badge: '/notification-badge.png',
      data,
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  let targetPath = '/';
  if (data.kind === 'support_chat' && data.conversation_id) {
    targetPath = `/support-chat?conversation=${data.conversation_id}`;
  } else if (data.kind === 'support_ticket') {
    targetPath = '/support-tickets';
  } else if (data.kind === 'company_registration') {
    targetPath = '/tenants';
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({ source: 'crm-push-click', data });
            if ('navigate' in client && targetPath !== '/') {
              return client.navigate(targetPath).then((c) => (c && c.focus ? c.focus() : client.focus()));
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetPath);
        }
        return undefined;
      })
  );
});
