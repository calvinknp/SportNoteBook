/* =============================================================
   SERVICE WORKER — SportNoteBook v8.3
   Stratégie : Cache-First avec mise à jour en arrière-plan.
   - À la première visite, tous les fichiers sont mis en cache.
   - Les visites suivantes (même hors-ligne) servent depuis le cache.
   - Quand un nouveau SW est détecté, le cache est mis à jour discrètement.
   ============================================================= */

const CACHE_NAME = 'sportnote-v8.3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-180.png',
  './icon-512.png'
];

/* ---- INSTALL : mise en cache de tous les assets ---- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

/* ---- ACTIVATE : suppression des anciens caches ---- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- FETCH : Cache-First, réseau en fallback ---- */
self.addEventListener('fetch', event => {
  /* On ignore les requêtes non-GET et les appels réseau externes (ex: Open Food Facts) */
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  /* Laisse passer les appels API externes tels quels (pas de mise en cache) */
  if (!url.origin.includes(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        /* Mise à jour silencieuse en arrière-plan */
        fetch(event.request)
          .then(fresh => {
            caches.open(CACHE_NAME).then(c => c.put(event.request, fresh));
          })
          .catch(() => {});
        return cached;
      }
      /* Pas en cache → réseau, puis mise en cache */
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return response;
      });
    })
  );
});
