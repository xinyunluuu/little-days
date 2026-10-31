const CACHE = "little-days-v1.1.0";
const FILES = [
  "./",
  "./index.html",
  "./src/style.css",
  "./src/app.js",
  "./src/storage.js",
  "./src/art.js",
  "./src/templates.js",
  "./src/ai.js",
  "./src/export.js",
  "./assets/icon.svg",
  "./assets/sample-landscape.jpg",
  "./assets/sample-coffee.jpg",
  "./manifest.webmanifest",
  "./docs/creator-kit.md",
];
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES))),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("little-days-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.includes("/api/")
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then(
            (response) =>
              response ||
              (event.request.mode === "navigate"
                ? caches.match("./index.html")
                : Response.error()),
          ),
      ),
  );
});
