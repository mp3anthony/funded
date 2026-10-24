// Source guard for the Payday member cards and member sheet (R21, #408).
// String checks on source files: they prove the pieces are wired, NOT how anything behaves at run time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("paydayCards lib has no imports", () => {
  assert.ok(!/^\s*import\s/m.test(stripComments(read("lib/paydayCards.ts"))));
});

test("payday-client shows a carousel of member cards, with no trash icon, no native confirm and no row list", () => {
  const t = stripComments(read("app/payday/payday-client.tsx"));
  assert.ok(t.includes("<Carousel") && t.includes("autoRotate"));
  assert.ok(t.includes("<MemberPayCard") && t.includes("<MemberPaySheet"));
  assert.ok(t.includes("memberCards("));
  assert.ok(!t.includes("Trash2") && !/(^|[^\w])confirm\(/.test(t));
  assert.ok(!t.includes("sortedSchedules") && !t.includes("handleDeleteSchedule"));
  // The pay schedule sheet is still driven by id, stacked over the member sheet.
  assert.ok(t.includes("selectedScheduleId") && t.includes("paySchedules.find("));
});

test("Compare split pill sits in the header extra slot, in both payment modes, and opens the Suggest Split pop-up", () => {
  const t = read("app/payday/payday-client.tsx");
  assert.ok(/extra=\{/.test(t) && t.includes("Compare split"));
  assert.ok(!t.includes("isJointFund"));
  assert.ok(t.includes("<SuggestSplitSheet") && !t.includes("SuggestSplitPanel"));
});

test("the add flow can start on a member, and the page highlights that member's card", () => {
  const flow = read("components/AddPayFlow.tsx");
  assert.ok(flow.includes("memberId?: string") && flow.includes("askWhose"));
  assert.ok(flow.includes("onAdded?.(id, whose)"));
  const rule = read("components/AddRuleFlow.tsx");
  assert.ok(rule.includes("memberId?: string") && rule.includes("askWhose"));
  const page = stripComments(read("app/payday/payday-client.tsx"));
  assert.ok(page.includes("flash(memberCardKey(memberId))"));
});

test("MemberPayCard: one button body, tabs outside it, ProgressRing, no trash icon", () => {
  const t = read("components/MemberPayCard.tsx");
  assert.ok(t.includes("<ProgressRing") && t.includes("memberCardKey("));
  assert.ok(t.includes("Set up ${member.name}'s pay"));
  assert.ok(!t.includes("rounded-[2px]") && !t.includes("Trash2"));
  // A fixed schedule with no amount says so; only variable pay reads "Variable".
  assert.ok(t.includes("schedule.is_fixed_amount ? \"Amount needed\" : \"Variable\""));
  // The add highlight sits on an inner wrapper, and the button keeps its own text for VoiceOver.
  assert.ok(t.includes("const inner = cn(\"rounded-card\", highlighted && \"row-highlight\")"));
  assert.ok(!t.includes("aria-label={`${member.name}'s pay,"));
});

test("MemberPaySheet: DetailSheet, schedules, Joint Fund contribution card, rules", () => {
  const t = read("components/MemberPaySheet.tsx");
  assert.ok(t.includes("<DetailSheet") && t.includes("<SingleCard"));
  assert.ok(t.includes("isJointFund &&") && t.includes("setContribution("));
  assert.ok(t.includes("<RuleDetailSheet") && t.includes("<AddRuleFlow") && t.includes("ruleRowText("));
  assert.ok(t.includes("flushSync("));
  assert.ok(!t.includes("rounded-[2px]"));
});

test("Contribution amounts left Settings; Suggest Split is now the Compare split pop-up", () => {
  assert.ok(!existsSync(join(SRC, "components/ContributionSettingsSheet.tsx")));
  const settings = read("app/settings/settings-client.tsx");
  assert.ok(!settings.includes("Contribution amounts") && !settings.includes("ContributionSettingsSheet"));
  assert.ok(!settings.includes("Automation rules"));
  assert.ok(!existsSync(join(SRC, "components/SuggestSplitPanel.tsx")));
  const sheet = read("components/SuggestSplitSheet.tsx");
  assert.ok(sheet.includes("export default function SuggestSplitSheet") && sheet.includes("computeMemberIncomes("));
  assert.ok(sheet.includes("applyDirectPaySplits(") && sheet.includes("setContribution(") && sheet.includes("isJointFund"));
  assert.ok(sheet.includes("useReducedMotion") && sheet.includes("useCountUp") && sheet.includes("error={error}"));
  assert.ok(!sheet.includes("rounded-[2px]"));
  assert.ok(read("lib/suggestSplit.ts").includes("export function computeMemberIncomes"));
});

test("Getting started tells people to tap a member's card", () => {
  assert.ok(read("lib/getting-started.ts").includes("tap their card"));
});
