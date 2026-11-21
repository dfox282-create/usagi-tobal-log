/* ============================================================
   ⚔️ 우사기 토벌 일지 — 서비스 워커
   홈 화면에 추가한 뒤에도 인터넷 없이 앱 껍데기가 열리도록
   수첩 HTML과 아이콘만 담아 둡니다. (자료는 늘 기기 localStorage에)
   ============================================================ */
var CACHE = 'usagi-tobal-v1';
var SHELL = [
  './',
  './chiikawa-tobal-log.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        // 하나가 없어도 설치는 끝나도록 (예: index.html이 없는 저장소)
        return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // 페이지 열기: 새 것을 먼저, 안 되면 캐시
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./chiikawa-tobal-log.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./chiikawa-tobal-log.html').then(function (hit) {
          if (hit) return hit;
          return caches.match('./').then(function (root) {
            if (root) return root;
            return new Response('오프라인 상태야. 한 번은 인터넷으로 열어 줘!', {
              status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
        });
      })
    );
    return;
  }

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // 폰트·CDN은 브라우저 캐시에 맡겨요

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
