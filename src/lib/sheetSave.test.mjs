// Runtime tests for the pop-up save helpers (R05, #392).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SAVE_ERROR_MESSAGE,
  SAVING_LABEL,
  TRY_AGAIN_LABEL,
  primaryPillLabel,
  isSaveLocked,
  settleSave,
} from "./sheetSave.ts";

test("exact labels and error message", () => {
  assert.equal(SAVE_ERROR_MESSAGE, "Couldn't save. Check your connection and try again.");
  assert.equal(SAVING_LABEL, "Saving…");
  assert.equal(TRY_AGAIN_LABEL, "Try again");
});

test("primaryPillLabel follows the status", () => {
  assert.equal(primaryPillLabel("idle", "Save"), "Save");
  assert.equal(primaryPillLabel("saving", "Save"), "Saving…");
  assert.equal(primaryPillLabel("error", "Save"), "Try again");
});

test("isSaveLocked is true only while saving", () => {
  assert.equal(isSaveLocked("idle"), false);
  assert.equal(isSaveLocked("saving"), true);
  assert.equal(isSaveLocked("error"), false);
});

test("settleSave: true, void and a resolved promise succeed", async () => {
  assert.deepEqual(await settleSave(() => true), { ok: true });
  assert.deepEqual(await settleSave(() => {}), { ok: true });
  assert.deepEqual(await settleSave(async () => {}), { ok: true });
  assert.deepEqual(await settleSave(async () => true), { ok: true });
});

test("settleSave: false fails with no message", async () => {
  assert.deepEqual(await settleSave(() => false), { ok: false });
  assert.deepEqual(await settleSave(async () => false), { ok: false });
});

test("settleSave: a throw fails and carries the message", async () => {
  assert.deepEqual(
    await settleSave(() => {
      throw new Error("Server said no");
    }),
    { ok: false, thrownMessage: "Server said no" }
  );
  assert.deepEqual(
    await settleSave(async () => {
      throw new Error("Async no");
    }),
    { ok: false, thrownMessage: "Async no" }
  );
  assert.deepEqual(
    await settleSave(() => {
      throw "plain string";
    }),
    { ok: false, thrownMessage: undefined }
  );
});
