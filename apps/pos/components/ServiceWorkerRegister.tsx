"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // The SW's cache-first strategy for JS/CSS is right for production (content-hashed
    // filenames make it safe) but actively harmful in dev: webpack's unhashed dev chunk
    // names mean a stale cached chunk keeps being served after every edit, silently
    // defeating Fast Refresh. So in dev we actively unregister/purge instead of installing.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
      caches?.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // offline app-shell caching is a resilience nice-to-have, not
      // load-bearing — the IndexedDB queue still works without it
    });
  }, []);

  return null;
}
