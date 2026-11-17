// Service worker mínimo: não guarda páginas nem dados do app (há informações de saúde dos atletas).
// Só mostra uma página simples quando o celular está sem internet.
const CACHE = "handebol-hub-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE))));
self.addEventListener("activate", (e) =>
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
