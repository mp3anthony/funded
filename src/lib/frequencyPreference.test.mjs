// Unit tests for src/lib/frequencyPreference.ts (R14, #401).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFrequency, loadFrequency, saveFrequency } from './frequencyPreference.ts';

function stubStorage(impl) {
  Object.defineProperty(globalThis, 'localStorage', { value: impl, configurable: true, writable: true });
}

test('isFrequency accepts the four options only', () => {
  for (const f of ['weekly', 'fortnightly', 'monthly', 'yearly']) assert.equal(isFrequency(f), true);
  for (const f of ['daily', '', null, undefined, 3, 'Weekly']) assert.equal(isFrequency(f), false);
});

test('save then load round-trips per user', () => {
  const store = new Map();
  stubStorage({ getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) });
  saveFrequency('u1', 'yearly');
  assert.equal(store.get('funded:displayFrequency:u1'), 'yearly');
  assert.equal(loadFrequency('u1'), 'yearly');
  assert.equal(loadFrequency('u2'), 'weekly');
});

test('junk stored value falls back to weekly', () => {
  stubStorage({ getItem: () => 'nonsense', setItem: () => {} });
  assert.equal(loadFrequency('u1'), 'weekly');
});

test('throwing storage never throws', () => {
  stubStorage({
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  });
  assert.equal(loadFrequency('u1'), 'weekly');
  assert.doesNotThrow(() => saveFrequency('u1', 'monthly'));
});

test('missing storage falls back to weekly', () => {
  stubStorage(undefined);
  assert.equal(loadFrequency('u1'), 'weekly');
  assert.doesNotThrow(() => saveFrequency('u1', 'monthly'));
});
