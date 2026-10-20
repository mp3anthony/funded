// Source guard for the New pay schedule and Add rule flows (R09, #396). String checks
// on source files: they prove the pieces are wired, NOT how anything looks or feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const fnBody = (t, start, end) => {
  const i = t.indexOf(start);
  return t.slice(i, t.indexOf(end, i));
};

test("new files exist", () => {
  for (const rel of [
    "lib/addPayFlow.ts",
    "lib/addRuleFlow.ts",
    "components/AddPayFlow.tsx",
    "components/AddRuleFlow.tsx",
  ]) {
    assert.ok(existsSync(join(SRC, rel)), `${rel} missing`);
  }
});

test("both flows sit on StepFlow and the pure rules, with no useEffect and no square corners", () => {
  for (const [rel, lib, call] of [
    ["components/AddPayFlow.tsx", "@/lib/addPayFlow", "addPaySchedule("],
    ["components/AddRuleFlow.tsx", "@/lib/addRuleFlow", "addRule("],
  ]) {
    const t = read(rel);
    for (const needle of [
      'from "@/components/ui/StepFlow"',
      "ChoiceField",
      "hasChanges",
      "successToast=",
      call,
      `from "${lib}"`,
      "isAcceptedMember",
      "isOwner",
    ]) assert.ok(t.includes(needle), `${rel} missing ${needle}`);
    assert.ok(!/\buseEffect\(/.test(stripComments(t)), `${rel} must not call useEffect`);
    assert.ok(!t.includes("rounded-[2px]"), `${rel} has a square corner`);
  }
  assert.ok(read("components/AddPayFlow.tsx").includes("try {"), "AddPayFlow guards onAdded");
  assert.ok(read("components/AddRuleFlow.tsx").includes("goalId?: string"));
});

test("the lib files stay import-free so node can run them", () => {
  for (const rel of ["lib/addPayFlow.ts", "lib/addRuleFlow.ts"]) {
    assert.ok(!/^\s*import\s/m.test(stripComments(read(rel))), `${rel} has an import`);
  }
});

test("AddPayScheduleSheet is edit-only", () => {
  const t = read("components/AddPayScheduleSheet.tsx");
  assert.ok(!t.includes("addPaySchedule("));
  assert.ok(t.includes("!existingSchedule) return null"));
  assert.ok(t.includes("updatePaySchedule("));
});

test("Payday page opens AddPayFlow and highlights the new row on an inner wrapper", () => {
  const t = read("app/payday/payday-client.tsx");
  assert.ok(t.includes('from "@/components/AddPayFlow"'));
  assert.ok(t.includes("useRowHighlight") && t.includes("row-highlight"));
  assert.ok(t.includes("id={payScheduleRowKey(schedule.id)}"));
  assert.ok(t.includes("flash(payScheduleRowKey(id))"));
  assert.ok(t.includes("setIsAddScheduleOpen(true)") && t.includes("stripAddSheetParam(searchParams)"));
  assert.ok(t.includes("existingSchedule={selectedSchedule}"), "edit sheet instance kept");
});

test("Rules sheet opens AddRuleFlow for new rules and only edits in place", () => {
  const t = read("components/RulesSettingsSheet.tsx");
  assert.ok(t.includes('import AddRuleFlow from "./AddRuleFlow"'));
  assert.ok(t.includes("busy={isAddOpen}"), "underlying sheet must ignore Escape while the flow is open");
  assert.ok(!t.includes("addRule("), "adding a rule lives in AddRuleFlow");
  assert.ok(!t.includes("isFormOpen"));
  assert.ok(t.includes('value="contribution"'), "existing contribution rules stay editable");
  assert.ok(t.includes("saveError") && t.includes('role="alert"'));
  assert.ok(t.includes("deleteRule(ruleId)") && t.includes("confirm("), "delete is untouched");
  assert.ok(read("components/AddRuleFlow.tsx").includes("/funds?add=1"), "no-goals line links to Add a goal");
});

test("addPaySchedule and addRule return the id, updateRule throws, isOwner exists", () => {
  const t = read("context/AppContext.tsx");
  assert.ok(t.includes('"id" | "household_id" | "created_at">) => Promise<string>;'));
  assert.equal(
    (t.match(/Omit<(?:PaySchedule|ContributionRule), "id" \| "household_id" \| "created_at">\) => Promise<string>;/g) || []).length,
    2
  );
  const pay = fnBody(t, "async function addPaySchedule(", "async function updatePaySchedule(");
  assert.ok(pay.includes("return String(newSchedule.id);") && pay.includes("throw err;"));
  const add = fnBody(t, "async function addRule(", "async function updateRule(");
  assert.ok(add.includes("return String(data.id);"));
  assert.ok(add.includes("throw error;") && add.includes("throw err;") && !/\breturn;/.test(add));
  const upd = fnBody(t, "async function updateRule(", "async function deleteRule(");
  assert.ok(upd.includes("throw error;") && upd.includes("throw err;") && !/\breturn;/.test(upd));
  const del = fnBody(t, "async function deleteRule(", "async function toggleRuleActive(");
  assert.ok(del.includes("return;") && !del.includes("throw"), "deleteRule is untouched");
  assert.ok(t.includes('isOwner: !!currentMember && currentMember.role === "owner" && isAcceptedMember(currentMember)'));
});

test("Getting started says Add pay schedule", () => {
  assert.ok(read("lib/getting-started.ts").includes("Add pay schedule"));
});
