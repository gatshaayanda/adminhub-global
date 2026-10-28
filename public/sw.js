const CACHE_VERSION = "sparkle-legacy-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

const APP_SHELL = [
  "/",
  "/offline",
  "/claims",
  "/blog",
  "/c/short-term",
  "/c/long-term",
  "/c/business",
  "/c/retirement",
  "/client/login",
  "/placeholder.png",
  "/manifest.webmanifest",
  "/ggltournaments/game",
  "/game-assets/space/PNG/Retina/ship_A.png",
  "/game-assets/space/PNG/Retina/enemy_A.png",
  "/game-assets/space/PNG/Retina/enemy_B.png",
  "/game-assets/space/PNG/Retina/enemy_C.png",
  "/game-assets/space/PNG/Retina/enemy_D.png",
  "/game-assets/space/PNG/Retina/enemy_E.png",
  "/game-assets/space/PNG/Retina/meteor_large.png",
  "/game-assets/space/PNG/Retina/meteor_detailedLarge.png",
  "/game-assets/space/PNG/Retina/satellite_A.png",
  "/game-assets/space/PNG/Retina/station_A.png",
  "/game-assets/space/PNG/Retina/star_large.png",
  "/game-assets/space/PNG/Retina/star_medium.png",
  "/game-assets/space/PNG/Retina/star_small.png",
  "/game-assets/space/PNG/Retina/effect_yellow.png",
  "/game-assets/space/PNG/Retina/effect_purple.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html")
  ) {
    event.respondWith(pageFirst(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    return caches.match("/offline");
  }
}

async function pageFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(PAGE_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    const home = await caches.match("/");
    if (home) return home;

    return caches.match("/offline");
  }
}