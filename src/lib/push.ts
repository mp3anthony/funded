import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@example.com';

let isConfigured = false;

function configureWebPush() {
  if (!isConfigured) {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('VAPID keys are missing. Web push notifications will not work.');
      return false;
    }
    webpush.setVapidDetails(
      VAPID_CONTACT_EMAIL,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    isConfigured = true;
  }
  return true;
}

export async function sendPushToSubscriptions(
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: { title: string; body: string; icon?: string; url?: string }
): Promise<{ successCount: number; failureCount: number; expiredIds: string[] }> {
  if (!configureWebPush()) {
    return { successCount: 0, failureCount: subscriptions.length, expiredIds: [] };
  }

  // Stamp the true send time so the service worker can pass it through as
  // the Notification's `timestamp` (public/sw.js). Web push has no
  // delivery-time guarantee: `webpush.sendNotification` below accepts the
  // message into the push service's queue, but the OS/browser may not
  // actually hand it to the service worker until much later (device
  // asleep/offline, Doze mode, browser fully closed). Without an explicit
  // timestamp, `showNotification()` defaults to "now" — the moment the
  // device finally renders it — which makes a backlog of overnight
  // notifications appear freshly delivered whenever the user's phone next
  // reconnects, well after their actual send time.
  const sentAt = Date.now();
  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png?v=2',
    timestamp: sentAt,
    data: {
      url: payload.url || '/',
    },
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payloadString
      ).then(() => sub.id) // Return the subscription ID on success
    )
  );

  let successCount = 0;
  let failureCount = 0;
  const expiredIds: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successCount++;
    } else {
      failureCount++;
      const error = result.reason;
      // 404 or 410 means the subscription is expired or invalid
      if (error && (error.statusCode === 404 || error.statusCode === 410)) {
        expiredIds.push(subscriptions[index].id);
      } else {
        console.error('Error sending push notification:', error);
      }
    }
  });

  return { successCount, failureCount, expiredIds };
}
