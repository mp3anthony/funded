// Source guard for the Settings rewrite (R29, #416). String checks on source files:
// they prove the pieces are wired, NOT how anything looks or feels on a device.
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

const settings = read("app/settings/settings-client.tsx");
const code = stripComments(settings);

test("no native confirm or alert, no square corners, no hand-made rounded-xl boxes", () => {
  assert.ok(!/(^|[^\w])confirm\(/.test(code));
  assert.ok(!/(^|[^\w])alert\(/.test(code));
  assert.ok(!settings.includes("rounded-[2px]") && !settings.includes("rounded-xl"));
});

test("Automation rules, the rules sheet and the old payment toggle are gone", () => {
  assert.ok(!settings.includes("Automation rules") && !settings.includes("RulesSettingsSheet"));
  assert.ok(!settings.includes("PaymentModeToggle"));
  assert.ok(!existsSync(join(SRC, "components/PaymentModeToggle.tsx")));
  assert.ok(!existsSync(join(SRC, "components/RulesSettingsSheet.tsx")));
  assert.ok(!code.includes("contributionRules") && !code.includes("isRulesOpen"));
});

test("Profile: email is read-only text and updateMember never sends it", () => {
  assert.ok(!code.includes('type="email"') && !code.includes("setEmail"));
  assert.ok(code.includes("updateMember(currentMember.id, { name: fullName.trim() })"));
  assert.ok(!/updateMember\([^)]*email/.test(code));
  assert.ok(settings.includes("so it can't be changed here"));
  assert.ok(settings.includes('modal") !== "profile"'), "the ?modal=profile deep link stays");
});

test("Household name is an owner-only SingleCard with a Field and a length cap", () => {
  assert.ok(settings.includes('label="Household name"'));
  assert.ok(settings.includes('<SingleCard') && settings.includes('title="Household name"'));
  assert.ok(settings.includes("onSubmit={() => setHouseholdName(nameDraft)}"));
  assert.ok(settings.includes("nameDraft.trim() !== householdName") && settings.includes("maxLength={HOUSEHOLD_NAME_MAX}"));
  assert.ok(settings.includes("chevron={isCurrentUserOwner}") && settings.includes("Owner only"));
});

test("Appearance is inline, with no dialog", () => {
  assert.ok(!settings.includes("showAppearanceDialog") && !settings.includes('title="Appearance"'));
  assert.ok(settings.includes("THEME_OPTIONS") && settings.includes("setTheme(opt.value)") && settings.includes("<Chip"));
});

test("Notifications row: green or amber dot and the daily time", () => {
  assert.ok(settings.includes("Daily at ") && settings.includes("Off, tap to turn on"));
  assert.ok(settings.includes('"bg-success" : "bg-accent"') && settings.includes("hasLiveSubscription"));
});

test("Members: owner-only round Invite member button, role and Pending pills", () => {
  assert.ok(settings.includes('label="Invite member"') && settings.includes("<IconCircle"));
  assert.ok(settings.includes("trailing={") && settings.includes("isCurrentUserOwner ?"));
  assert.ok(settings.includes('"Pending"') && settings.includes('"Owner"'));
  assert.ok(!settings.includes("+ Invite member") && !settings.includes('label="Join code"'));
  assert.ok(settings.includes("rounded-full"), "avatars are round");
});

test("Help card: Updates (with version), Getting started, Report an issue; no standalone version line", () => {
  assert.ok(settings.includes('label="Updates"') && settings.includes("`v${APP_VERSION}`") && settings.includes('href="/patch-notes"'));
  assert.ok(settings.includes('label="Getting started"') && settings.includes('href="/getting-started"'));
  assert.ok(settings.includes('label="Report an issue"') && settings.includes("setIsBugReportOpen(true)"));
  assert.ok(!settings.includes("funded. v"));
  assert.ok(settings.includes("© 2026 HazardousSchematics.com"));
  assert.ok(read("components/ui/Row.tsx").includes("<Link href={href}"), "Row renders a real link for href");
});

test("Log out sits above Leave household, which keeps its dialogs", () => {
  assert.ok(code.indexOf("signOutAndGoToLogin()") < code.indexOf("onClick={openLeaveDialog}"));
  for (const needle of ['"Leave household?"', '"Pick a new owner"', '"Delete household?"', "isDeleteConfirmed("]) {
    assert.ok(settings.includes(needle), `missing ${needle}`);
  }
  assert.ok(settings.includes("border-destructive/40"), "its own red card");
});

test("Payment mode is one pop-up: two cards, inline warning, red Switch pill", () => {
  assert.ok(settings.includes("<PaymentModeSheet"));
  const t = read("components/PaymentModeSheet.tsx");
  assert.ok(t.includes("Joint Fund") && t.includes("Direct Pay") && t.includes("useSheetSave("));
  assert.ok(t.includes("updateHouseholdPaymentMode(target.joint)"));
  assert.ok(t.includes('variant="destructive"') && t.includes("`Switch to ${target.name}`"));
  assert.ok(t.includes("Switching resets every bill") && t.includes('successToast: "Payment mode changed"'));
  assert.ok(!stripComments(t).includes("confirm("));
});

test("Join code dialog uses shared buttons and shows errors inline", () => {
  assert.ok(settings.includes("setCodeError(") && settings.includes("error={codeError}"));
  assert.ok(settings.includes("Ask an owner for a code."));
});

test("setHouseholdName rejects empty names and rethrows after rolling back", () => {
  const t = read("context/AppContext.tsx");
  assert.ok(t.includes("setHouseholdName: (name: string) => Promise<void>;"));
  const body = fnBody(t, "async function setHouseholdName(", "/* ── Bills Actions");
  assert.ok(body.includes("rawName.trim()") && body.includes("throw new Error("));
  assert.ok(body.includes("setHouseholdNameState(previousName);") && body.includes("throw err;"));
  assert.ok(body.includes("assertRowUpdated("));
});

test("Profile seeds the nickname from the saved name on every open and clears old messages", () => {
  assert.ok(code.includes("setFullName(savedName)") && code.includes("savedName = currentMember ? currentMember.name : defaultName"));
  const open = fnBody(code, "if (showProfileModal !== profileWasOpen)", "/* Join code dialog");
  assert.ok(open.includes("setProfileError(null)") && open.includes("setProfileSaved(false)"));
});

test("Log out signs out and leaves with a full page navigation", () => {
  assert.ok(code.includes("await signOutAndGoToLogin()"));
  assert.ok(!code.includes("router.push(\"/login\")"));
});
