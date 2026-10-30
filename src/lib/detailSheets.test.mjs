// Source guard for the bill and expense detail sheets (R10, #397). String checks
// on source files: they prove the pieces are wired, NOT how anything looks or
// feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dueDateLabel } from "./addFlow.ts";
import { dateLabel } from "./addPayFlow.ts";
import { deadlineLabel } from "./addGoalFlow.ts";

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
  // Add due date on a row opens the sheet on the Due date card (F10: the Bills page owns the sheet).
  const row = read("components/BillCard.tsx");
  assert.ok(row.includes('onOpen("dueDate")'));
  const page = read("app/bills/bills-client.tsx");
  assert.ok(page.includes("startField={openSheet?.kind === \"bill\" ? openSheet.startField : undefined}"));
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
  // The Bills page keeps the ?billId= deep link open/close block (moved out of BillCard in F10).
  const card = read("app/bills/bills-client.tsx");
  assert.ok(card.includes('searchParams?.get("billId")') && card.includes("router.replace("));
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

test("DetailSheet has one pinned footer: primary, equal-width pills, Delete last (F03, #466)", () => {
  const t = read("components/ui/DetailSheet.tsx");
  const code = stripComments(t);
  for (const needle of ["primary", "secondary", "footer={footer}", "PILL_CELL", "flex-1", 'variant="destructive"']) {
    assert.ok(code.includes(needle), `DetailSheet missing ${needle}`);
  }
  assert.ok(!/actions/.test(code), "the old top-of-sheet actions prop is gone");
  // Delete is rendered after the secondary pills in the same row.
  assert.ok(code.indexOf("pills.map(") < code.indexOf("{deleteLabel}"), "Delete must come after the secondary pills");
  // The body (children) is not wrapped with the Delete button any more.
  const body = code.slice(code.indexOf("<Dialog"), code.indexOf("</Dialog>"));
  assert.ok(body.includes("{children}"));
  for (const rel of [
    "components/BillDetailSheet.tsx",
    "components/ExpenseDetailSheet.tsx",
    "components/GoalDetailSheet.tsx",
    "components/PayScheduleDetailSheet.tsx",
    "components/RuleDetailSheet.tsx",
    "components/MemberPaySheet.tsx",
  ]) assert.ok(!/actions=/.test(read(rel)), `${rel} still passes actions=`);
});

test("the bill sheet offers one paid action and one date format (F03, #466)", () => {
  const t = read("components/BillDetailSheet.tsx");
  assert.ok(t.includes("billPaidAction("));
  assert.ok(!t.includes("showUndoPayment && ("), "Undo payment is no longer a second pill beside Mark as paid");
  assert.ok(t.includes("dueDateLabel(bill.due_date"), "Due date row uses dueDateLabel");
  assert.ok(!t.includes("<Val>{bill.dueLabel ?? bill.dueDate}</Val>"));
});

test("Due date, Invoice date, Deadline and Next payday read in one format", () => {
  for (const ymd of ["2026-11-13", "2026-01-05", "2027-12-31"]) {
    assert.equal(dateLabel(ymd), dueDateLabel(ymd));
    assert.equal(deadlineLabel(ymd), dueDateLabel(ymd));
  }
  assert.match(dueDateLabel("2026-11-13"), /^13 Nov 2026$/);
});

test("Compare split chips have top padding under the header", () => {
  const t = read("components/SuggestSplitSheet.tsx");
  assert.ok(/aria-label="Steps"/.test(t) && /px-5 pb-3 pt-4/.test(t));
});
