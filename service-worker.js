const CACHE_NAME = "football-model-v4.0.0";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./predictions.html",
  "./schedule.html",
  "./teams.html",
  "./about.html",
  "./assets/css/style.css?v=4.0.0",
  "./assets/js/data.js?v=4.0.0",
  "./assets/js/common.js?v=4.0.0",
  "./assets/js/home.js?v=4.0.0",
  "./assets/js/predictions.js?v=4.0.0",
  "./assets/js/schedule.js?v=4.0.0",
  "./assets/js/teams.js?v=4.0.0",
  "./assets/js/about.js?v=4.0.0",
  "./manifest.webmanifest",
  "./assets/app-icon.svg",
  "./assets/img/og-cover.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && new URL(request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
  );
});
