const CACHE = 'toypos-v22';
const SHELL = ['./', './index.html', './app.js', './manifest.json', './icon-192-5.png', './icon-512-4.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const withTimeout = (p, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout')), ms);
  p.then(v => { clearTimeout(t); resolve(v); }, err => { clearTimeout(t); reject(err); });
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ملفات فايربيس (نسخة ثابتة): من الكاش الأول عشان التطبيق يفتح على طول
  if (url.hostname === 'www.gstatic.com' && url.pathname.includes('/firebasejs/')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    })());
    return;
  }

  // ملفات التطبيق: الشبكة الأول بمهلة ثانيتين، وبعدها من الكاش (عشان ما يعلّقش لو النت بطيء)
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; });
      net.catch(() => {});
      try {
        return await withTimeout(net, 2000);
      } catch (err) {
        const hit = await c.match(req, { ignoreSearch: true });
        return hit || net;
      }
    })());
  }
});
// END



