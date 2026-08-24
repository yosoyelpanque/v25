const CACHE_NAME = 'inventario-pro-cache-v9.0-router';

// Archivos locales que se descargarán obligatoriamente al instalar la app
const urlsToCache = [
  './',
  './index.html',
  './tablet.html',
  './escritorio.html',
  './logo.png',
  './icon-192x192.png',
  './manifest.json'
];

// INSTALACIÓN: Guarda los archivos básicos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caché abierto y guardando archivos locales');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// ACTIVACIÓN: Limpia cachés viejos de versiones anteriores
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH (INTERCEPTOR): Estrategia "Stale-While-Revalidate" y Caché Dinámico
self.addEventListener('fetch', event => {
  // Ignorar peticiones que no sean GET (como POST o extensiones de Chrome)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Si el archivo está en el caché, lo devuelve inmediatamente (Súper rápido / Offline)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si no está en el caché (ej. las librerías de Excel o Códigos QR la primera vez),
      // lo busca en internet, lo devuelve al usuario y, en secreto, lo guarda en el caché para la próxima.
      return fetch(event.request).then(networkResponse => {
        // Validar que la respuesta de red sea válida
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
          return networkResponse;
        }

        // Clonar la respuesta porque solo se puede usar una vez
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Si no hay internet y no está en caché, falla silenciosamente sin romper la app
        console.log('Fallo de red al intentar obtener:', event.request.url);
      });
    })
  );
});