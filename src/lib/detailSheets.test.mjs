// Source guard for the bill and expense detail sheets (R10, #397). String checks
// on source files: they prove the pieces are wired, NOT how anything looks or
// feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const ROOT = join(SRC, "..");
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("the old edit sheets and ContributorSplits are gone", () => {
  for (const rel of [
    "components/AddBillSheet.tsx",
    "components/AddExpenseSheet.tsx",
    "components/ContributorSplits.tsx",
  ]) assert.ok(!existsSync(join(SRC, rel)), `${rel} should be deleted`);
  assert.ok(existsSync(join(SRC, "components/ItemFieldCard.tsx")));
});

test("nothing in src names the deleted components", () => {
  for (const rel of [
    "app/page-client.tsx",
    "components/BillCard.tsx",
    "components/ExpenseCard.tsx",
    "components/BillDetailSheet.tsx",
    "components/ExpenseDetailSheet.tsx",
    "components/AddFlowSplitCard.tsx",
    "components/ItemFieldCard.tsx",
  ]) {
    const t = read(rel);
    for (const gone of ["AddBillSheet", "AddExpenseSheet", "ContributorSplits"]) {
      assert.ok(!t.includes(gone), `${rel} still names ${gone}`);
    }
  }
});

test("both sheets sit on DetailSheet and ItemFieldCard, one Row per field", () => {
  for (const rel of ["components/BillDetailSheet.tsx", "components/ExpenseDetailSheet.tsx"]) {
    const t = read(rel);
    for (const needle of [
      'from "@/components/ui/DetailSheet"',
      'from "@/components/ItemFieldCard"',
      "<ItemFieldCard",
      "<DetailSheet",
      "<Row",
      "tall",
      "chevron",
      "onDelete=",
      "deleteConfirm=",
      "deletedToast=",
      "successToast=",
    ]) assert.ok(t.includes(needle), `${rel} missing ${needle}`);
  }
  const card = read("components/ItemFieldCard.tsx");
  for (const needle of ['from "@/components/ui/SingleCard"', "<SingleCard", "ChoiceField", "AddFlowSplitCard", "Clear date"]) {
    assert.ok(card.includes(needle), `ItemFieldCard missing ${needle}`);
  }
});

test("the sheets have no Edit button, no native confirm, no square corners, no useEffect", () => {
  for (const rel of [
    "components/BillDetailSheet.tsx",
    "components/ExpenseDetailSheet.tsx",
    "components/ItemFieldCard.tsx",
  ]) {
    const raw = read(rel);
    const code = stripComments(raw);
    assert.ok(!/onEdit/.test(code), `${rel} must not take onEdit`);
    assert.ok(!/(^|[^\w])confirm\(/.test(code), `${rel} must not call confirm(`);
    assert.ok(!/(^|[^\w])alert\(/.test(code), `${rel} must not call alert(`);
    assert.ok(!raw.includes("rounded-[2px]"), `${rel} has a square corner`);
    assert.ok(!/\buseEffect\(/.test(code), `${rel} must not call useEffect`);
  }
});

test("a tap opens the card with flushSync and focuses its box; startField opens a card on open", () => {
  for (const rel of ["components/BillDetailSheet.tsx", "components/ExpenseDetailSheet.tsx"]) {
    const t = read(rel);
    assert.ok(t.includes("flushSync("), `${rel} must flushSync the card open`);
    assert.ok(t.includes(".focus()"), `${rel} must focus the box in the same tap`);
    assert.ok(t.includes("fieldTakesKeyboard"));
  }
  const bill = read("components/BillDetailSheet.tsx");
  assert.ok(bill.includes("startField"));
  assert.ok(bill.includes("setEditing(startField)"));
  // Add due date on a row opens the sheet on the Due date card.
  const row = read("components/BillCard.tsx");
  assert.ok(row.includes('startField={startField}') && row.includes('setStartField("dueDate")'));
});

test("the bill sheet: actions wait for the save, undo asks first, the due-date question is kept", () => {
  const t = read("components/BillDetailSheet.tsx");
  for (const needle of [
    "useSheetSave",
    "primaryPillLabel",
    "actionError=",
    "<ConfirmDialog",
    "undoPayment(bill)",
    "togglePauseBill(bill.id",
    "NextDueDateDialog",
    "shouldAskNextDueDate",
    "billUpdate(",
    "billFieldError(",
    "UNPAID_STATUS",
    "dueLabel",
  ]) assert.ok(t.includes(needle), `BillDetailSheet missing ${needle}`);
});

test("DetailSheet: busy, actionError, and the Delete question resets when the sheet closes", () => {
  const t = read("components/ui/DetailSheet.tsx");
  for (const needle of ["busy", "actionError", "prevOpen", "setConfirmOpen(false)", "busy={busy || confirmOpen}", "disabled={busy}"]) {
    assert.ok(t.includes(needle), `DetailSheet missing ${needle}`);
  }
  assert.ok(!/\buseEffect\(/.test(stripComments(t)));
});

test("callers hand the sheets the live item, not a stale copy", () => {
  const page = read("app/page-client.tsx");
  assert.ok(page.includes("bills.find("));
  assert.ok(page.includes("selectedBillId"));
  assert.ok(!page.includes("setSelectedBill("));
  // BillCard keeps its ?billId= deep link open/close block unchanged.
  const card = read("components/BillCard.tsx");
  assert.ok(card.includes('searchParams.get("billId")') && card.includes("router.replace("));
  assert.ok(card.includes("params.delete(\"billId\")"));
  // The expense row no longer deletes or edits itself.
  const exp = read("components/ExpenseCard.tsx");
  assert.ok(!exp.includes("deleteExpense") && !exp.includes("onEdit"));
});

test("the four bill actions resolve a boolean; updateBill/updateExpense skip splits when none are passed", () => {
  const t = read("context/AppContext.tsx");
  for (const needle of [
    "markAsPaid: (bill: Bill) => Promise<boolean>;",
    "markAsUnpaid: (bill: Bill) => Promise<boolean>;",
    "undoPayment: (bill: Bill) => Promise<boolean>;",
    "togglePauseBill: (id: string | number, isPaused: boolean) => Promise<boolean>;",
    "deleteBill: (id: string | number) => Promise<void>;",
    "splitsData?: any[]",
    "const touchSplits = splitsData !== undefined;",
    "const touchSplits = expenseData.splits !== undefined;",
    '"dueDate" in billData',
    '"invoiceDate" in billData',
    '"Bill paused"',
    '"Bill resumed"',
  ]) assert.ok(t.includes(needle), `AppContext missing ${needle}`);
  // undoPayment: no generic "Couldn't undo" toast on a real failure any more (the dialog shows a red line).
  const undo = t.slice(t.indexOf("async function undoPayment"), t.indexOf("async function togglePauseBill"));
  assert.ok(undo.length > 0 && !undo.includes("please try again"));
});

test("getting-started says how to change a bill", () => {
  const t = read("lib/getting-started.ts");
  assert.ok(t.includes("To change a bill later, tap it, then tap the line you want to change."));
});

test("conventions document the detail sheets", () => {
  const conv = readFileSync(join(ROOT, "docs/conventions.md"), "utf8");
  assert.ok(conv.includes("Detail sheets (R10, #397)"));
  assert.ok(!conv.includes("AddBillSheet"));
});
