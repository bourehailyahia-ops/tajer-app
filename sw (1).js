// تاجر — Service Worker
// غيّر رقم الإصدار عند كل تحديث مهم لإجبار الأجهزة على جلب النسخة الجديدة
const VERSION = 'v3-2026-08-04';
const CACHE = `tajer-${VERSION}`;

// ملفات ثابتة نادرة التغيير فقط — index.html لا يُخزَّن مسبقاً عمداً
const ASSETS = ['/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // لا نلمس نداءات الخوادم والذكاء الاصطناعي إطلاقاً
  if (url.origin !== self.location.origin ||
      url.pathname.startsWith('/functions/') ||
      url.hostname.includes('supabase') ||
      url.hostname.includes('anthropic')) {
    return;
  }

  const isDoc = req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html');

  // ===== الصفحات: الشبكة أولاً دائماً — فلا تظهر نسخة قديمة أبداً =====
  if (isDoc) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // ===== باقي الملفات: من الذاكرة أولاً مع تحديث صامت في الخلفية =====
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});
