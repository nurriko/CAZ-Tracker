// CAZ Tracker Service Worker
// Fungsi: membuat aplikasi bisa di-install (PWA) dan tetap bisa dibuka (shell)
// saat sinyal internet hilang sebentar.
//
// PENTING: Service Worker TIDAK bisa menjalankan navigator.geolocation di
// background. Browser modern (Chrome, Safari) sengaja tidak mengizinkan itu
// demi baterai & privasi pengguna. Jadi update lokasi tetap hanya berjalan
// selama tab/app CAZ Tracker terbuka di layar (foreground atau minimized,
// bukan ditutup penuh).

const CACHE_NAME = "caz-tracker-shell-v1";
const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Hanya tangani permintaan same-origin untuk file app shell.
  // Firestore, Firebase Auth, MapLibre, font, dan tile peta dibiarkan lewat
  // langsung ke jaringan (tidak di-cache) supaya data tetap real-time.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
