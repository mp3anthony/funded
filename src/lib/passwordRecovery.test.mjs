// Guards for the password-reset link handling (#490). Logic and lifecycle run against
// recoveryLink.ts; the wiring in the page, shell and client is checked at source level.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  isRecoveryHash,
  isFreshStamp,
  markRecoveryLink,
  hasRecoverySignal,
  clearRecoverySignal,
  shouldForwardToRecovery,
  RECOVERY_MAX_AGE_MS,
} from './recoveryLink.ts';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

function installWindow({ blocked = false } = {}) {
  const store = new Map();
  globalThis.window = {
    sessionStorage: {
      getItem: (k) => {
        if (blocked) throw new Error('blocked');
        return store.has(k) ? store.get(k) : null;
      },
      setItem: (k, v) => {
        if (blocked) throw new Error('blocked');
        store.set(k, String(v));
      },
      removeItem: (k) => {
        if (blocked) throw new Error('blocked');
        store.delete(k);
      },
    },
  };
  return store;
}

beforeEach(() => {
  installWindow();
  clearRecoverySignal();
});

test('isRecoveryHash needs type, access_token, refresh_token and expires_in', () => {
  assert.equal(isRecoveryHash('#access_token=x&refresh_token=y&expires_in=3600&type=recovery'), true);
  assert.equal(isRecoveryHash('#access_token=x&refresh_token=y&expires_in=3600&type=signup'), false);
  assert.equal(isRecoveryHash('#refresh_token=y&expires_in=3600&type=recovery'), false);
  assert.equal(isRecoveryHash('#access_token=x&expires_in=3600&type=recovery'), false);
  assert.equal(isRecoveryHash('#access_token=x&refresh_token=y&type=recovery'), false);
  assert.equal(isRecoveryHash('#type=recovery'), false);
  assert.equal(isRecoveryHash(''), false);
});

test('isFreshStamp: recent true; old, null and junk false', () => {
  const now = 1_000_000_000;
  assert.equal(isFreshStamp(now - 60_000, now), true);
  assert.equal(isFreshStamp(now - 11 * 60_000, now), false);
  assert.equal(isFreshStamp(null, now), false);
  assert.equal(isFreshStamp(Number('abc'), now), false);
  assert.equal(RECOVERY_MAX_AGE_MS, 10 * 60_000);
});

test('mark then has then clear', () => {
  assert.equal(hasRecoverySignal(), false);
  markRecoveryLink();
  assert.equal(hasRecoverySignal(), true);
  clearRecoverySignal();
  assert.equal(hasRecoverySignal(), false);
});

test('a stale stored stamp expires and is removed on read', () => {
  const store = installWindow();
  store.set('funded:recovery-link', String(Date.now() - 11 * 60_000));
  assert.equal(hasRecoverySignal(), false);
  assert.equal(store.has('funded:recovery-link'), false);
});

test('blocked sessionStorage falls back to the in-memory stamp', () => {
  installWindow({ blocked: true });
  markRecoveryLink();
  assert.equal(hasRecoverySignal(), true);
  clearRecoverySignal();
  assert.equal(hasRecoverySignal(), false);
});

test('no window: everything is a safe no-op', () => {
  delete globalThis.window;
  assert.doesNotThrow(() => markRecoveryLink());
  assert.equal(hasRecoverySignal(), false);
  assert.doesNotThrow(() => clearRecoverySignal());
});

test('forward needs a session and skips the auth pages (no loop)', () => {
  markRecoveryLink();
  assert.equal(shouldForwardToRecovery(true, '/'), true);
  assert.equal(shouldForwardToRecovery(true, '/bills'), true);
  assert.equal(shouldForwardToRecovery(false, '/'), false);
  for (const p of ['/login', '/confirm-email', '/auth/callback', '/getting-started', '/reset-password', '/reset-password/update']) {
    assert.equal(shouldForwardToRecovery(true, p), false, p);
  }
  clearRecoverySignal();
  assert.equal(shouldForwardToRecovery(true, '/'), false);
});

test('supabase.ts stamps the recovery hash before createClient', () => {
  const s = read('./supabase.ts');
  assert.ok(s.indexOf('markRecoveryLink(') !== -1);
  assert.ok(s.indexOf('markRecoveryLink(') < s.indexOf('createClient(supabaseUrl'));
  assert.match(s, /isRecoveryHash\(window\.location\.hash\)/);
});

test('update page: ready needs the signal or PASSWORD_RECOVERY; signal cleared on every exit', () => {
  const s = read('../app/reset-password/update/page.tsx');
  assert.ok(!/if \(session\) markReady\(\)/.test(s));
  assert.match(s, /hasRecoverySignal\(\)/);
  assert.match(s, /PASSWORD_RECOVERY/);
  const invalid = s.slice(s.indexOf('const markInvalid'), s.indexOf('const searchParams'));
  assert.match(invalid, /clearRecoverySignal\(\)/);
  const ready = s.slice(s.indexOf('const markReady'), s.indexOf('const markInvalid'));
  assert.match(ready, /clearRecoverySignal\(\)/);
  const update = s.indexOf('updateUser({ password })');
  const clear = s.indexOf('clearRecoverySignal()', update);
  const out = s.indexOf('signOut(', update);
  const assign = s.indexOf('window.location.assign("/login?message=password_reset_success")');
  assert.ok(update !== -1 && clear > update && clear < out && out < assign);
  const cleanup = s.slice(s.indexOf('return () => {'), s.indexOf('const handleSubmit'));
  assert.match(cleanup, /clearRecoverySignal\(\)/);
});

test('AppShell forwards before the fullscreen gate and the Onboarding gate', () => {
  const s = read('../components/AppShell.tsx');
  assert.match(s, /shouldForwardToRecovery\(/);
  assert.match(s, /router\.replace\("\/reset-password\/update"\)/);
  const gate = s.indexOf('if (recoveryForward)');
  assert.ok(gate !== -1);
  assert.ok(gate < s.indexOf('if (isLoginPage || isConfirmEmailPage'));
  assert.ok(gate < s.indexOf('<Onboarding'));
});

test('signal is cleared on SIGNED_OUT and before a password sign-in', () => {
  const ctx = read('../context/AppContext.tsx');
  assert.match(ctx, /_event === "SIGNED_OUT"\) clearRecoverySignal\(\)/);
  const login = read('../app/login/page.tsx');
  assert.ok(login.indexOf('clearRecoverySignal()') < login.indexOf('signInWithPassword('));
});
