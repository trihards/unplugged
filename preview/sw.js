// unplugged service worker: caches the whole retreat so it plays with no signal.
// The version is generated from the files' contents; rebuilding with any change makes a new one.
const VERSION = 'unplugged-1.6-b';
const FONTS = 'unplugged-fonts';
// The live game and the permanent preview at /preview/ share one origin, so each keeps to its own caches.
const PREVIEW = /\/preview\//.test(self.location.pathname);
const CACHE = (PREVIEW ? 'preview:' : '') + VERSION;
const mine = key => key !== FONTS && key.startsWith('preview:') === PREVIEW;
const CORE = ["./", "index.html", "manifest.webmanifest", "favicon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "assets/img/logo.webp", "assets/img/tagline.webp", "assets/img/bg-welcome.webp", "assets/img/bg-header.webp", "assets/img/lineup.webp", "assets/img/saffron-calm.webp", "assets/img/saffron-side.webp", "assets/img/dale-calm.webp", "assets/img/dale-mad.webp", "assets/img/dale-crossword.webp", "assets/img/vol1.webp", "assets/img/vol2.webp", "assets/img/vol3.webp", "assets/img/vol4.webp", "assets/img/saffron-shock.webp", "assets/img/saffron-puzzled.webp", "assets/img/saffron-joy.webp", "assets/img/dale-cash.webp", "assets/img/it-burner.webp", "assets/img/it-charger.webp", "assets/img/it-wifi.webp", "assets/img/it-wine.webp", "assets/img/it-doritos.webp", "assets/img/it-coke.webp", "assets/img/it-choc.webp", "assets/img/it-espresso.webp", "assets/img/it-petagotchi.webp", "assets/img/map-bg.webp", "assets/img/card-s0.webp", "assets/img/card-w0.webp", "assets/img/card-w1.webp", "assets/img/card-w2.webp", "assets/img/dale-tab.webp", "assets/img/card-w3.webp", "assets/img/card-w4.webp"];
const AUDIO = ["assets/audio/s0.m4a", "assets/audio/w0.m4a", "assets/audio/w1.m4a", "assets/audio/w2.m4a", "assets/audio/saffron.m4a", "assets/audio/square.m4a", "assets/audio/win-moment.m4a", "assets/audio/win-thats.m4a", "assets/audio/checkout.m4a", "assets/audio/dale-tab.m4a", "assets/audio/w3.m4a", "assets/audio/w4.m4a"];
const PREVIEW_ONLY = ["assets/preview/beta-tank.webp", "assets/preview/beta-idle.webp", "assets/preview/beta-dip.webp", "assets/preview/beta-turn.webp", "assets/preview/beta-return.webp"];
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Playpen+Sans:wght@400;500;600;700&family=VT323&display=swap";

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PREVIEW ? CORE.concat(PREVIEW_ONLY) : CORE);
    await Promise.allSettled(AUDIO.map(url => cache.add(url)));
    const fonts = await caches.open(FONTS);
    await fonts.add(new Request(FONT_CSS, { mode: 'cors' })).catch(() => {});
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (mine(key) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') return event.respondWith(page(req));
    if (url.pathname.endsWith('.m4a')) return event.respondWith(song(req));
    return event.respondWith(cacheFirst(req));
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') event.respondWith(fonts(req));
});

// The page itself: try the network first so updates show up, fall back to the cached copy offline.
async function page(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 4000))]);
    if (res.ok) cache.put('index.html', res.clone());
    return res;
  } catch (e) {
    return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.status === 200) cache.put(req, res.clone());
  return res;
}

// Songs: serve from the cache, answering the byte-range requests Safari makes for audio.
async function song(req) {
  const cache = await caches.open(CACHE);
  const url = req.url.split('#')[0];
  let res = await cache.match(url, { ignoreSearch: true });
  if (!res) {
    try {
      const full = await fetch(url);
      if (!full.ok || full.status !== 200) return full;
      await cache.put(url, full.clone());
      res = full;
    } catch (e) { return Response.error(); }
  }
  const range = req.headers.get('range');
  if (!range) return res;
  const buf = await res.arrayBuffer(), total = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : total - 1;
  if (!m[1] && m[2]) { start = Math.max(0, total - +m[2]); end = total - 1; }
  end = Math.min(end, total - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206, statusText: 'Partial Content',
    headers: { 'Content-Type': 'audio/mp4', 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' },
  });
}

// Fonts: use the cached copy right away and refresh it in the background.
async function fonts(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req);
  const fresh = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || fresh;
}
