/**
 * Input guards for the in-app issue report route (hardening 5). Import-free so
 * node:test can run them.
 */
export const MAX_REPORT_TITLE = 150;
export const MAX_REPORT_DESCRIPTION = 5000;
export const MAX_REPORTS_PER_WINDOW = 5;
export const REPORT_WINDOW_MS = 60 * 60 * 1000;
const MAX_TRACKED_USERS = 5000;

const SCREENSHOT_BUCKET_PATH = "/storage/v1/object/public/bug-report-screenshots/";

/**
 * Returns a safe markdown-ready URL only when it points into this project's
 * own screenshot bucket under the caller's own folder; otherwise null. Parentheses, brackets, quotes and
 * whitespace are percent-encoded so the URL cannot break out of the markdown.
 */
export function safeScreenshotUrl(raw: string, supabaseUrl: string, userId: string): string | null {
  if (!userId || /[^A-Za-z0-9-]/.test(userId)) return null;
  if (!raw || raw.length > 600) return null;
  let candidate: URL;
  let base: URL;
  try {
    candidate = new URL(raw);
    base = new URL(supabaseUrl);
  } catch {
    return null;
  }
  if (candidate.protocol !== "https:" || candidate.origin !== base.origin) return null;
  if (candidate.username || candidate.password) return null;
  if (!candidate.pathname.startsWith(`${SCREENSHOT_BUCKET_PATH}screenshots/${userId}/`)) return null;
  if (candidate.pathname.includes("..")) return null;
  return candidate.href.replace(/[()\[\]<>"'`\s]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}

/**
 * Cheap per-user limit. State is in memory, so on serverless it is per warm
 * instance only: a speed bump, not a guarantee. The map is capped so it cannot grow without bound.
 */
const hits = new Map<string, number[]>();

export function isRateLimited(userId: string, now: number = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < REPORT_WINDOW_MS);
  if (recent.length >= MAX_REPORTS_PER_WINDOW) {
    hits.set(userId, recent);
    return true;
  }
  recent.push(now);
  hits.delete(userId);
  hits.set(userId, recent);
  if (hits.size > MAX_TRACKED_USERS) {
    const oldest = hits.keys().next().value;
    if (oldest !== undefined) hits.delete(oldest);
  }
  return false;
}
