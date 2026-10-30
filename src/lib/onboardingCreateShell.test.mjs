// Source guard for the full-screen create-household flow (R31, #418). String checks on
// source files: they prove the pieces are wired, NOT how anything looks or feels on a device.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("new files exist", () => {
  for (const rel of [
    "lib/onboardingCreate.ts",
    "components/OnboardingWelcome.tsx",
    "components/OnboardingCreateFlow.tsx",
  ]) assert.ok(existsSync(join(SRC, rel)), `${rel} missing`);
});

test("onboardingCreate.ts stays import-free so node can run it", () => {
  assert.ok(!/^\s*import\s/m.test(stripComments(read("lib/onboardingCreate.ts"))));
});

test("new onboarding files use no square corners, no blobs, no blur overlay", () => {
  for (const rel of ["components/OnboardingWelcome.tsx", "components/OnboardingCreateFlow.tsx"]) {
    const t = read(rel);
    assert.ok(!t.includes("rounded-[2px]"), `${rel} has a square corner`);
    assert.ok(!t.includes("blur-"), `${rel} has a blur`);
    assert.ok(!t.includes("backdrop-blur"), `${rel} has a blur overlay`);
  }
});

test("Welcome offers Create, Join and Sign out on the page-header title style", () => {
  const t = read("components/OnboardingWelcome.tsx");
  for (const needle of ["Welcome to Funded", "Create a household", "Join with a code", "Sign out", "font-heading"])
    assert.ok(t.includes(needle), `Welcome missing ${needle}`);
});

test("create flow: name then mode, Return is Next, Next sits above the keyboard", () => {
  const t = read("components/OnboardingCreateFlow.tsx");
  for (const needle of [
    "ChoiceField",
    "BackCircle",
    'enterKeyHint="next"',
    "HOUSEHOLD_NAME_MAX",
    "--keyboard-inset",
    "safe-area-inset-bottom",
    "Setting things up",
    "role=\"alert\"",
    "onCreate(cleanHouseholdName(name), isJointFund(mode))",
  ]) assert.ok(t.includes(needle), `create flow missing ${needle}`);
});

test("Onboarding creates once, from the flow, and never flips isOnboarded itself", () => {
  const t = read("components/Onboarding.tsx");
  assert.ok(t.includes("householdCreatedRef"));
  assert.ok(t.includes("createHousehold(name, jointFund)"));
  assert.equal(t.split("createHousehold(").length - 1, 1, "createHousehold called from one place");
  assert.ok(!t.includes("updateHouseholdPaymentMode"));
  assert.ok(!t.includes("blur-3xl"), "blobs are gone");
  assert.ok(!/setIsOnboarded/.test(t));
});

test("createHousehold takes the payment mode and writes it on insert", () => {
  const t = read("context/AppContext.tsx");
  assert.ok(t.includes("createHousehold: (name: string, isJointFund?: boolean) => Promise<string>;"));
  const start = t.indexOf("async function createHousehold(");
  const body = t.slice(start, t.indexOf("async function setHouseholdName(", start));
  assert.ok(body.includes("is_joint_fund: newIsJointFund"));
  assert.ok(body.includes("setIsJointFund(newIsJointFund);"));
  assert.ok(body.includes("setIsJointFund(!!existing.is_joint_fund);"), "adopt path unchanged");
});
