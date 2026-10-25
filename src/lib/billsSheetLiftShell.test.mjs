// Source guard for F10 (#438, #432). String checks on source files: they prove the
// pieces are wired, NOT how anything behaves on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("bills-client holds the open-sheet state and renders both detail sheets once", () => {
  const code = stripComments(read("app/bills/bills-client.tsx"));
  assert.ok(/const \[openSheet, setOpenSheet\] = useState</.test(code));
  assert.equal((code.match(/<BillDetailSheet/g) || []).length, 1);
  assert.equal((code.match(/<ExpenseDetailSheet/g) || []).length, 1);
  // The sheet item comes from the full lists, not the filtered ones.
  assert.ok(/sheetBill = [^;]*bills\.find\(/.test(code));
  assert.ok(/sheetExpense =[^;]*expenses\.find\(/.test(code));
  assert.ok(!/filteredBills\.find|filteredExpenses\.find/.test(code));
});

test("bills-client keeps the ?billId= deep link and removes it on close", () => {
  const code = stripComments(read("app/bills/bills-client.tsx"));
  assert.ok(code.includes('searchParams?.get("billId")'));
  assert.ok(code.includes('params.delete("billId")'));
  assert.ok(code.includes("router.replace("));
});

test("BillCard and ExpenseCard no longer own or import the detail sheets", () => {
  for (const rel of ["components/BillCard.tsx", "components/ExpenseCard.tsx"]) {
    const code = stripComments(read(rel));
    assert.ok(!/DetailSheet/.test(code), `${rel} still mentions a detail sheet`);
    assert.ok(!/isDetailOpen/.test(code), `${rel} still has isDetailOpen`);
    assert.ok(/onOpen/.test(code), `${rel} needs an onOpen prop`);
  }
});

test("addBill and addExpense roll back the item when the splits insert fails", () => {
  const t = read("context/AppContext.tsx");
  assert.ok(/async function rollBackInsertedItem\(/.test(t));
  const helper = t.slice(t.indexOf("async function rollBackInsertedItem("), t.indexOf("async function addBill("));
  assert.ok(helper.includes(".delete().eq(\"id\", id).select()"));
  assert.ok(helper.includes("!data?.length"));
  const bill = t.slice(t.indexOf("async function addBill("), t.indexOf("async function updateBill("));
  assert.ok(/rollBackInsertedItem\("bills", newBill\.id\)/.test(bill));
  assert.ok(bill.indexOf("rollBackInsertedItem") < bill.indexOf("throw splitsError"));
  const exp = t.slice(t.indexOf("async function addExpense("), t.indexOf("async function updateExpense("));
  assert.ok(/rollBackInsertedItem\("expenses", newExpense\.id\)/.test(exp));
  assert.ok(exp.indexOf("rollBackInsertedItem") < exp.indexOf("throw splitsError"));
});
