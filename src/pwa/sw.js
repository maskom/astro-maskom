// Service Worker for Maskom Network PWA
const STATIC_CACHE = 'maskom-static-v1';
const DYNAMIC_CACHE = 'maskom-dynamic-v1';

// Critical pages to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/status',
  '/kontak',
  '/layanan',
  '/manifest.json',
  '/favicon.svg',
  '/logo-maskom.svg',
];

// API endpoints that can be cached
const CACHEABLE_APIS = ['/api/status', '/api/packages'];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle page requests
  if (request.mode === 'navigate') {
    event.respondWith(handlePageRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);

  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);

    // Cache successful GET API responses
    if (networkResponse.ok && CACHEABLE_APIS.includes(url.pathname)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    console.log(
      'Service Worker: Network failed for API, trying cache:',
      request.url
    );

    // Try cache for cacheable APIs
    if (CACHEABLE_APIS.includes(url.pathname)) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message:
          'Tidak ada koneksi internet. Data yang ditampilkan mungkin tidak terbaru.',
        offline: true,
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// Handle page requests with cache-first strategy
async function handlePageRequest(request) {
  try {
    // Try cache first for pages
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Update cache in background
      updateCacheInBackground(request);
      return cachedResponse;
    }

    // Try network if not in cache
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    console.log(
      'Service Worker: Network failed for page, trying cache:',
      request.url
    );

    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to offline page or homepage
    const offlineResponse = await caches.match('/');
    if (offlineResponse) {
      return offlineResponse;
    }

    // Final fallback
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Maskom Network</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              background: #0F1115; 
              color: white; 
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .offline-icon { 
              font-size: 4rem; 
              margin-bottom: 1rem; 
            }
            h1 { color: #4F46E5; margin-bottom: 1rem; }
            p { margin-bottom: 1.5rem; opacity: 0.8; }
            .btn {
              background: #4F46E5;
              color: white;
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 0.5rem;
              text-decoration: none;
              display: inline-block;
              transition: background 0.2s;
            }
            .btn:hover { background: #3730A3; }
          </style>
        </head>
        <body>
          <div class="offline-icon">📡</div>
          <h1>Tidak Ada Koneksi Internet</h1>
          <p>Anda sedang offline. Beberapa fitur mungkin tidak tersedia.</p>
          <p>Coba periksa koneksi internet Anda dan refresh halaman.</p>
          <button class="btn" onclick="window.location.reload()">Refresh</button>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log(
      'Service Worker: Network failed for static asset:',
      request.url
    );
    throw error;
  }
}

// Update cache in background
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse);
    }
  } catch {
    console.log('Service Worker: Background update failed:', request.url);
  }
}

// Push notification event
self.addEventListener('push', event => {
  console.log('Service Worker: Push received');

  const options = {
    body: event.data ? event.data.text() : 'Notifikasi dari Maskom Network',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: 'Lihat Detail',
        icon: '/favicon.svg',
      },
      {
        action: 'close',
        title: 'Tutup',
        icon: '/favicon.svg',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('Maskom Network', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification click received');

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(self.clients.openWindow('/'));
  }
});

// Background sync event
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered');

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    // Get all pending sync data from IndexedDB
    const pendingData = await getPendingSyncData();

    // Process each pending request
    for (const data of pendingData) {
      try {
        await fetch(data.url, {
          method: data.method,
          headers: data.headers,
          body: data.body,
        });

        // Remove processed data from IndexedDB
        await removeSyncData(data.id);
      } catch {
        console.log('Service Worker: Sync failed for:', data.url);
      }
    }
  } catch (backgroundSyncError) {
    console.log('Service Worker: Background sync failed:', backgroundSyncError);
  }
}

// IndexedDB helpers for background sync
async function getPendingSyncData() {
  // This would integrate with IndexedDB for storing pending requests
  // For now, return empty array
  return [];
}

async function removeSyncData(id) {
  // This would remove processed data from IndexedDB
  // For now, just log
  console.log('Service Worker: Would remove sync data:', id);
}
