const CACHE_VERSION = "ggl-space-offline-v3";
const STATIC_CACHE = CACHE_VERSION + "-static";
const PAGE_CACHE = CACHE_VERSION + "-pages";

const REQUIRED_OFFLINE_ROUTE = "/ggltournaments/game";
const OPTIONAL_APP_SHELL = [
  "/",
  "/offline",
  "/ggltournaments",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);

    // The playable route and its same-origin Next.js bundles are required.
    // A failed required fetch must fail installation rather than advertise
    // an offline-ready app with a blank game screen.
    await cacheDocumentAndAssets(cache, REQUIRED_OFFLINE_ROUTE);

    // Other shell routes improve navigation but must not block the game worker.
    await Promise.allSettled(
      OPTIONAL_APP_SHELL.map((route) => cacheDocumentAndAssets(cache, route))
    );

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      ))
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

  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(pageFirst(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/") ||
    /\.(?:css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|webmanifest|woff2?|ttf|otf|wasm)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function cacheDocumentAndAssets(cache, route) {
  const url = new URL(route, self.location.origin);
  const request = new Request(url.href, {
    method: "GET",
    headers: { Accept: "text/html" },
    credentials: "same-origin",
    cache: "reload",
  });
  const response = await fetch(request);
  if (!response.ok) throw new Error("Offline route " + route + " returned " + response.status);

  await cache.put(request, response.clone());
  const html = await response.clone().text();
  const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => match[1]);

  const assets = new Set();
  for (const reference of references) {
    try {
      const asset = new URL(reference, url);
      if (asset.origin !== self.location.origin) continue;
      if (asset.pathname.startsWith("/_next/") || /\.(?:css|js|mjs|woff2?|ttf|otf)$/i.test(asset.pathname)) {
        assets.add(asset.href);
      }
    } catch {
      // Ignore malformed or non-URL HTML attributes.
    }
  }

  // Scripts and styles are essential to hydrate and render the playable game.
  await Promise.all([...assets].map((assetUrl) => cacheAsset(cache, assetUrl)));
}

async function cacheAsset(cache, assetUrl) {
  const request = new Request(assetUrl, { credentials: "same-origin", cache: "reload" });
  const response = await fetch(request);
  if (!response.ok) {
    if (/\.(?:css|js|mjs)$/i.test(new URL(assetUrl).pathname)) {
      throw new Error("Required offline asset failed: " + assetUrl + " (" + response.status + ")");
    }
    return;
  }

  await cache.put(request, response.clone());

  // Next.js CSS can reference self-hosted font files that are not necessarily
  // requested until the browser paints the page. Cache those with the stylesheet.
  if (/\.css$/i.test(new URL(assetUrl).pathname)) {
    const css = await response.clone().text();
    const fonts = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/gi)].map((match) => match[1]);
    await Promise.allSettled(fonts.map(async (reference) => {
      const fontUrl = new URL(reference, assetUrl);
      if (fontUrl.origin !== self.location.origin) return;
      const fontRequest = new Request(fontUrl.href, { credentials: "same-origin", cache: "reload" });
      const fontResponse = await fetch(fontRequest);
      if (fontResponse.ok) await cache.put(fontRequest, fontResponse.clone());
    }));
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    return (await caches.match("/offline")) || Response.error();
  }
}

async function pageFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;

    const route = new URL(request.url).pathname;
    if (route.startsWith("/ggltournaments")) {
      const game = await caches.match(REQUIRED_OFFLINE_ROUTE, { ignoreVary: true });
      if (game) return game;
    }
    return (await caches.match("/offline")) || (await caches.match("/")) || Response.error();
  }
}