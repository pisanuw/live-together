"use client";

import { useEffect } from "react";

/** Registers the PWA service worker once, on the client. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures are non-fatal (e.g. unsupported context).
    });
  }, []);
  return null;
}
