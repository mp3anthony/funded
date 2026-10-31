/**
 * Password-recovery link signal (#490).
 *
 * Supabase's implicit flow turns a reset-link hash into a normal session and
 * fires PASSWORD_RECOVERY once, in a setTimeout(0), before React can subscribe.
 * Anywhere else in the app that session looks like a plain sign-in. So
 * supabase.ts stamps this signal synchronously, before createClient reads and
 * clears the hash, and the update page and AppShell read it instead.
 *
 * Pure: no `@/` imports, so the node tests can import it.
 */

const KEY = "funded:recovery-link";
/** A stamp older than this is ignored and removed. */
export const RECOVERY_MAX_AGE_MS = 10 * 60_000;

/** Fallback for blocked sessionStorage (private mode); lives for the page session. */
let memoryStamp: number | null = null;

/** True only for a full auth-js recovery hash: all four fields auth-js requires. */
export function isRecoveryHash(hash: string): boolean {
  const params = new URLSearchParams((hash || "").replace(/^#/, ""));
  return (
    params.get("type") === "recovery" &&
    !!params.get("access_token") &&
    !!params.get("refresh_token") &&
    !!params.get("expires_in")
  );
}

export function isFreshStamp(stamp: number | null, now: number): boolean {
  if (typeof stamp !== "number" || !Number.isFinite(stamp)) return false;
  const age = now - stamp;
  return age >= 0 && age <= RECOVERY_MAX_AGE_MS;
}

export function markRecoveryLink(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  memoryStamp = now;
  try {
    window.sessionStorage.setItem(KEY, String(now));
  } catch {
    // Storage blocked: the in-memory stamp still covers this page session.
  }
}

export function hasRecoverySignal(): boolean {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  let stored: number | null = null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw !== null) {
      stored = Number(raw);
      if (!isFreshStamp(stored, now)) {
        window.sessionStorage.removeItem(KEY);
        stored = null;
      }
    }
  } catch {
    stored = null;
  }
  if (memoryStamp !== null && !isFreshStamp(memoryStamp, now)) memoryStamp = null;
  return stored !== null || memoryStamp !== null;
}

export function clearRecoverySignal(): void {
  memoryStamp = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

/**
 * Whether AppShell should forward to the new-password page. Only with a session
 * and off the auth pages, so "Back to Sign In" and sign-in never loop.
 */
export function shouldForwardToRecovery(hasSession: boolean, pathname: string | null): boolean {
  if (!hasSession) return false;
  const p = pathname || "";
  if (
    p === "/login" ||
    p === "/confirm-email" ||
    p === "/auth/callback" ||
    p === "/getting-started" ||
    p.startsWith("/reset-password")
  ) {
    return false;
  }
  return hasRecoverySignal();
}
