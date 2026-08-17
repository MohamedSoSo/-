"use client";

import { useEffect, useState } from "react";
import { drainQueue, getPendingCount, getFailedCount } from "./queue";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    getPendingCount().then(setPendingCount);
    getFailedCount().then(setFailedCount);

    async function sync() {
      setIsSyncing(true);
      await drainQueue(setPendingCount);
      setFailedCount(await getFailedCount());
      setIsSyncing(false);
    }

    function handleOnline() {
      setIsOnline(true);
      sync();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Background Sync API isn't available in Safari, so this poll is the
    // portable fallback that guarantees a queued action never sits forever
    // if the 'online' event was missed for any reason.
    const interval = setInterval(() => {
      if (navigator.onLine) sync();
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, pendingCount, failedCount, isSyncing };
}
