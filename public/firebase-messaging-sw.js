/* eslint-disable no-undef */
// Firebase Cloud Messaging service worker
// This file must live in /public so it's served from the root.

importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js');

async function init() {
  try {
    const res = await fetch('/api/firebase-config');
    const config = await res.json();

    if (!config || !config.projectId) {
      console.warn('[firebase-messaging-sw] Missing firebase config');
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = payload?.notification?.title || 'Notification';
      const body = payload?.notification?.body || '';
      const link = payload?.data?.link || '';

      self.registration.showNotification(title, {
        body,
        data: { link },
      });
    });
  } catch (e) {
    console.warn('[firebase-messaging-sw] init failed', e);
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification?.data?.link;
  if (!link) return;

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(link);
      }
    })()
  );
});

void init();
