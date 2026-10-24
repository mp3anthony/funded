// Source guard for the Bills rows (R15, #402). String checks on source files: they
// prove the pieces are wired, NOT how anything looks or feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("new libs exist and have no imports", () => {
  for (const rel of ["lib/billRow.ts", "lib/categoryCollapse.ts"]) {
    assert.ok(existsSync(join(SRC, rel)), `${rel} missing`);
    assert.ok(!/^\s*import\s/m.test(stripComments(read(rel))), `${rel} must have zero imports`);
  }
});

test("BillCard: no Tap for more, no DUE text, no Manual pill, no overlap hack", () => {
  const t = read("components/BillCard.tsx");
  const code = stripComments(t);
  assert.ok(!/Tap for more/i.test(code));
  assert.ok(!/`DUE |"DUE /.test(code));
  assert.ok(!code.includes('"Manual"'));
  assert.ok(!code.includes("pt-[17px]"));
  assert.ok(!code.includes("pointer-events-none"));
});

test("BillCard: countdown, tick and in-row next-due question are wired", () => {
  const t = read("components/BillCard.tsx");
  assert.ok(t.includes("dueCountdown("));
  assert.ok(t.includes("showTick("));
  assert.ok(t.includes("`Mark ${bill.name} as paid`"));
  assert.ok(t.includes("rounded-full"));
  assert.ok(t.includes("shouldAskNextDueDate(bill)"));
  assert.ok(t.includes("<NextDueDateDialog"));
  assert.ok(t.includes("markDatelessBillPaid(bill, { nextDue: ymd })"));
  assert.ok(t.includes("markDatelessBillPaid(bill, { mute: true })"));
  assert.ok(t.includes("markAsPaid(bill)"));
  // The row button must not carry an aria-label that repeats its visible text.
  assert.ok(!/aria-label=\{`\$\{bill\.name\},/.test(t));
});

test("ExpenseCard: amount follows the frequency, no Tap for more, circle avatars", () => {
  const t = read("components/ExpenseCard.tsx");
  assert.ok(!/Tap for more/i.test(stripComments(t)));
  assert.ok(t.includes('convertAmount(Number(expense.amount), "weekly", displayFrequency)'));
  assert.ok(!t.includes("rounded-lg"));
});

test("bills-client: A-to-Z order, collapse memory, subtotal, expense frequency", () => {
  const t = read("app/bills/bills-client.tsx");
  assert.ok(t.includes(".sort(compareRows)"));
  assert.ok(t.includes("loadCollapsed(") && t.includes("saveCollapsed("));
  assert.ok(t.includes("categorySubtotal("));
  assert.ok(!t.includes("expandedCategories"));
  assert.ok(!/amount-sorted/.test(t));
  assert.ok(/<ExpenseCard[\s\S]*?displayFrequency=\{displayFrequency\}/.test(t));
});

test("Bills Filter card: draft, Apply, Reset, Edit order; tick sits left of the amount in a fixed slot", () => {
  const t = read("app/bills/bills-client.tsx");
  assert.ok(t.includes("applyDraft"));
  assert.ok(/>\s*Apply\s*<\/Button>/.test(t));
  assert.ok(/>\s*Reset\s*<\/Button>/.test(t));
  assert.ok(t.includes("Edit order"));
  // Frequency lives in the Filter card (draft + Apply), not as a page-body pill row.
  assert.ok(t.includes("draftFrequency") && t.includes('aria-label="Show amounts as"'));
  assert.ok(!t.includes("overflow-x-auto"));
  assert.ok(t.includes("draftFromFilters(filterState)"));
  const b = read("components/BillCard.tsx");
  assert.ok(b.includes("w-11 shrink-0"));
  assert.ok(b.indexOf("Mark ${bill.name} as paid") < b.lastIndexOf("${formattedAmount}"));
  assert.ok(b.includes("sr-only") && b.includes('tabIndex={-1}'));
  const e = read("components/ExpenseCard.tsx");
  assert.ok(e.includes("w-11 shrink-0") && e.includes('tabIndex={-1}'));
});

test("markAsPaid: early-pay path has an Undo toast and the error paths speak", () => {
  const t = read("context/AppContext.tsx");
  const start = t.indexOf("async function markAsPaid(");
  const body = t.slice(start, t.indexOf("async function markDatelessBillPaid", start));
  assert.ok(body.includes('message: "Marked as paid"'));
  assert.ok(body.includes('actionLabel: "Undo"'));
  assert.equal(body.split("Couldn't mark as paid, try again.").length - 1, 3);
});

test("getting started no longer mentions Tap for more or a Manual pill", () => {
  const t = read("lib/getting-started.ts");
  assert.ok(!/tap for more/i.test(t));
  assert.ok(!/Manual pill/i.test(t));
});
