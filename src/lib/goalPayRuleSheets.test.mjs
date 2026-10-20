// Source guard for the goal, pay schedule and rule detail sheets (R11, #398). String
// checks on source files: they prove the pieces are wired, NOT how anything looks or
// feels on a device.
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

const SHEETS = [
  "components/GoalDetailSheet.tsx",
  "components/PayScheduleDetailSheet.tsx",
  "components/RuleDetailSheet.tsx",
];
const CARDS = [
  "components/GoalFieldCard.tsx",
  "components/PayFieldCard.tsx",
  "components/RuleFieldCard.tsx",
  "components/AddAmountModal.tsx",
];

test("the old edit sheets are gone and nothing names them", () => {
  const gone = [
    "EditGoalSheet",
    "EditFundSheet",
    "FundDetailSheet",
    "AddPayScheduleSheet",
    "RuleCard",
  ];
  for (const name of gone) {
    assert.ok(!existsSync(join(SRC, `components/${name}.tsx`)), `${name}.tsx should be deleted`);
  }
  for (const rel of [
    "app/page-client.tsx",
    "app/funds/funds-client.tsx",
    "app/payday/payday-client.tsx",
    "app/settings/settings-client.tsx",
    "components/AddPayFlow.tsx",
    "components/RulesSettingsSheet.tsx",
    ...SHEETS,
    ...CARDS,
  ]) {
    const t = read(rel);
    for (const name of gone) assert.ok(!t.includes(name), `${rel} still names ${name}`);
  }
});

