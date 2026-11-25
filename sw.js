// Center OS – Service Worker: App-Hülle offline verfügbar machen.
// Bei jeder Änderung an den Dateien VERSION hochzählen, damit Geräte die neue Fassung laden.
const VERSION = 'center-os-v1';
const DATEIEN = [
  './', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'assets/null.otf', 'assets/icon-32.png', 'assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon-maskable-512.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Erst Netz, bei Offline aus dem Cache – so kommen Updates sofort an und das Spiel läuft trotzdem ohne Netz
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const kopie = res.clone(); caches.open(VERSION).then((c) => c.put(req, kopie)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
