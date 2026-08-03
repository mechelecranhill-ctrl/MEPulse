const CACHE_NAME = "me-connect-v1";

const ASSETS = [
  "/",
  "/department-sections.html",

  "/MaintHelm.png",
  "/CompHelm.png",
  "/AssetFinHelm.png",
  "/ProjectsHelm.png",
  "/AdminHelm.png",
  "/Maintbck.png",

  // "/sidebar.css",
  // "/sidebar.js",
  // "/session.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cache => {
      return (
        cache ||
        fetch(event.request).then(response => {
          if (
            event.request.method === "GET" &&
            response.status === 200
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
      );
    })
  );
});