test("the sheets sit on DetailSheet and the cards on SingleCard, one Row per field", () => {
  for (const rel of SHEETS) {
    const t = read(rel);
    for (const needle of [
      'from "@/components/ui/DetailSheet"',
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
  for (const rel of CARDS) {
    assert.ok(read(rel).includes("<SingleCard"), `${rel} must use SingleCard`);
  }
});

test("no Edit button, native confirm or alert, square corner or useEffect in the new pieces", () => {
  for (const rel of [...SHEETS, ...CARDS, "components/RulesSettingsSheet.tsx"]) {
    const raw = read(rel);
    const code = stripComments(raw);
    assert.ok(!/onEdit/.test(code), `${rel} must not take onEdit`);
    assert.ok(!/(^|[^\w])confirm\(/.test(code), `${rel} must not call confirm(`);
    assert.ok(!/(^|[^\w])alert\(/.test(code), `${rel} must not call alert(`);
    assert.ok(!raw.includes("rounded-[2px]"), `${rel} has a square corner`);
    assert.ok(!/\buseEffect\(/.test(code), `${rel} must not call useEffect`);
  }
});

test("a tap opens the card with flushSync and focuses its box", () => {
  for (const rel of SHEETS) {
    const t = read(rel);
    assert.ok(t.includes("flushSync("), `${rel} must flushSync the card open`);
    assert.ok(t.includes(".focus()"), `${rel} must focus the box in the same tap`);
  }
  const rule = read("components/RuleDetailSheet.tsx");
  assert.ok(rule.includes("ruleFieldTakesKeyboard"));
  assert.ok(read("components/PayScheduleDetailSheet.tsx").includes("payFieldTakesKeyboard"));
  assert.ok(read("components/GoalDetailSheet.tsx").includes("goalFieldTakesKeyboard"));
});

test("the goal sheet: rules section, stacked layers, delete takes its rules", () => {
  const t = read("components/GoalDetailSheet.tsx");
  for (const needle of [
    "Rules for this goal",
    "<AddRuleFlow",
    "goalId=",
    "<RuleDetailSheet",
    "<AddAmountModal",
    "Add amount",
    "goalUpdate(draft, goal)",
    "goalStatusLabel",
    "rulesForGoal(",
    "deleteRule(",
    "deleteGoal(goal.id)",
    "busy={editing !== null || addAmountOpen || addRuleOpen || activeRuleId !== null}",
  ]) assert.ok(t.includes(needle), `GoalDetailSheet missing ${needle}`);
});

test("the rule sheet: on/off pill, goal move, ruleUpdate, live lookup", () => {
  const t = read("components/RuleDetailSheet.tsx");
  for (const needle of [
    "contributionRules.find(",
    "useSheetSave",
    "Turn off",
    "Turn on",
    "ruleUpdate(",
    "ruleFieldError(",
    "householdContributions",
    "canPickMember(",
    "Joint contribution",
    'deletedToast="Rule deleted"',
  ]) assert.ok(t.includes(needle), `RuleDetailSheet missing ${needle}`);
});

test("the pay schedule sheet: Whose pay gated, contribution read-only, Created gone", () => {
  const t = read("components/PayScheduleDetailSheet.tsx");
  for (const needle of [
    "canPickMember(",
    "payScheduleUpdate(draft)",
    "payFieldError(",
    "updatePaySchedule(paySchedule.id",
    "deletePaySchedule(paySchedule.id)",
    "householdContributions",
    'label="Contribution"',
  ]) assert.ok(t.includes(needle), `PayScheduleDetailSheet missing ${needle}`);
  assert.ok(!t.includes("created_at") && !t.includes("Created"));
});

test("AddAmountModal adds to the goal itself so a failed save shows (#435)", () => {
  const t = read("components/AddAmountModal.tsx");
  assert.ok(t.includes("addToGoal(") && t.includes("<SingleCard") && t.includes("inputId"));
  assert.ok(!t.includes("onConfirm"));
});

test("addToGoal and deleteRule throw instead of swallowing", () => {
  const t = read("context/AppContext.tsx");
  const add = fnBody(t, "async function addToGoal(", "async function addMoneyToFund(");
  assert.ok(add.includes("throw error;") && add.includes("throw err;"));
  assert.ok(add.includes("String(f.id) === String(id)"));
  assert.ok(!/\breturn;/.test(add), "addToGoal must not return silently");
  const del = fnBody(t, "async function deleteRule(", "async function toggleRuleActive(");
  assert.ok(del.includes(".select()") && del.includes("throw error;") && del.includes("throw err;"));
  assert.ok(!/\breturn;/.test(del));
});

test("the surplus allocation tells the person when it fails", () => {
  const t = read("app/payday/payday-client.tsx");
  assert.ok(fnBody(t, "const handleAllocateSurplus", "setSurplusInfo(null)").includes("alert("));
});

test("callers hand the sheets the live item by id", () => {
  const funds = read("app/funds/funds-client.tsx");
  assert.ok(funds.includes("funds.find(") && funds.includes("selectedGoalId"));
  assert.ok(funds.includes("setSelectedGoalId(String(target.id))"), "the ?goalId= deep link opens by id");
  assert.ok(!funds.includes("isDetailOpen") && !funds.includes("handleDeleteGoal"));
  assert.ok(funds.includes("inputId={addAmountInputId}") && funds.includes("flushSync("));
  const page = read("app/page-client.tsx");
  assert.ok(page.includes("funds.find(") && page.includes("selectedGoalId"));
  assert.ok(!page.includes("handleDeleteGoal"));
  const pay = read("app/payday/payday-client.tsx");
  assert.ok(pay.includes("paySchedules.find(") && pay.includes("selectedScheduleId"));
});

test("the Settings rules list opens the rule sheet and keeps AddRuleFlow", () => {
  const t = read("components/RulesSettingsSheet.tsx");
  assert.ok(t.includes("<RuleDetailSheet") && t.includes("<AddRuleFlow") && t.includes("ruleRowText("));
});

test("the add flows reuse the shared canPickMember", () => {
  for (const rel of ["components/AddPayFlow.tsx", "components/AddRuleFlow.tsx"]) {
    const t = read(rel);
    assert.ok(t.includes("canPickMember(currentUser.isOwner"), `${rel} must call the lib canPickMember`);
  }
});

test("Getting started says how to change a goal or pay schedule", () => {
  assert.ok(read("lib/getting-started.ts").includes("tap it, then tap the line you want to change"));
});
