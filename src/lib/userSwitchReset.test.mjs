// Guard: household data held in AppProvider is cleared when the signed-in user
// changes or signs out, and sign-out ends with a full page navigation.
// Reads source files only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p) => readFileSync(`${ROOT}${p}`, "utf8").replace(/\r\n/g, "\n");
const ctx = read("src/context/AppContext.tsx");

function body(startMarker, endMarker) {
  const a = ctx.indexOf(startMarker);
  assert.ok(a >= 0, `missing ${startMarker}`);
  const b = ctx.indexOf(endMarker, a);
  assert.ok(b > a, `missing ${endMarker}`);
  return ctx.slice(a, b);
}

test("resetHouseholdState clears every data slice", () => {
  const fn = body("function resetHouseholdState()", "function resetIfUserChanged");
  for (const setter of [
    "setIsOnboarded(false)", "setHouseholdNameState(\"\")", "setDbHouseholdId(null)", "setIsJointFund(false)",
    "setJoinCode(null)", "setCodeExpiresAt(null)", "setBills([])", "setExpenses([])", "setFunds([])",
    "setPaydays([])", "setMembers([])", "setBillSplits([])", "setExpenseSplits([])", "setPaySchedules([])",
    "setPayHistory([])", "setHouseholdContributions([])", "setContributionRules([])", "setNotifications([])",
    "setNotificationSettings(null)", "setPushStatus(null)", "setFinishSetup(null)",
    "resolvedHouseholdUserIdRef.current = null", "dataOwnerUserIdRef.current = null", "loadGenerationRef.current += 1",
  ]) {
    assert.ok(fn.includes(setter), `reset is missing ${setter}`);
  }
});

test("every useState data slice in AppContext is handled by the reset", () => {
  const fn = body("function resetHouseholdState()", "function resetIfUserChanged");
  const states = [...ctx.matchAll(/const \[\w+, (set\w+)\] = useState/g)].map((m) => m[1]);
  // Not user data: preferences, auth plumbing and loading/retry flags.
  const exempt = new Set([
    "setThemeState", "setSession", "setIsAuthLoading", "setIsDataLoading", "setIsNetworkStuck",
    "setShowOfflineRetry", "setRetryGeneration", "setLoadNonce",
  ]);
  for (const setter of states) {
    if (exempt.has(setter)) continue;
    assert.ok(fn.includes(`${setter}(`), `reset does not cover ${setter}`);
  }
});

test("reset runs on sign-out, user change, no membership and household creation", () => {
  const inner = body("async function loadDataInner(", "useEffect(() => {\n    loadData();");
  const noSession = inner.slice(0, inner.indexOf("if (!dbHouseholdId && !isOnboarded)"));
  assert.match(noSession, /resetHouseholdState\(\)/);
  assert.match(inner, /dataOwnerUserIdRef\.current !== session\.user\.id/);
  const noMembership = inner.slice(inner.indexOf("if (!membership?.household_id)"), inner.indexOf("STEP 2"));
  assert.match(noMembership, /resetHouseholdState\(\)/);
  assert.match(noMembership, /householdWriteCountRef\.current > 0/);
  assert.match(noMembership, /justWroteHouseholdRef\.current/);
  assert.match(noMembership, /< 5000/);
  assert.doesNotMatch(noMembership, /dbHouseholdId/);
  assert.match(noMembership, /if \(!keepOwnHousehold\)/);
  const create = body("async function createHousehold(", "async function setHouseholdName");
  assert.ok(/householdWriteCountRef\.current \+= 1;\s+try \{\s+return await createHouseholdImpl/.test(ctx));
  assert.ok(/householdWriteCountRef\.current -= 1;/.test(ctx));
  assert.ok(/householdWriteCountRef\.current \+= 1;\s+try \{\s+return await joinHouseholdImpl/.test(ctx));
  assert.match(create, /resetIfUserChanged\(activeUser\.id\)/);
  assert.match(create, /setBills\(\[\]\)/);
  assert.match(create, /dataOwnerUserIdRef\.current = activeUser\.id/);
  const auth = body("supabase.auth.onAuthStateChange(", "return () => subscription.unsubscribe()");
  assert.match(auth, /resetIfUserChanged\(/);
});

test("a load that outlives a user change discards its results and re-runs", () => {
  const wrapper = body("async function loadData(options", "async function loadDataInner(");
  assert.match(wrapper, /ctx\.gen !== loadGenerationRef\.current/);
  assert.match(wrapper, /setLoadNonce/);
});

test("log out and other sign-out buttons end with a full page navigation", () => {
  const helper = read("src/lib/signOut.ts");
  assert.match(helper, /window\.location\.assign\(/);
  assert.match(helper, /catch/);
  assert.ok(helper.includes('signOut({ scope: "local" })'));
  for (const f of ["src/app/settings/settings-client.tsx", "src/app/confirm-email/page.tsx", "src/components/OnboardingWelcome.tsx"]) {
    const src = read(f);
    assert.match(src, /signOutAndGoToLogin/, f);
    assert.doesNotMatch(src, /auth\.signOut\(/, f);
  }
});

test("loads discard results after a reset; create/join re-check the session user", () => {
  const rel = body("async function loadHouseholdRelatedData(", "/* ── Finish setting up card flag");
  assert.match(rel, /gen !== loadGenerationRef\.current/);
  assert.ok((rel.match(/isStale\(\)/g) || []).length >= 3);
  assert.match(rel, /fetchPayData\(householdId, \{ assumeEmptyPreviousState, gen \}\)/);
  assert.match(rel, /fetchNotifications\(userId, householdId, gen\)/);
  for (const fn of ["fetchHouseholdContributions", "fetchContributionRules", "fetchNotifications"]) {
    assert.ok(ctx.includes("async function " + fn + "(") && ctx.slice(ctx.indexOf("async function " + fn + "(")).split("{")[0].includes("gen?: number"), fn);
  }
  assert.match(ctx, /gen: ctx\.gen,/);
  const guards = ctx.match(/assertSessionUserUnchanged\(/g) || [];
  assert.ok(guards.length >= 4, "definition plus create (2) and join (1) calls");
});

test("password reset does not show an error when only the sign-out after it fails", () => {
  const src = read("src/app/reset-password/update/page.tsx");
  assert.match(src, /catch \(signOutErr\)/);
});

test("a stale load leaves the loading flags to the wrapper, which clears them for the re-run", () => {
  const inner = body("async function loadDataInner(", "useEffect(() => {\n    loadData();");
  const fin = inner.slice(inner.lastIndexOf("} finally {"));
  assert.match(fin, /const staleLoad = ctx\.gen !== loadGenerationRef\.current/);
  assert.match(fin, /!networkFailure && !staleLoad/);
  assert.match(fin, /if \(!staleLoad\) setIsNetworkStuck\(networkFailure\)/);
  const wrapper = body("async function loadData(options", "async function loadDataInner(");
  assert.ok(wrapper.includes("setIsDataLoading(!!lastDispatchedSessionRef.current)"));
});
