// Source guard for deleting pay history (R24, #411). String checks on source files:
// they prove the rule is wired, NOT how anything looks or feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("deletePayHistory removes the row and never writes pay_schedules", () => {
  const t = stripComments(read("context/AppContext.tsx"));
  const start = t.indexOf("async function deletePayHistory");
  const end = t.indexOf("function calculateAveragePay");
  assert.ok(start > 0 && end > start);
  const body = t.slice(start, end);
  assert.ok(body.includes('.from("pay_history").delete()'));
  assert.ok(!body.includes("pay_schedules"), "delete must not touch the schedule date");
  assert.ok(!body.includes("setPaySchedules"));
});

test("the delete box says the next pay date will not change, and the card toasts", () => {
  const t = read("components/PayHistoryCard.tsx");
  assert.ok(t.includes("The next pay date won't change."));
  assert.ok(t.includes('showToast({ message: "Pay deleted" })'));
});
