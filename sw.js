const CACHE_PREFIX = "debate-coach-pwa-";
const CACHE_NAME = "debate-coach-pwa-v55";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./content/SKILL.md",
  "./content/PrivacyPolicy.md",
  "./case-writing-skill/SKILL.md",
  "./assets/logo.png",
  "./assets/icons/icon-180.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-1024.png",
];

function shouldHandle(request) {
  if (request.method !== "GET") {
    return false;
  }

  const requestURL = new URL(request.url);
  return requestURL.origin === self.location.origin;
}

function isAppShellRequest(request) {
  const requestURL = new URL(request.url);
  return (
    request.mode === "navigate" ||
    request.destination === "document" ||
    request.destination === "script" ||
    request.destination === "style" ||
    requestURL.pathname.endsWith(".webmanifest") ||
    requestURL.pathname.endsWith(".md")
  );
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    if (request.mode === "navigate") {
      return caches.match("./index.html");
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (!shouldHandle(event.request)) {
    return;
  }

  event.respondWith(
    isAppShellRequest(event.request) ? networkFirst(event.request) : cacheFirst(event.request)
  );
});
