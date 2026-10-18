import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveWarmReloadRace } from "./warmReloadRace.ts";

const ok = (data) => ({ data, error: null });
const failed = () => ({ data: null, error: { message: "boom" } });

function counter(result) {
  const fn = async () => {
    fn.calls += 1;
    return result;
  };
  fn.calls = 0;
  return fn;
}

test("rows come back: used as-is, no re-fetch", async () => {
  const refetch = counter(ok([]));
  assert.deepEqual(await resolveWarmReloadRace([{ id: 1 }], ok([{ id: 2 }]), refetch), [{ id: 2 }]);
  assert.equal(refetch.calls, 0);
});

test("empty result with empty previous state (first load / household switch): trusted, no re-fetch", async () => {
  const refetch = counter(ok([{ id: 1 }]));
  assert.deepEqual(await resolveWarmReloadRace([], ok([]), refetch), []);
  assert.equal(refetch.calls, 0);
});

test("warm-reload race: empty result over loaded data, re-fetch has rows → keeps the rows", async () => {
  const refetch = counter(ok([{ id: 1 }]));
  assert.deepEqual(await resolveWarmReloadRace([{ id: 1 }], ok([]), refetch), [{ id: 1 }]);
  assert.equal(refetch.calls, 1);
});

test("genuine delete-to-empty: re-fetch also empty → empty committed", async () => {
  const refetch = counter(ok([]));
  assert.deepEqual(await resolveWarmReloadRace([{ id: 1 }], ok([]), refetch), []);
  assert.equal(refetch.calls, 1);
});

test("failed query: null (leave state alone), no re-fetch", async () => {
  const refetch = counter(ok([]));
  assert.equal(await resolveWarmReloadRace([{ id: 1 }], failed(), refetch), null);
  assert.equal(refetch.calls, 0);
});

test("failed confirming re-fetch: null (leave state alone)", async () => {
  assert.equal(await resolveWarmReloadRace([{ id: 1 }], ok([]), async () => failed()), null);
});
