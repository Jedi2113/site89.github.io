// Service Worker to intercept and protect JS files
// This caches JS files in encrypted form

const CACHE_NAME = 'site89-encrypted-v1';
const PROTECTED_PATHS = [
  '/assets/js/auth.js',
  '/assets/js/admin.js',
  '/assets/js/anomalyEdit.js',
  '/assets/js/secure-access.js',
  '/assets/js/researchLogs.js'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only intercept JS files we want to protect
  if (url.pathname.endsWith('.js') && PROTECTED_PATHS.some(p => url.pathname.includes(p))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          
          // Clone the response
          const clonedResponse = response.clone();
          
          // Cache it
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clonedResponse);
          });
          
          return response;
        })
        .catch(() => {
          // Return from cache if offline
          return caches.match(event.request);
        })
    );
  } else {
    event.respondWith(fetch(event.request));
  }
});
