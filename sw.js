const CACHE_NAME = 'yingxiaoxing-v1';
const ASSETS = [
  './',
  './english_learning.html',
  './wordbooks.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安装：预缓存核心文件
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活：清除旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// 请求拦截：缓存优先 + 网络回退
self.addEventListener('fetch', e => {
  // 只处理同源 GET 请求
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
      
      return cached || fetchPromise;
    })
  );
});
