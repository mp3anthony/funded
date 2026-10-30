// Source guard for the Needs you strip and the Log / Confirm Pay card (R20, #407).
// String checks on source files: they prove the pieces are wired, NOT how anything behaves at run time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("needsYou lib has no imports", () => {
  assert.ok(!/^\s*import\s/m.test(stripComments(read("lib/needsYou.ts"))));
});

test("the old Enter Pay Amount pop-up is gone", () => {
  assert.ok(!existsSync(join(SRC, "components/EnterPayAmountModal.tsx")));
  assert.ok(!read("app/payday/payday-client.tsx").includes("EnterPayAmountModal"));
});

test("payday-client renders the strip and one card, with no alert() and no device clock for due pays", () => {
  const t = stripComments(read("app/payday/payday-client.tsx"));
  assert.ok(t.includes("<NeedsYouStrip"));
  assert.equal((t.match(/<LogPayCard/g) ?? []).length, 1);
  assert.ok(!/\balert\(/.test(t));
  assert.ok(t.includes("isLoggableYmd(schedule.next_pay_date, todayYmd)"));
  assert.ok(!t.includes("nextPay.getTime() <= today.getTime()"));
  assert.ok(t.includes("skipDuePay(") && t.includes("skipPendingPay("));
  // The per-row Log Pay button is gone: the strip is the one entry point.
  assert.ok(!t.includes("Enter Pay Amount") && !t.includes(String.raw`"Log Pay"`));
});

test("LogPayCard: SingleCard with Different amount, Didn't get paid and a Skip box", () => {
  const t = read("components/LogPayCard.tsx");
  assert.ok(t.includes("<SingleCard"));
  assert.ok(t.includes("Yes, it landed"));
  assert.ok(t.includes("Different amount"));
  assert.ok(t.includes("Didn't get paid"));
  assert.ok(t.includes('confirmLabel="Skip pay"') && t.includes('successToast="Pay skipped"'));
  assert.ok(!t.includes("rounded-[2px]"));
});

test("SingleCard takes one or several secondary pills", () => {
  const t = read("components/ui/SingleCard.tsx");
  assert.ok(t.includes("SecondaryAction[]"));
  assert.ok(t.includes("Array.isArray(secondaryAction)"));
});

test("AppContext: confirm throws, skips exist, the due skip is conditional on the date", () => {
  const t = stripComments(read("context/AppContext.tsx"));
  assert.ok(t.includes("async function skipDuePay("));
  assert.ok(t.includes("async function skipPendingPay("));
  const skipDue = t.slice(t.indexOf("async function skipDuePay("), t.indexOf("async function skipPendingPay("));
  assert.ok(skipDue.includes('.eq("next_pay_date", schedule.next_pay_date)'));
  // skipPendingPay deletes the row only: it never touches pay_schedules.
  const skipPending = t.slice(t.indexOf("async function skipPendingPay("), t.indexOf("async function autoLogMissedPays("));
  assert.ok(!skipPending.includes("pay_schedules"));
  const confirm = t.slice(t.indexOf("async function confirmAndUpdatePay("), t.indexOf("async function skipDuePay("));
  assert.ok(confirm.includes("throw error;"));
});

test("confirming a Pending pay runs rules and the surplus suggestion like logging does (#454)", () => {
  const ctx = stripComments(read("context/AppContext.tsx"));
  const confirm = ctx.slice(ctx.indexOf("async function confirmAndUpdatePay("), ctx.indexOf("async function skipDuePay("));
  // Only a Pending row flips, and a no-row result throws: a second confirm cannot re-run the rules.
  assert.ok(confirm.includes('.eq("status", "pending")'));
  assert.ok(confirm.includes(".maybeSingle()") && confirm.includes("if (!data)"));
  // The rule payout uses the amount just saved, not the stale Pending amount in state.
  assert.ok(ctx.includes("knownPayAmount?: number"));

  const t = stripComments(read("app/payday/payday-client.tsx"));
  assert.equal((t.match(/const runPayAftermath = /g) ?? []).length, 1);
  const aftermath = t.slice(t.indexOf("const runPayAftermath = "), t.indexOf("const handleSavePay = "));
  assert.ok(aftermath.includes("checkAndApplyRules(") && aftermath.includes("applyRuleAllocation(rule, historyId, amount)"));
  assert.ok(aftermath.includes("setSurplusInfo("));
  // Both save paths call the one helper; rules only run after the save succeeded.
  const save = t.slice(t.indexOf("const handleSavePay = "), t.indexOf("const handleSkipPay = "));
  assert.equal((save.match(/runPayAftermath\(/g) ?? []).length, 2);
  assert.ok(save.indexOf("await confirmAndUpdatePay(") < save.indexOf("runPayAftermath("));
  assert.ok(save.indexOf("if (!newHistory) return false;") < save.lastIndexOf("runPayAftermath("));
  // Skipping a Pending pay never runs rules.
  const skip = t.slice(t.indexOf("const handleSkipPay = "), t.indexOf("const handleAllocateSurplus = "));
  assert.ok(!skip.includes("runPayAftermath") && !skip.includes("applyRuleAllocation"));
});
