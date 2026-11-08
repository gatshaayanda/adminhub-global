const CACHE_VERSION = "ggl-space-offline-v7";
const OWNED_CACHE_PREFIXES = ["sparkle-legacy-v2-", "ggl-space-offline-"];
const STATIC_CACHE = CACHE_VERSION + "-static";
const PAGE_CACHE = CACHE_VERSION + "-pages";

const REQUIRED_OFFLINE_ROUTE = "/ggltournaments/game";
const OPTIONAL_APP_SHELL = ["/", "/offline", "/ggltournaments", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // Fail installation if the playable route or its essential JS/CSS cannot
    // be cached. A worker must never claim offline readiness on a partial shell.
    await cacheDocumentAndAssets(cache, REQUIRED_OFFLINE_ROUTE);
    await Promise.allSettled(OPTIONAL_APP_SHELL.map((route) => cacheDocumentAndAssets(cache, route)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => OWNED_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) && !key.startsWith(CACHE_VERSION))
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_GGL_SPACE") return;
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const requiredErrors = [];
    try {
      await cacheDocumentAndAssets(cache, REQUIRED_OFFLINE_ROUTE);
    } catch (error) {
      requiredErrors.push(String(error));
    }

    const discoveredAssets = Array.isArray(event.data.assets) ? event.data.assets : [];
    const candidates = [...new Set(discoveredAssets)].slice(0, 1200);
    const results = await Promise.allSettled(candidates.map((candidate) => cacheAsset(cache, candidate)));
    const failedAssets = results.flatMap((result, index) => {
      if (result.status === "fulfilled") return [];
      const candidate = candidates[index];
      return /\.(?:css|js|mjs)$/i.test(new URL(candidate, self.location.origin).pathname) ? [candidate] : [];
    });

    const client = event.source;
    if (client && "postMessage" in client) {
      client.postMessage({
        type: "GGL_SPACE_CACHE_STATUS",
        version: CACHE_VERSION,
        ready: requiredErrors.length === 0 && failedAssets.length === 0,
        cachedAssets: results.filter((result) => result.status === "fulfilled").length,
        failedCriticalAssets: [...requiredErrors, ...failedAssets].slice(0, 20),
      });
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(pageFirst(request));
    return;
  }

  if (url.origin !== self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

function isStaticAsset(pathname) {
  return pathname.startsWith("/_next/") ||
    /\.(?:css|js|mjs|png|jpe?g|webp|avif|gif|svg|ico|webmanifest|woff2?|ttf|otf|wasm|mp4|webm|mp3|ogg|wav)$/i.test(pathname);
}

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
  const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)].map((match) => match[1]);
  const assets = new Set();
  for (const reference of references) {
    try {
      const asset = new URL(reference, url);
      if (asset.origin === self.location.origin && isStaticAsset(asset.pathname)) assets.add(asset.href);
    } catch {
      // Ignore malformed or non-URL HTML attributes.
    }
  }

  // Essential Next.js scripts and styles must all succeed. A missing optional
  // image/font does not block installation, but is reported by live warm-up.
  await Promise.all([...assets].map((assetUrl) => cacheAsset(cache, assetUrl)));
}

async function cacheAsset(cache, candidate) {
  const assetUrl = new URL(candidate, self.location.origin);
  if (assetUrl.origin !== self.location.origin || !isStaticAsset(assetUrl.pathname)) return;
  const request = new Request(assetUrl.href, { credentials: "same-origin", cache: "reload" });
  const response = await fetch(request);
  if (!response.ok) {
    if (/\.(?:css|js|mjs)$/i.test(assetUrl.pathname) || assetUrl.pathname.startsWith("/_next/")) {
      throw new Error("Required offline asset failed: " + assetUrl.pathname + " (" + response.status + ")");
    }
    return;
  }
  await cache.put(request, response.clone());

  // Cache every same-origin file referenced by CSS (fonts, sprites, textures,
  // backgrounds), not just fonts. This catches visual assets requested only
  // when the browser paints the scene.
  if (/\.css$/i.test(assetUrl.pathname)) {
    const css = await response.clone().text();
    const dependencies = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/gi)].map((match) => match[1]);
    await Promise.allSettled(dependencies.map(async (reference) => {
      const dependency = new URL(reference, assetUrl);
      if (dependency.origin === self.location.origin && isStaticAsset(dependency.pathname) && !/\\.css$/i.test(dependency.pathname)) {
        await cacheAsset(cache, dependency.href);
      }
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
