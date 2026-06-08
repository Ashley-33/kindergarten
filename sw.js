// 幼儿园穿什么 · Service Worker
const CACHE = 'kg-v6';
// 这些跨域资源也做缓存（字体/截图库）→ 重复打开/离线更快
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-180.png',
  './assets/look_summer.webp', './assets/look_warm.webp', './assets/look_cool.webp',
  './assets/look_chilly.webp', './assets/look_earlywinter.webp',
  './assets/look_winter.webp', './assets/look_rain.webp'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 同源资源：stale-while-revalidate（先用缓存秒开，后台更新）
// 跨域（天气API/字体/CDN）：不拦截，走网络
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // 同源：stale-while-revalidate（缓存秒开，后台更新）
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(e.request);
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200) cache.put(e.request, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await network) || cache.match('./index.html');
    })());
    return;
  }

  // 跨域字体/截图库：cache-first（重复打开/离线不再求网络）
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(e.request);
      if (cached) return cached;
      try {
        const res = await fetch(e.request);
        if (res && (res.status === 200 || res.type === 'opaque')) cache.put(e.request, res.clone());
        return res;
      } catch (_) { return cached || Response.error(); }
    })());
    return;
  }
  // 其它跨域（天气 API 等）：不拦截，走网络
});
