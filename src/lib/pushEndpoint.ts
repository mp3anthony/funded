/**
 * Allow-list for web-push endpoints (hardening 7). The server POSTs to every
 * stored endpoint, so only the real push services may be saved. Import-free
 * so node:test can run it.
 */
export const MAX_PUSH_ENDPOINT_LENGTH = 2048;
export const MAX_PUSH_KEY_LENGTH = 256;

export function isAllowedPushEndpoint(raw: unknown): boolean {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_PUSH_ENDPOINT_LENGTH) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port && url.port !== "443") return false;
  const host = url.hostname.toLowerCase();
  if (host === "fcm.googleapis.com") return true;
  return [".push.apple.com", ".push.services.mozilla.com", ".notify.windows.com"].some(
    (suffix) => host.length > suffix.length && host.endsWith(suffix)
  );
}

export function isValidPushKey(raw: unknown): boolean {
  return typeof raw === "string" && raw.length > 0 && raw.length <= MAX_PUSH_KEY_LENGTH && /^[A-Za-z0-9_\-+/=]+$/.test(raw);
}
