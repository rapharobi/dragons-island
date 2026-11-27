// Service worker de Dragon World : rend le jeu installable et jouable même avec un réseau capricieux.
// Réseau d'abord (pour avoir toujours la dernière version), et la copie en cache si le réseau ne répond pas.
const CACHE = "dragon-world-v1";
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html"]).catch(() => {}))); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(fetch(r).then((rep) => { if (rep && rep.ok) { const copie = rep.clone(); caches.open(CACHE).then((c) => c.put(r, copie)); } return rep; }).catch(() => caches.match(r).then((m) => m || caches.match("./index.html"))));
});
