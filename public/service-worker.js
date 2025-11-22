// Timesheet PWA Service Worker
const CACHE_VERSION = 'V1';
const STATIC_CACHE = `timesheet-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `timesheet-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `timesheet-images-${CACHE_VERSION}`;

const limits = {
  dynamic: 50,
  images: 30
};

// Static assets to cache install (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

self.addEventListener('install', event => {
  console.log('sw installing service worker');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch(error => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('timesheet-') && !cacheName.endsWith(CACHE_VERSION);
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Ignore non-http/https requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip Firebase and other API calls
  if (['firebaseio.com', 'googleapis.com', 'firestore.googleapis.com', 'identitytoolkit.googleapis.com'].some(host => url.hostname.includes(host))) {
    return;
  }

  // Image requests: cache-first with image cache and limits
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, limits.images));
    return;
  }

  // Static assets (CSS, JS, fonts): cache-first with static cache
  if (['script', 'style', 'font'].includes(request.destination)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Document requests (HTML): network-first with dynamic cache
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, limits.dynamic));
    return;
  }

  // Default: network-first for other requests
  event.respondWith(networkFirst(request, DYNAMIC_CACHE, limits.dynamic));
});

// --- Helper Functions ---

async function limitCacheSize(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const keysToDelete = keys.slice(0, keys.length - maxItems);
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
  } catch (error) {
    console.error('Failed to trim cache:', error);
  }
}

async function cacheFirst(request, cacheName, limit) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      if (limit) {
        await limitCacheSize(cacheName, limit);
      }
    }
    return networkResponse;
  } catch (error) {
    console.error(`Cache first strategy failed for request: ${request.url}`, error);
    throw error;
  }
};

const networkFirst = async (request, cacheName, limit) => {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      await cache.put(request, responseToCache);
      if (limit) {
        await limitCacheSize(cacheName, limit);
      }
    }
    return networkResponse;
  } catch (error) {
    console.log(`Network failed for ${request.url}, trying cache.`);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.mode === 'navigate') {
      const indexResponse = await cache.match('/index.html');
      if (indexResponse) {
        return indexResponse;
      }
    }
    throw error;
  }
};