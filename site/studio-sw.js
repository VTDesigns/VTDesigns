/* Studio offline helper (Drawing Studio and Oil Studio).
   It only looks after the two studios' own files, so the rest of the site behaves exactly as before.
   A studio page is always fetched fresh when there is internet; the saved copy is used only when offline. */
const CACHE = 'vtaa-studio-v2';
const STUDIO = ['/drawing-studio', '/oil-studio', '/assets/project-context.js', '/studio.webmanifest', '/oil-studio.webmanifest',
  '/assets/oil-app/icon-192.png', '/assets/oil-app/icon-512.png', '/assets/oil-app/apple-touch-icon.png',
  '/assets/studio-app/icon-192.png', '/assets/studio-app/icon-512.png', '/assets/studio-app/apple-touch-icon.png'];
const pageKey = u => { const m = u.origin === location.origin && /^\/(drawing-studio|oil-studio)(\.html)?\/?$/.exec(u.pathname); return m ? '/' + m[1] : null; };
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
  const key = pageKey(u);
  if (key) {
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return r;
    }).catch(() => caches.match(key)));
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
