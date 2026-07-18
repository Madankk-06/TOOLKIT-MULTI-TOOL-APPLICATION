/**
 * FILE: public/sw.js
 *
 * Toolkit Service Worker v2 — Network-first with intelligent cache fallback.
 *
 * Strategy per resource type:
 *   App shell (HTML/JS/CSS)  → Cache-first  (fastest load)
 *   AI / auth APIs           → Network-first (always fresh)
 *   Images / fonts           → Cache-first with 7-day expiry
 *   CDN resources (pdfjs)    → Stale-while-revalidate
 *   Navigation               → Network-first with offline fallback page
 */

const CACHE_VERSION = "toolkit-v2";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;

const MAX_DYNAMIC_ENTRIES = 60;
const MAX_IMAGE_ENTRIES   = 30;
const IMAGE_MAX_AGE_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days

const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

const NETWORK_FIRST_ORIGINS = [
  "generativelanguage.googleapis.com",
  "firebaseapp.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com"
];

const SWR_PATTERNS = [
  /cdnjs\.cloudflare\.com/,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/
];

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (!request.url.startsWith("http")) return;

  if (NETWORK_FIRST_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(networkFirst(request)); return;
  }
  if (SWR_PATTERNS.some(p => p.test(request.url))) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE)); return;
  }
  if (request.destination === "image") {
    event.respondWith(cacheFirstWithExpiry(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES)); return;
  }
  if (url.origin === self.location.origin && isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE)); return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request)); return;
  }
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function cacheFirstWithExpiry(request, cacheName, maxEntries) {
  const cached = await caches.match(request);
  if (cached) {
    const date = cached.headers.get("sw-cached-at");
    if (date && Date.now() - Number(date) < IMAGE_MAX_AGE_MS) return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const headers = new Headers(response.headers);
      headers.append("sw-cached-at", String(Date.now()));
      const toCache = new Response(await response.clone().blob(), {
        status: response.status, statusText: response.statusText, headers
      });
      cache.put(request, toCache);
      await limitCacheSize(cache, maxEntries);
    }
    return response;
  } catch {
    return cached || offlineFallback();
  }
}

async function networkFirst(request) {
  try {
    const response = await fetchWithTimeout(request, 8000);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineFallback();
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetchWithTimeout(request, 6000);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    try {
      const cache = await caches.open(STATIC_CACHE);
      const keys = await cache.keys();
      const hasProdBundles = keys.some(k => k.url.includes("/assets/"));
      if (!hasProdBundles) {
        return offlinePageResponse();
      }
    } catch (e) {
      // Fallback if cache query fails
    }
    const cachedIndex = await caches.match("/index.html");
    return cachedIndex || offlinePageResponse();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  const revalidate = fetch(request).then(response => {
    if (response.ok) {
      cache.put(request, response.clone());
      limitCacheSize(cache, MAX_DYNAMIC_ENTRIES);
    }
    return response;
  }).catch(() => undefined);
  return cached || revalidate || offlineFallback();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isStaticAsset(pathname) {
  return /\.(js|css|woff2?|ttf|ico|svg|webp|png|jpg|jpeg|json)$/.test(pathname);
}

function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function limitCacheSize(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) {
    await cache.delete(keys[0]);
    await limitCacheSize(cache, max);
  }
}

function offlineFallback() {
  return new Response("Offline — please check your connection.", {
    status: 503, headers: { "Content-Type": "text/plain" }
  });
}

function offlinePageResponse() {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Toolkit — Offline</title>
<style>*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;
background:#0a0a0f;color:#e2e2f0;font-family:system-ui,sans-serif;text-align:center;padding:24px}
.card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
border-radius:20px;padding:40px 32px;max-width:360px}
h1{font-size:24px;margin-bottom:12px;
background:linear-gradient(135deg,#a5b4fc,#f9a8d4);
-webkit-background-clip:text;-webkit-text-fill-color:transparent}
p{color:#888;font-size:14px;line-height:1.6;margin-bottom:20px}
button{background:linear-gradient(135deg,#6C63FF,#8B5CF6);
border:none;border-radius:20px;padding:10px 24px;color:#fff;cursor:pointer;font-size:14px}
</style></head><body>
<div class="card"><div style="font-size:48px;margin-bottom:16px">📡</div>
<h1>You're Offline</h1>
<p>Toolkit needs internet for AI features. Basic tools may still work.</p>
<button onclick="window.location.reload()">Try Again</button></div>
</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// ── Messages from app ─────────────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_CACHE") {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
