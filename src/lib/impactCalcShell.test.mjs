// Source guard for the Impact calculator (R16, #403). String checks on source files:
// they prove the pieces are wired, NOT how anything looks or feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("impactCalc lib exists and has no imports", () => {
  assert.ok(existsSync(join(SRC, "lib/impactCalc.ts")));
  assert.ok(!/^\s*import\s/m.test(stripComments(read("lib/impactCalc.ts"))));
});

test("ImpactCalculator: Dialog shell, Nothing is saved, Turn into a bill, reset on open", () => {
  const t = read("components/ImpactCalculator.tsx");
  assert.ok(t.includes("<Dialog"));
  assert.ok(t.includes("Nothing is saved"));
  assert.ok(t.includes("Turn into a bill"));
  assert.ok(t.includes("billPrefill("));
  assert.ok(t.includes("impactFromVerdict("));
  assert.ok(t.includes("useVerdict(extraWeekly, true)") && t.includes("useVerdict(0, true)") && t.includes("coverageNote(isJointFund)"));
  assert.ok(t.includes("prevOpen"));
  assert.ok(t.includes("initial?"));
  // It closes itself before handing over, so dialogs never stack.
  assert.ok(t.indexOf("onClose();") < t.indexOf("onTurnIntoBill("));
});

test("bills-client: Check impact chip, unfiltered total, prefill passed and cleared on close", () => {
  const t = read("app/bills/bills-client.tsx");
  assert.ok(t.includes("Check impact"));
  assert.ok(t.includes("<ImpactCalculator"));
  assert.ok(t.includes("currentTotal={householdTotal}"));
  assert.ok(t.includes("useHouseholdTotal(displayFrequency)"));
  assert.ok(/filterActive: false/.test(read("hooks/useHouseholdTotal.ts")));
  assert.ok(t.includes("prefill={addPrefill}"));
  // Prefill is cleared when the flow is opened normally, not on close (no Type-card flash while it fades).
  assert.ok(t.includes("onAdd={openAdd}"));
  assert.ok(t.includes("onClick={openAdd}"));
  assert.ok(!/onClose=\{\(\) => \{\s*setIsAddOpen\(false\);\s*setAddPrefill/.test(t));
  assert.ok(/setAddPrefill\(undefined\);\s*setIsAddOpen\(true\)/.test(t));
  // The chip sits right after the Filter chip, and the chip row has no Type or Due chips (F04).
  assert.ok(t.indexOf("Check impact") > t.indexOf("(filters chosen)"));
  const row = t.slice(t.indexOf('aria-label="Filters"'), t.indexOf("Bills & Expenses Scrollable Container"));
  assert.ok(!row.includes("TYPE_OPTIONS") && !row.includes("DUE_OPTIONS"));
});

test("AddFlow: prefill skips the Type card and seeds the dirty baseline", () => {
  const t = read("components/AddFlow.tsx");
  assert.ok(t.includes("prefill?: Partial<AddFlowValues>"));
  assert.ok(t.includes("stepKeys(values.type, typeKnown)"));
  assert.ok(t.includes("!typeKnown"));
  assert.ok((t.match(/isJointFund, prefill/g) ?? []).length >= 3);
  assert.ok(read("lib/addFlow.ts").includes("...args.prefill"));
});
