// Source guard for the Add goal flow (R08, #395). String checks on source files: they
// prove the pieces are wired, NOT how anything looks or feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("new files exist, AddGoalSheet is gone", () => {
  for (const rel of ["lib/addGoalFlow.ts", "components/AddGoalFlow.tsx"]) {
    assert.ok(existsSync(join(SRC, rel)), `${rel} missing`);
  }
  assert.ok(!existsSync(join(SRC, "components/AddGoalSheet.tsx")));
  for (const rel of ["app/funds/funds-client.tsx", "components/Onboarding.tsx", "components/AddGoalFlow.tsx"]) {
    assert.ok(!read(rel).includes("AddGoalSheet"), `${rel} still names AddGoalSheet`);
  }
});

test("AddGoalFlow sits on StepFlow and the pure rules, with no useEffect", () => {
  const t = read("components/AddGoalFlow.tsx");
  for (const needle of [
    'from "@/components/ui/StepFlow"',
    "ChoiceField",
    "hasChanges",
    "successToast=",
    "addFund(",
    'from "@/lib/addGoalFlow"',
    "try {",
  ]) assert.ok(t.includes(needle), `AddGoalFlow missing ${needle}`);
  assert.ok(!/\buseEffect\(/.test(stripComments(t)), "AddGoalFlow must not call useEffect");
  assert.ok(!t.includes("rounded-[2px]"));
});

test("addGoalFlow.ts stays import-free so node can run it", () => {
  assert.ok(!/^\s*import\s/m.test(stripComments(read("lib/addGoalFlow.ts"))));
});

test("Goals page opens AddGoalFlow and highlights the new row on an inner wrapper", () => {
  const t = read("app/funds/funds-client.tsx");
  assert.ok(t.includes('from "@/components/AddGoalFlow"'));
  assert.ok(t.includes("useRowHighlight") && t.includes("row-highlight"));
  assert.ok(t.includes("id={goalRowKey(fund.id)}"));
  assert.ok(t.includes('setCategoryFilter("All")'));
  assert.ok(t.includes("flash(goalRowKey(goal.id)"));
  assert.ok(t.includes("setIsAddOpen(true)") && t.includes("stripAddSheetParam(searchParams)"));
});

test("addFund returns the new id, updateGoal throws", () => {
  const t = read("context/AppContext.tsx");
  assert.ok(t.includes("addFund: (fund: NewFund) => Promise<string>;"));
  assert.ok(t.includes("return String(data.id);"));
  const start = t.indexOf("async function updateGoal(");
  const body = t.slice(start, t.indexOf("async function deleteGoal(", start));
  assert.ok(body.includes("throw error;"), "updateGoal must throw in the error branch");
  assert.ok(body.includes("throw err;"), "updateGoal must throw in the catch");
});

test("GoalDetailSheet saves through goalUpdate and shows a failed save via the field card", () => {
  const t = read("components/GoalDetailSheet.tsx");
  assert.ok(t.includes("updateGoal(goal.id, goalUpdate(draft, goal))"));
  assert.ok(read("components/ui/SingleCard.tsx").includes("error={error}"));
});

test("Getting started says Add goal", () => {
  const t = read("lib/getting-started.ts");
  assert.ok(t.includes("tap Add goal."));
  assert.ok(!t.includes("Create Goal"));
});
