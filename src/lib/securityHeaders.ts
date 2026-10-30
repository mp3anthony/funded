/**
 * Security headers for every response (hardening 8). Kept in a plain module so
 * next.config.ts and the string-level test share one source.
 *
 * CSP choices, and why:
 * - script-src 'self' 'unsafe-inline': Next injects inline bootstrap/flight
 *   scripts and layout.tsx has an inline service-worker registration script. A
 *   nonce-based policy would force fully dynamic rendering, which this app
 *   (cacheComponents) does not use. 'unsafe-eval' is added in dev only (React
 *   dev tooling needs it).
 * - style-src 'self' 'unsafe-inline': Next and the UI set inline styles.
 * - img-src 'self' data: blob: + the Supabase project host: avatars and
 *   screenshots come from Supabase Storage, the Home Screen icon is a data URI,
 *   avatar crop previews use blob:.
 * - connect-src 'self' + blob: (the avatar crop fetches a blob: URL) + Supabase https and wss (REST, auth, realtime, edge
 *   functions, storage). Push is delivered by the browser, not fetched here.
 * - font-src 'self' data: (next/font self-hosts Google fonts at build time).
 * - worker-src 'self' (service worker), manifest-src 'self'.
 * - frame-ancestors 'none', object-src 'none', base-uri 'self',
 *   form-action 'self'.
 */
export function buildCsp(supabaseUrl: string | undefined, isDev: boolean): string {
  let supabaseHttps = "https://*.supabase.co";
  let supabaseWss = "wss://*.supabase.co";
  try {
    if (supabaseUrl) {
      const u = new URL(supabaseUrl);
      if (u.protocol === "https:") {
        supabaseHttps = `https://${u.host}`;
        supabaseWss = `wss://${u.host}`;
      }
    }
  } catch {
    // fall back to the wildcard hosts above
  }
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseHttps}`,
    "font-src 'self' data:",
    `connect-src 'self' blob: ${supabaseHttps} ${supabaseWss}${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ");
}

export function securityHeaders(supabaseUrl: string | undefined, isDev: boolean) {
  return [
    { key: "Content-Security-Policy", value: buildCsp(supabaseUrl, isDev) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  ];
}
