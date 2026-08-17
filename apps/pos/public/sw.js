// SELF-DESTRUCT: the previous version of this file cached JS chunks
// cache-first under a static CACHE_NAME ("bbq-pos-shell-v1"), which never
// changes between deploys/dev-reloads — so once installed, a browser kept
// serving whatever bundle existed at install time forever, silently masking
// every later code change (including the PIN-gate removal) behind a stale
// cache. ServiceWorkerRegister.tsx no longer registers a service worker in
// development at all, and this file replaces the old one so any browser
// that already has it installed self-cleans on its next update check:
// unregister, purge every cache, reload open tabs once. After that, dev
// mode simply has no service worker. (Before shipping a real offline
// app-shell SW for production, give CACHE_NAME a value that changes per
// build — e.g. a content hash or NEXT_PUBLIC_BUILD_ID — so this exact bug
// can't happen again once it's reintroduced.)

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clientsList = await self.clients.matchAll({ type: "window" });
      clientsList.forEach((client) => client.navigate(client.url));
    })()
  );
});
