const V = 'tabi-v4';
const SHELL = ['./', 'index.html', 'app.js', 'geo.js', 'vendor/d3.min.js', 'vendor/topojson.min.js', 'manifest.webmanifest', 'clip.html', 'vendor/pdf.min.js', 'vendor/pdf.worker.min.js', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'tabi-fonts').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || (await c.match('index.html')) || Response.error();
    }));
    return;
  }
  if (u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open('tabi-fonts').then(async c => (await c.match(req)) || fetch(req).then(res => { c.put(req, res.clone()); return res; })));
  }
});
