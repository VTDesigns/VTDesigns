/* Drawing Studio offline helper.
   It only looks after the Drawing Studio's own files, so the rest of the site behaves exactly as before.
   The studio page is always fetched fresh when there is internet; the saved copy is used only when offline. */
const CACHE = 'vtaa-studio-v1';
const STUDIO = ['/drawing-studio', '/assets/project-context.js', '/studio.webmanifest',
  '/assets/studio-app/icon-192.png', '/assets/studio-app/icon-512.png', '/assets/studio-app/apple-touch-icon.png'];
const isStudioPage = u => u.origin === location.origin && /^\/drawing-studio(\.html)?\/?$/.test(u.pathname);
const isStudioFile = u => u.origin === location.origin && STUDIO.includes(u.pathname);
const isFont = u => u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(STUDIO.map(p => c.add(p)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('vtaa-studio-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (isStudioPage(u)) {
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('/drawing-studio', copy)); }
      return r;
    }).catch(() => caches.match('/drawing-studio')));
  } else if (isStudioFile(u)) {
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(u.pathname, copy)); }
      return r;
    }).catch(() => caches.match(u.pathname)));
  } else if (isFont(u)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
    })));
  }
});
