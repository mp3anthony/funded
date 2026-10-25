// Source guard for the Goals page redesign (R17, #404). String checks on source files:
// they prove the pieces are wired, NOT how anything looks or feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("goalPace lib exists and has no imports", () => {
  assert.ok(existsSync(join(SRC, "lib/goalPace.ts")));
  assert.ok(!/^\s*import\s/m.test(stripComments(read("lib/goalPace.ts"))));
});

test("Goals page: new header, one-line description (F06), Saving-only total, Filter chip, Wish list, empty states", () => {
  const t = read("app/funds/funds-client.tsx");
  assert.ok(!t.includes("avg completion"));
  assert.ok(!t.includes("avgCompletion"));
  assert.ok(t.includes("subtitle="));
  assert.ok(t.includes("savingGoals(funds)"));
  assert.ok(t.includes("savingTotals("));
  assert.ok(t.includes("still to go"));
  assert.ok(t.includes("Filtered total"));
  assert.ok(t.includes("Filter\n"));
  assert.ok(t.includes("Edit order"));
  assert.ok(t.includes("Wish list"));
  assert.ok(t.includes("Add your first goal"));
  assert.ok(t.includes("Clear filter"));
  // The old inline <select> filter and Edit Order text button are gone.
  assert.ok(!t.includes("<select"));
  assert.ok(!t.includes("Savings Goals"));
  // Categories start open and the choice is remembered apart from Bills.
  assert.ok(t.includes('COLLAPSE_SCOPE = "goals"'));
  assert.ok(/loadCollapsed\(userId, COLLAPSE_SCOPE\)/.test(t));
  // Notification links and the add link are unchanged.
  assert.ok(t.includes('searchParams.get("goalId")'));
  assert.ok(t.includes("hasAddSheetParam"));
  assert.ok(t.includes("flash(goalRowKey(goal.id), 600)"));
});

test("Goals page (F07): no Check impact chip; the goal-mode calculator ends in Create rule, Bills keeps Turn into a bill", () => {
  const t = stripComments(read("app/funds/funds-client.tsx"));
  // No standalone chip beside Filter, and no bill plumbing on Goals.
  assert.ok(!t.includes("Check impact"));
  assert.ok(!t.includes("<Calculator"));
  assert.ok(!t.includes("<AddFlow"));
  assert.ok(!t.includes("billPrefill"));
  assert.ok(!t.includes("useHouseholdTotal"));
  // Goal mode calculator -> Add rule flow for that goal, filled in and opened on its summary.
  assert.ok(t.includes("<ImpactCalculator"));
  assert.ok(t.includes("stillToSave(fund.targetAmount, fund.currentAmount)"));
  assert.ok(t.includes('mode="goal"'));
  assert.ok(t.includes("onCreateRule="));
  assert.ok(t.includes("<AddRuleFlow"));
  assert.ok(t.includes('prefill={{ threshold: "0", amount: rulePerPay }}'));
  const calc = read("components/ImpactCalculator.tsx");
  assert.ok(calc.includes("Create rule") && calc.includes("Turn into a bill"));
  assert.ok(read("app/bills/bills-client.tsx").includes("onTurnIntoBill"));
  assert.ok(read("components/AddRuleFlow.tsx").includes("startAtSummary={!!prefill}"));
  assert.ok(read("components/ui/StepFlow.tsx").includes("startAtSummary"));
});

