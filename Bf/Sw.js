const CACHE_NAME = 'beauty-fair-v2';
const urlsToCache = [
  './',
  './index.html',
  './Admin.html',
  './Supervisor.html',
  './2app.css',
  './3app.css',
  './style.css',
  './2script.js',
  './3app.js',
  './script.js',
  './firebase-config.js',
  // Add Firebase CDN URLs
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js',
  // Add Font Awesome
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => {
      console.log('Caching files...');
      return cache.addAll(urlsToCache);
    })
    .catch(error => {
      console.error('Cache failed:', error);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
    .then(response => {
      // Return cached version or fetch from network
      return response || fetch(event.request)
        .then(fetchResponse => {
          // Cache new requests
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
    })
    .catch(() => {
      // Return offline page if available
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});