/* Service Worker — Gerenciamento SDI */
var CACHE_NAME = 'sdi-cache-v1';
var APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/favicon.png'
];

self.addEventListener('install', function(event) {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(APP_SHELL);
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(nomes) {
            return Promise.all(
                nomes.filter(function(n) { return n !== CACHE_NAME; })
                     .map(function(n) { return caches.delete(n); })
            );
        }).then(function() { return self.clients.claim(); })
    );
});

/* Estratégia: network-first para navegação (HTML), cache-first para os demais assets.
   Isso garante que o app sempre tente buscar a versão mais nova quando online,
   e caia no cache salvo quando estiver offline. */
self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(function(resp) {
                    var copy = resp.clone();
                    caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, copy); });
                    return resp;
                })
                .catch(function() { return caches.match('./index.html'); })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function(cached) {
            if (cached) return cached;
            return fetch(event.request).then(function(resp) {
                var copy = resp.clone();
                caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, copy); });
                return resp;
            }).catch(function() { return cached; });
        })
    );
});