test("AddRuleFlow (F07): a rule on a Wish list goal makes it Active, rule first, failure logged not thrown", () => {
  const t = read("components/AddRuleFlow.tsx");
  const add = t.indexOf("await addRule(");
  const upd = t.indexOf("await updateGoal(");
  assert.ok(add > -1 && upd > add);
  assert.ok(t.includes("isTracking(goal)"));
  assert.ok(t.includes("activeStatus("));
  assert.ok(/catch \(err\) \{\s*console\.error/.test(t));
});

test("GoalRow: ring, pace line, round + hidden when Reached, one tap target", () => {
  const t = read("components/GoalRow.tsx");
  assert.ok(t.includes("<ProgressRing"));
  assert.ok(t.includes("pace.text"));
  assert.ok(t.includes("isReached(fund)"));
  assert.ok(t.includes("{!reached && ("));
  assert.ok(t.includes("<IconCircle"));
  assert.ok(!t.includes("status === \"completed\""));
  assert.ok(!t.includes("Goal Reached!"));
  assert.ok(!t.includes("rounded-[2px]"));
  // The "+" is a sibling of the main button, never nested inside it.
  assert.ok(t.indexOf("</button>") < t.indexOf("<IconCircle"));
});

test("WishRow: name, cost, no Check impact (the goal sheet has it), an empty ring and no add button", () => {
  const t = stripComments(read("components/WishRow.tsx"));
  assert.ok(!t.includes("Check impact"));
  assert.ok(!t.includes("onCheckImpact"));
  assert.ok(!t.includes("<Chip"));
  assert.ok(t.includes("ProgressRing percent={0}"));
  assert.ok(!t.includes("IconCircle"));
  assert.ok(!t.includes("Reached"));
});

test("Goals Filter card: draft with Apply, Reset and Edit order; chip row is only Filter", () => {
  const t = read("app/funds/funds-client.tsx");
  assert.ok(t.includes("draftCategory"));
  assert.ok(/>\s*Apply\s*<\/Button>/.test(t));
  assert.ok(/>\s*Reset\s*<\/Button>/.test(t));
  assert.ok(t.includes("Edit order"));
  assert.ok(!t.includes("openImpact()"));
});

test("GoalDetailSheet: a Just tracking goal gets a Check impact action that closes the sheet first", () => {
  const t = read("components/GoalDetailSheet.tsx");
  assert.ok(t.includes("onCheckImpact"));
  assert.ok(t.includes("Check impact"));
  assert.ok(t.indexOf("onClose();\n    onCheckImpact?.(goal)") > -1);
});

test("Just tracking goals are left out of the places that count money", () => {
  const uses = [
    "lib/dashboardCarousels.ts",
    "components/SurplusSuggestionModal.tsx",
    "components/AddRuleFlow.tsx",
    "app/payday/payday-client.tsx",
  ];
  for (const f of uses) assert.ok(read(f).includes("savingGoals("), `${f} should use savingGoals(`);
  // Reminders: no milestone push for a Just tracking goal.
  assert.ok(read("lib/notifications/generateReminders.ts").includes("fund.status === 'paused'"));
  assert.ok(/from\('funds'\)\s*\.select\([^)]*status/.test(read("app/api/cron/push-reminders/route.ts")));
});

test("categoryCollapse takes a scope so Goals and Bills do not share choices", () => {
  const t = read("lib/categoryCollapse.ts");
  assert.ok(t.includes("scope?: string"));
  assert.ok(read("app/bills/bills-client.tsx").includes("loadCollapsed(userId)"));
});

test("ProgressRing is decorative and uses the shared motion tokens", () => {
  const t = read("components/ui/ProgressRing.tsx");
  assert.ok(t.includes('aria-hidden="true"'));
  assert.ok(t.includes("--duration-structural"));
  assert.ok(t.includes("--ease-enter"));
});

test("F08: no user-visible Just tracking / Kind / Saving goal wording in source (stored ids and comments may keep them)", () => {
  const files = [
    "lib/addGoalFlow.ts",
    "lib/dashboard-tips.ts",
    "lib/getting-started.ts",
    "app/funds/funds-client.tsx",
    "components/AddGoalFlow.tsx",
    "components/GoalFieldCard.tsx",
    "components/GoalDetailSheet.tsx",
    "components/DashboardGoals.tsx",
    "components/WishRow.tsx",
    "components/GoalRow.tsx",
  ];
  for (const f of files) {
    const t = stripComments(read(f));
    assert.ok(!/Just tracking/i.test(t), `${f}: Just tracking`);
    assert.ok(!/\bKind\b/.test(t), `${f}: Kind`);
    assert.ok(!/saving goal/i.test(t), `${f}: saving goal`);
    assert.ok(!/kind of goal/i.test(t), `${f}: kind of goal`);
  }
  assert.ok(read("app/funds/funds-client.tsx").includes("displayCategory"));
});
