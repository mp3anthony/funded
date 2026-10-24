// Source guard for the Setup hub (R32, #419). String checks on source files: they prove
// the pieces are wired, NOT how anything looks or feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");

test("hub exists and the old wizard tail is gone", () => {
  assert.ok(existsSync(join(SRC, "components/OnboardingHub.tsx")));
  assert.ok(!existsSync(join(SRC, "components/OnboardingStep.tsx")));
});

test("hub opens the three existing flows and ticks on save", () => {
  const t = read("components/OnboardingHub.tsx");
  for (const needle of [
    "<AddPayFlow",
    "<AddFlow",
    "<AddGoalFlow",
    'prefill={{ type: "bill" }}',
    'tick("pay")',
    'tick("bill")',
    'tick("goal")',
    "Set up the basics",
    "Optional. You can do any of this later.",
    "Enter app",
    "Getting started guide",
    '"/getting-started"',
    "font-heading",
    "safe-area-inset-bottom",
    "safe-area-inset-top",
  ]) assert.ok(t.includes(needle), `hub missing ${needle}`);
});

test("hub has no square corners, blur or sign out", () => {
  const t = read("components/OnboardingHub.tsx");
  assert.ok(!t.includes("rounded-[2px]"));
  assert.ok(!t.includes("blur-"));
  assert.ok(!t.includes("Sign out"));
});

test("Onboarding goes welcome, create, hub and no longer has the old tail", () => {
  const t = read("components/Onboarding.tsx");
  assert.ok(t.includes('"welcome" | "create" | "join" | "hub"'));
  assert.ok(t.includes("<OnboardingHub"));
  assert.ok(t.includes("householdCreatedRef"));
  for (const gone of ["OnboardingStep", "Skip for now", "Setup Complete", "TOTAL_STEPS", "addPaySchedule", "addBill", "addFund"])
    assert.ok(!t.includes(gone), `Onboarding still has ${gone}`);
});
