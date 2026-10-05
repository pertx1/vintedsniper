/* Vinted Sniper service worker: receives push messages and opens the item on tap. */
'use strict';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    data: { url: data.url || '/' },
    timestamp: Date.now(),
  };
  // iOS ignores `image`, other platforms show the item photo.
  if (data.image) options.image = data.image;
  if (data.tag) options.tag = data.tag;
  // iOS revokes the subscription if a push does not show a notification, so always show one.
  event.waitUntil(self.registration.showNotification(data.title || 'Vinted Sniper', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      if (url.startsWith(self.location.origin)) {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windows) {
          if ('focus' in client) {
            await client.focus();
            if ('navigate' in client) await client.navigate(url).catch(() => {});
            return;
          }
        }
      }
      // External link (the Vinted item): open it directly.
      await self.clients.openWindow(url);
    })(),
  );
});
