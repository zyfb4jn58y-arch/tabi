const V = 'tabi-v12';
const SHELL = ['./', 'index.html', 'app.js', 'geo.js', 'vendor/d3.min.js', 'vendor/topojson.min.js', 'manifest.webmanifest', 'clip.html', 'vendor/pdf.min.js', 'vendor/pdf.worker.min.js', 'vendor/maplibre-gl.js', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL).then(() => { c.add('vendor/world-50m.json').catch(() => {}); })).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'tabi-fonts' && k !== 'tabi-tiles').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
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
  // the detailed map: tiles and map fonts are kept as you look around, so those areas work offline.
  // The tile set gets a new dated folder each update, so tiles are saved without the date and reused.
  if (u.host === 'tiles.openfreemap.org') {
    const key = new Request(u.origin + u.pathname.replace(/^\/planet\/[^/]+\//, '/planet/'));
    e.respondWith(caches.open('tabi-tiles').then(async c => {
      if (u.pathname === '/planet') { try { const res = await fetch(req); if (res.ok) c.put(key, res.clone()); return res; } catch (er) { return (await c.match(key)) || Response.error(); } }
      const hit = await c.match(key); if (hit) return hit;
      try { const res = await fetch(req); if (res.ok) { await c.put(key, res.clone()); trim(c); } return res; } catch (er) { return Response.error(); }
    }));
    return;
  }
  if (u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open('tabi-fonts').then(async c => (await c.match(req)) || fetch(req).then(res => { c.put(req, res.clone()); return res; })));
  }
});
let puts = 0;
// keep the saved map to about 6,000 pieces (roughly 150 MB at most), dropping the oldest first
async function trim(c) { if (++puts % 250) return; const ks = await c.keys(); for (let i = 0; i < ks.length - 6000; i++) await c.delete(ks[i]); }
