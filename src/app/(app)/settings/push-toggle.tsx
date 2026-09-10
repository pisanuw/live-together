"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { removePushSubscription, savePushSubscription } from "./push-actions";

/** Converts a base64url VAPID key to the Uint8Array subscribe() expects. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const array = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i);
  return array;
}

/** Enable/disable Web Push for the current device. */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    // Client-only capability + subscription probe; a lazy initial value would
    // mismatch SSR, so this legitimately syncs state from an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission was not granted.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await savePushSubscription(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: json.keys?.p256dh ?? "",
            auth: json.keys?.auth ?? "",
          },
        },
        navigator.userAgent
      );
      setSubscribed(true);
    } catch {
      setMessage("Could not enable push notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      setMessage("Could not disable push notifications.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-muted-foreground text-sm">
        Push notifications aren&apos;t supported in this browser.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        aria-busy={busy}
        onClick={subscribed ? disable : enable}
      >
        {busy
          ? "Working…"
          : subscribed
            ? "Disable push on this device"
            : "Enable push on this device"}
      </Button>
      {message ? (
        <p className="text-muted-foreground text-xs">{message}</p>
      ) : null}
    </div>
  );
}
