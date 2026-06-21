/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const CACHE_NAME = 'caribenominas-cache-v1';

// Assets to cache immediately on installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline shell');
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[Service Worker] Pre-cache warning: some items could not be cached immediately. This is normal during active Vite development.', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating and clean up old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event with Stale-While-Revalidate and offline support
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore WebSockets (like Vite HMR websocket which starts with ws:// or has specific headers)
  if (url.protocol.startsWith('ws') || url.pathname.includes('socket.io') || url.pathname.includes('hmr')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // Fetch fresh copy from network
        const fetchedResponse = fetch(event.request)
          .then((networkResponse) => {
            // Save successful response clone to cache
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            console.log('[Service Worker] Network request failed. Trying offline fallback or cached asset.', err);
            // If offline and request is document/page, fallback to /index.html
            if (event.request.mode === 'navigate') {
              return cache.match('/') || cache.match('/index.html');
            }
          });

        // Return cached response immediately if we have it, else wait for network response
        return cachedResponse || fetchedResponse;
      });
    })
  );
});
