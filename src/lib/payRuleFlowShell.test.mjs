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

test("Payday page opens AddPayFlow and highlights the new schedule's member card (R21)", () => {
  const t = read("app/payday/payday-client.tsx");
  assert.ok(t.includes('from "@/components/AddPayFlow"'));
  assert.ok(t.includes("useRowHighlight") && t.includes("highlighted={highlightKey === memberCardKey(member.id)}"));
  assert.ok(read("components/MemberPayCard.tsx").includes("row-highlight"));
  assert.ok(t.includes("id={memberCardKey(member.id)}") || read("components/MemberPayCard.tsx").includes("id={memberCardKey(member.id)}"));
  assert.ok(t.includes("flash(memberCardKey(memberId))"));
  assert.ok(t.includes("setIsAddScheduleOpen(true)") && t.includes("stripAddSheetParam(searchParams)"));
  assert.ok(t.includes("<PayScheduleDetailSheet"), "edit lives in the detail sheet");
  assert.ok(!t.includes("AddPayScheduleSheet"), "the edit-only sheet is gone");
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
  assert.ok(del.includes(".select()") && del.includes("throw error;") && del.includes("throw err;") && !/return;/.test(del), "deleteRule throws (R11)");
  assert.ok(t.includes('isOwner: !!currentMember && currentMember.role === "owner" && isAcceptedMember(currentMember)'));
});

test("Getting started says Add pay schedule", () => {
  assert.ok(read("lib/getting-started.ts").includes("Add pay schedule"));
});
