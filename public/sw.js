/**
 * Service worker de Mesira.
 *
 * Deliberadamente mínimo. Cachea el esqueleto de la aplicación y las fotos ya
 * vistas, y nada más. Un service worker que intenta cachear páginas HTML en una app
 * con datos que cambian termina mostrando publicaciones que ya no existen y contactos
 * viejos, y es muy difícil de depurar cuando eso pasa.
 *
 * Estrategias:
 *  - Navegación (HTML): siempre a la red. Si no hay red, la página sin conexión.
 *  - Fotos de Storage: cache-first, porque una foto nunca cambia (la URL lleva token).
 *  - Estáticos de Next: cache-first, porque llevan hash en el nombre.
 *  - Todo lo demás, incluido /api: solo red, jamás cache.
 */

const VERSION = "mesira-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const IMAGE_CACHE = `${VERSION}-images`;
const OFFLINE_URL = "/sin-conexion.html";

const SHELL_ASSETS = [OFFLINE_URL, "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Nunca cachear la API ni la sesión.
  if (url.pathname.startsWith("/api/")) return;

  // Navegación: red primero, página sin conexión como último recurso.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  // Fotos de las publicaciones: la URL incluye un token único, así que nunca cambian.
  if (url.hostname === "firebasestorage.googleapis.com") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, 200));
    return;
  }

  // Estáticos de Next: el nombre lleva hash, así que son inmutables.
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE, 120));
    return;
  }
});

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && (response.type === "basic" || response.type === "cors")) {
      await cache.put(request, response.clone());
      void trim(cache, maxEntries);
    }
    return response;
  } catch (error) {
    return cached ?? Response.error();
  }
}

/** Evita que el cache crezca sin techo: descarta las entradas más viejas. */
async function trim(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  for (const key of keys.slice(0, keys.length - maxEntries)) {
    await cache.delete(key);
  }
}
