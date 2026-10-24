// Source guard for the Add flow (R07, #394). String checks on source files: they
// prove the pieces are wired, NOT how anything looks or feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const ROOT = join(SRC, "..");
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("new files exist, ItemTypeToggle is gone", () => {
  for (const rel of [
    "lib/addFlow.ts",
    "components/AddFlow.tsx",
    "components/AddFlowSplitCard.tsx",
    "hooks/useRowHighlight.ts",
  ]) assert.ok(existsSync(join(SRC, rel)), `${rel} missing`);
  assert.ok(!existsSync(join(SRC, "components/ItemTypeToggle.tsx")));
});

test("nothing in src, docs or getting-started still names ItemTypeToggle or the Item Type switch", () => {
  for (const rel of [
    "components/AddFlow.tsx",
    "app/bills/bills-client.tsx",
    "lib/getting-started.ts",
  ]) {
    const t = read(rel);
    assert.ok(!t.includes("ItemTypeToggle"), `${rel} names ItemTypeToggle`);
    assert.ok(!t.includes("Item Type"), `${rel} mentions Item Type`);
  }
  const conv = readFileSync(join(ROOT, "docs/conventions.md"), "utf8");
  assert.ok(!conv.includes("ItemTypeToggle"));
});

test("AddFlow sits on StepFlow, the shared controls and the pure rules", () => {
  const t = read("components/AddFlow.tsx");
  for (const needle of [
    'from "@/components/ui/StepFlow"',
    "ChoiceField",
    "NotesToggle",
    "hasChanges",
    "successToast=",
    "canSubmit=",
    "addBill(",
    "addExpense(",
    'from "@/lib/addFlow"',
    "try {",
  ]) assert.ok(t.includes(needle), `AddFlow missing ${needle}`);
});

test("AddFlow and AddFlowSplitCard have no useEffect", () => {
  for (const rel of ["components/AddFlow.tsx", "components/AddFlowSplitCard.tsx"]) {
    assert.ok(!/\buseEffect\(/.test(stripComments(read(rel))), `${rel} must not call useEffect`);
  }
});

test("new components do not bring back the forced square corner", () => {
  for (const rel of ["components/AddFlow.tsx", "components/AddFlowSplitCard.tsx"]) {
    assert.ok(!read(rel).includes("rounded-[2px]"), rel);
  }
});

test("Bills page opens AddFlow and highlights the new row on an inner wrapper", () => {
  const t = read("app/bills/bills-client.tsx");
  assert.ok(t.includes('from "@/components/AddFlow"'));
  assert.ok(!t.includes("AddBillSheet") && !t.includes("AddExpenseSheet"));
  assert.ok(t.includes("useRowHighlight") && t.includes("row-highlight"));
  assert.ok(t.includes("rowKey("));
  assert.ok(t.includes("id={`bill-${row.item.id}`}"));
  assert.ok(t.includes("id={`expense-${row.item.id}`}"));
  // ?add=1 still opens the flow once and strips the param.
  assert.ok(t.includes("setIsAddOpen(true)"));
  assert.ok(t.includes("stripAddSheetParam(searchParams)"));
});

test("the old edit sheets are gone (R10)", () => {
  for (const rel of ["components/AddBillSheet.tsx", "components/AddExpenseSheet.tsx"]) {
    assert.ok(!existsSync(join(SRC, rel)), `${rel} should be deleted`);
  }
});

test("highlight styles exist", () => {
  const css = read("app/globals.css");
  assert.ok(css.includes("@keyframes row-highlight") && css.includes(".row-highlight"));
});

test("Onboarding still saves its first bill through addBill with the same payload keys", () => {
  const t = read("components/Onboarding.tsx");
  assert.ok(t.includes("addBill("));
  for (const k of ["name:", "amount", "category:", "invoiceDate:", "dueDate:", "paymentType:", "assignee:", "notes:", "frequency:"]) {
    assert.ok(t.includes(k), `Onboarding payload lost ${k}`);
  }
});
