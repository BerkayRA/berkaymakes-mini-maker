/* Layered Mini Maker — offline copy.
   Serves the saved copy first (instant, works with no signal) and refreshes it in the background,
   so an updated index.html shows up on the launch after next. To push an update at once (the app then
   offers a "Reload" button), also bump VERSION below when you upload new files. */
const VERSION = 'lmm-2026-11-27-6';
const FILES = ['./', 'index.html', 'three.min.js', 'gallery.enc', 'exporter.enc', 'manifest.webmanifest',
  'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const nav = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const key = nav ? 'index.html' : req;
    const hit = await cache.match(key, {ignoreSearch: nav});
    const fresh = fetch(req).then(r => { if (r && r.ok && r.type === 'basic') cache.put(key, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(fresh); return hit; }
    return (await fresh) || (nav ? cache.match('index.html') : Response.error());
  })());
});
