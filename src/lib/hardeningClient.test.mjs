// Guards for the client/API hardening pass (hardening 5, 6, 7, 8, 9, 12). String-level where it is about wiring.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateJoinCode, JOIN_CODE_ALPHABET, NEW_JOIN_CODE_LENGTH } from './joinCode.ts';
import { sanitizeCode, formatCode, canJoin } from './onboardingJoin.ts';
import { isAllowedPushEndpoint, isValidPushKey } from './pushEndpoint.ts';
import { safeScreenshotUrl, isRateLimited, MAX_REPORTS_PER_WINDOW } from './bugReportGuards.ts';
import { buildCsp, securityHeaders } from './securityHeaders.ts';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('join code: 8 characters, no look-alikes, from the allowed alphabet', () => {
  assert.equal(NEW_JOIN_CODE_LENGTH, 8);
  assert.equal(JOIN_CODE_ALPHABET.length, 32);
  assert.ok(!/[01OI]/.test(JOIN_CODE_ALPHABET));
  for (let i = 0; i < 200; i++) {
    const c = generateJoinCode();
    assert.equal(c.length, 8);
    for (const ch of c) assert.ok(JOIN_CODE_ALPHABET.includes(ch));
  }
});

test('AppContext uses generateJoinCode, not Math.random, for join codes', () => {
  const s = read('../context/AppContext.tsx');
  assert.ok(s.includes('generateJoinCode()'));
  assert.ok(!/join_?[cC]ode[^\n]*Math\.random/.test(s));
  assert.ok(!s.includes('Math.random().toString(36)'));
});

test('join input accepts new 8-char codes and old 6-char codes', () => {
  assert.equal(sanitizeCode('abcd-efgh9'), 'ABCDEFGH');
  assert.equal(formatCode('ABCDEFGH'), 'ABCD-EFGH');
  assert.equal(formatCode('ABC123'), 'ABC-123');
  assert.equal(canJoin('ABC123', false), true);
  assert.equal(canJoin('ABCDEFGH', false), true);
  assert.equal(canJoin('ABCDEFG', false), false);
  assert.equal(canJoin('ABCDE', false), false);
});

test('push endpoints: only real push services over https', () => {
  assert.ok(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc'));
  assert.ok(isAllowedPushEndpoint('https://web.push.apple.com/QAbc'));
  assert.ok(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x'));
  assert.ok(isAllowedPushEndpoint('https://db5p.notify.windows.com/?token=x'));
  assert.ok(isAllowedPushEndpoint('https://wns2-by3p.notify.windows.com/w/?token=x'));
  assert.ok(!isAllowedPushEndpoint('http://fcm.googleapis.com/x'));
  assert.ok(!isAllowedPushEndpoint('https://evil.example.com/x'));
  assert.ok(!isAllowedPushEndpoint('https://fcm.googleapis.com.evil.com/x'));
  assert.ok(!isAllowedPushEndpoint('https://evilpush.apple.com.attacker.io/x'));
  assert.ok(!isAllowedPushEndpoint('https://push.apple.com/x'));
  assert.ok(!isAllowedPushEndpoint('https://user@fcm.googleapis.com/x'));
  assert.ok(!isAllowedPushEndpoint('https://fcm.googleapis.com:8443/x'));
  assert.ok(!isAllowedPushEndpoint('https://fcm.googleapis.com/' + 'a'.repeat(3000)));
  assert.ok(!isAllowedPushEndpoint(undefined));
  assert.ok(isValidPushKey('BNc_-abc123=='));
  assert.ok(!isValidPushKey('x'.repeat(300)));
  assert.ok(!isValidPushKey('has space'));
  assert.ok(read('../app/api/push/subscribe/route.ts').includes('isAllowedPushEndpoint'));
});

test('push send: no userId parameter, targets the caller only', () => {
  const s = read('../app/api/push/send/route.ts');
  assert.ok(!s.includes('userId'));
  assert.ok(s.includes(".eq('user_id', user.id)"));
  assert.ok(!read('../context/AppContext.tsx').includes('userId: notif.user_id'));
});

test('issue report: screenshot must be in own bucket, encoded; no email or id in body', () => {
  const base = 'https://abc.supabase.co';
  const ok = base + '/storage/v1/object/public/bug-report-screenshots/screenshots/u1/1.png';
  assert.equal(safeScreenshotUrl(ok, base, 'u1'), ok);
  assert.equal(safeScreenshotUrl(ok, base, 'u2'), null);
  assert.equal(safeScreenshotUrl('https://evil.com/x.png', base, 'u1'), null);
  assert.equal(safeScreenshotUrl('http://abc.supabase.co/storage/v1/object/public/bug-report-screenshots/a.png', base, 'u1'), null);
  assert.equal(safeScreenshotUrl(base + '/storage/v1/object/public/avatars/a.png', base, 'u1'), null);
  const enc = safeScreenshotUrl(base + '/storage/v1/object/public/bug-report-screenshots/screenshots/u1/a).png', base, 'u1');
  assert.ok(enc && !enc.includes(')') && enc.includes('%29'));
  const route = read('../app/api/bug-report/route.ts');
  assert.ok(!route.includes('user.email'));
  assert.ok(!route.includes('user.id}'));
  assert.ok(route.includes('safeScreenshotUrl') && route.includes('isRateLimited') && route.includes('title.length > MAX_REPORT_TITLE') && route.includes('description.length > MAX_REPORT_DESCRIPTION'));
  assert.ok(route.indexOf('safeScreenshotUrl(screenshotUrl') < route.indexOf('isRateLimited(user.id)'), 'rate limit runs after validation');
});

test('issue report: per-user rate limit', () => {
  const now = Date.now();
  for (let i = 0; i < MAX_REPORTS_PER_WINDOW; i++) assert.equal(isRateLimited('u1', now + i), false);
  assert.equal(isRateLimited('u1', now + 10), true);
  assert.equal(isRateLimited('u2', now + 10), false);
  assert.equal(isRateLimited('u1', now + 61 * 60 * 1000), false);
});

test('service worker bypasses supabase hosts by suffix', () => {
  const s = read('../../public/sw.js');
  assert.ok(s.includes("'.supabase.co'"));
  assert.ok(!s.includes("'/supabase.co'"));
});

test('security headers are wired into next.config.ts and include a safe CSP', () => {
  assert.ok(read('../../next.config.ts').includes('securityHeaders('));
  const csp = buildCsp('https://abc.supabase.co', false);
  for (const d of ["default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "worker-src 'self'", 'https://abc.supabase.co', 'wss://abc.supabase.co', 'data:', 'blob:']) {
    assert.ok(csp.includes(d), d);
  }
  assert.ok(/connect-src [^;]*blob:/.test(csp), 'blob: in connect-src');
  assert.ok(!csp.includes("'unsafe-eval'"));
  assert.ok(buildCsp('https://abc.supabase.co', true).includes("'unsafe-eval'"));
  const keys = securityHeaders('https://abc.supabase.co', false).map((h) => h.key);
  for (const k of ['Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']) {
    assert.ok(keys.includes(k), k);
  }
});
