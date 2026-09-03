// Helper utility for client-side push notification subscription management

import { supabase } from "@/lib/supabase";

export function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || 
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         (window.navigator as any).standalone === true;
}

export function isPushSupported() {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export function getPushPermissionState(): NotificationPermission {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  return await Notification.requestPermission();
}

/**
 * Helper function to convert a Base64-URL string to a Uint8Array.
 * Used for converting the VAPID public key.
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/* ── Slice 10 (#96 half A): dead-subscription detection ──────────
   Settings needs to know whether THIS device currently has a live push
   subscription, distinguishing two failure modes:
     - permission was never granted (or was revoked) — Notification.permission
       isn't 'granted'.
     - permission is granted, but there's no push_subscriptions row for this
       device's current endpoint — the browser subscription and/or its DB
       row expired or was invalidated (the common iOS case per #96). */

export type PushStatus = {
  supported: boolean;
  permission: NotificationPermission;
  /** True only when permission is granted AND a matching push_subscriptions
   *  row exists for this device's current endpoint. */
  hasLiveSubscription: boolean;
};

export async function getPushStatus(): Promise<PushStatus> {
  const supported = isPushSupported();
  const permission = getPushPermissionState();

  if (!supported || permission !== "granted") {
    return { supported, permission, hasLiveSubscription: false };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return { supported, permission, hasLiveSubscription: false };
    }

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return { supported, permission, hasLiveSubscription: false };
    }

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("endpoint", subscription.endpoint)
      .maybeSingle();

    if (error) {
      console.error("Error checking push subscription status:", error);
      return { supported, permission, hasLiveSubscription: false };
    }

    return { supported, permission, hasLiveSubscription: !!data };
  } catch (err) {
    console.error("Error checking push subscription status:", err);
    return { supported, permission, hasLiveSubscription: false };
  }
}

export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    throw new Error('Push notification permission denied.');
  }

  const registration = await navigator.serviceWorker.ready;
  
  // Check if we already have a subscription
  let subscription = await registration.pushManager.getSubscription();

  // If we don't, subscribe with the public key
  if (!subscription) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error('VAPID public key is missing.');
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  // Send the subscription to our backend API route
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    throw new Error('Failed to save push subscription to the server.');
  }

  return subscription;
}
