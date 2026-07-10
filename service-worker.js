const CACHE_NAME = "football-model-v4.0.1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./predictions.html",
  "./schedule.html",
  "./teams.html",
  "./about.html",
  "./assets/css/style.css",
  "./assets/js/data.js",
  "./assets/js/data-service.js",
  "./assets/js/common.js",
  "./assets/js/home.js",
  "./assets/js/predictions.js",
  "./assets/js/schedule.js",
  "./assets/js/teams.js",
  "./assets/js/about.js",
  "./assets/data/snapshot.json",
  "./manifest.webmanifest",
  "./assets/app-icon.svg",
  "./assets/img/og-cover.svg"
];

function normalizedRequest(requestOrUrl) {
  const url = new URL(typeof requestOrUrl === "string" ? requestOrUrl : requestOrUrl.url, self.location.href);
  if (url.origin === self.location.origin) url.search = "";
  return new Request(url.toString(), { method: "GET" });
}

async function cacheOne(cache, url) {
  try {
    const request = normalizedRequest(url);
    const response = await fetch(request, { cache: "reload" });
    if (response.ok) await cache.put(request, response.clone());
  } catch (error) {
    console.warn("Skip cache asset:", url, error.message);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(CORE_ASSETS.map((url) => cacheOne(cache, url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("football-model") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cacheKey = normalizedRequest(request);
  try {
    const response = await fetch(request);
    if (response.ok && new URL(request.url).origin === self.location.origin) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(cacheKey, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(cacheKey);
    if (cached) return cached;
    if (request.mode === "navigate") return caches.match(normalizedRequest("./index.html"));
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request).catch(() => Response.error()));
    return;
  }
  event.respondWith(networkFirst(request));
});
