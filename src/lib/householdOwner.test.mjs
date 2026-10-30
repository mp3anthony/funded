// Runtime tests for assertRowUpdated (R28, #415).
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertRowUpdated } from "./householdOwner.ts";

test("throws the given message when no rows came back", () => {
  assert.throws(() => assertRowUpdated([], "nope"), { message: "nope" });
  assert.throws(() => assertRowUpdated(null, "nope"), { message: "nope" });
  assert.throws(() => assertRowUpdated(undefined, "nope"), { message: "nope" });
});

test("passes when at least one row came back", () => {
  assert.doesNotThrow(() => assertRowUpdated([{ id: "h1" }], "nope"));
});
