// Unit tests for src/lib/categoryCollapse.ts (R15, #402).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyToggle, loadCollapsed, saveCollapsed } from './categoryCollapse.ts';

function stubStorage(impl) {
  Object.defineProperty(globalThis, 'localStorage', { value: impl, configurable: true, writable: true });
}

test('save then load round-trips per user', () => {
  const store = new Map();
  stubStorage({ getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) });
  saveCollapsed('u1', ['Food', 'Debt & Finance']);
  assert.ok(store.has('funded:collapsedCategories:u1'));
  assert.deepEqual(loadCollapsed('u1'), ['Food', 'Debt & Finance']);
  assert.deepEqual(loadCollapsed('u2'), []);
});

test('junk stored values fall back to empty', () => {
  stubStorage({ getItem: () => 'not json', setItem: () => {} });
  assert.deepEqual(loadCollapsed('u1'), []);
  stubStorage({ getItem: () => '{"a":1}', setItem: () => {} });
  assert.deepEqual(loadCollapsed('u1'), []);
  stubStorage({ getItem: () => '["Food",3,null]', setItem: () => {} });
  assert.deepEqual(loadCollapsed('u1'), ['Food']);
});

test('throwing or missing storage never throws', () => {
  stubStorage({ getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
  assert.deepEqual(loadCollapsed('u1'), []);
  assert.doesNotThrow(() => saveCollapsed('u1', ['Food']));
  stubStorage(undefined);
  assert.deepEqual(loadCollapsed('u1'), []);
  assert.doesNotThrow(() => saveCollapsed('u1', ['Food']));
});

test('applyToggle changes only the toggled name (deep-link opens are never saved)', () => {
  // Stored: Food collapsed. Screen had Food forced open by a link; user collapses Fun.
  assert.deepEqual(applyToggle(['Food'], 'Fun', true), ['Food', 'Fun']);
  assert.deepEqual(applyToggle(['Food', 'Fun'], 'Fun', false), ['Food']);
  assert.deepEqual(applyToggle(['Food'], 'Food', true), ['Food']);
});

test('scope keeps Goals apart from Bills, and the default key is unchanged', () => {
  const store = new Map();
  stubStorage({ getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) });
  saveCollapsed('u1', ['Other']);
  saveCollapsed('u1', ['Savings'], 'goals');
  assert.ok(store.has('funded:collapsedCategories:u1'));
  assert.ok(store.has('funded:collapsedCategories:goals:u1'));
  assert.deepEqual(loadCollapsed('u1'), ['Other']);
  assert.deepEqual(loadCollapsed('u1', 'goals'), ['Savings']);
  assert.deepEqual(loadCollapsed('u2', 'goals'), []);
});
