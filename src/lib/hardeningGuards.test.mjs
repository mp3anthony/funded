// String-level guards for hardening 4-6 (member rows, storage paths, join lockout) and household function auth guards.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const members = read("supabase/migrations/20261030120000_hardening_4_member_rows.sql");
const storageSql = read("supabase/migrations/20261030120100_hardening_5_storage_paths.sql")
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n");
const attempts = read("supabase/migrations/20261030120200_hardening_6_join_attempts.sql");
const fn = read("supabase/functions/join-household/index.ts");
const storageTs = read("src/lib/storage.ts");

test("member row guard locks household and user, and limits non-owners to their own row", () => {
  assert.match(members, /NEW\.household_id IS DISTINCT FROM OLD\.household_id OR NEW\.user_id IS DISTINCT FROM OLD\.user_id/);
  assert.match(members, /OLD\.user_id IS DISTINCT FROM auth\.uid\(\)/);
  assert.match(members, /NEW\.invitation_status IS DISTINCT FROM OLD\.invitation_status/);
  assert.match(members, /IF auth\.uid\(\) IS NULL THEN RETURN NEW/);
});

test("owner inserts are unclaimed rows only", () => {
  assert.match(members, /is_household_owner\(household_id, auth\.uid\(\)\) AND user_id IS NULL/);
});

test("storage policies require the caller's own folder, matching the upload paths", () => {
  assert.match(storageTs, /`avatars\/\$\{userId\}\//);
  assert.match(storageTs, /`screenshots\/\$\{userId\}\//);
  assert.match(storageSql, /\(storage\.foldername\(name\)\)\[2\] = auth\.uid\(\)::text/);
  assert.doesNotMatch(storageSql, /FOR (ALL|SELECT) TO public/);
});

test("join attempts table is closed to clients", () => {
  assert.match(attempts, /ENABLE ROW LEVEL SECURITY/);
  assert.match(attempts, /REVOKE ALL ON public\.join_attempts FROM PUBLIC, anon, authenticated/);
  assert.match(attempts, /REVOKE EXECUTE ON FUNCTION public\.join_attempt_register_failure\(uuid\) FROM PUBLIC, anon, authenticated/);
});

test("join function: 401 without a header, lockout, failure counting", () => {
  assert.doesNotMatch(fn, /get\("Authorization"\)!/);
  assert.match(fn, /if \(!authHeader\)/);
  assert.match(fn, /status: 429/);
  assert.match(fn, /join_attempt_register_failure/);
});

test("leave and delete functions: 401 without a header", () => {
  for (const p of [
    "supabase/functions/leave-household/index.ts",
    "supabase/functions/delete-household/index.ts",
    "supabase/functions/delete-account/index.ts",
  ]) {
    const src = read(p);
    assert.doesNotMatch(src, /get\("Authorization"\)!/);
    assert.match(src, /if \(!authHeader\)/);
    assert.ok(src.indexOf("if (!authHeader)") < src.indexOf("auth.getUser("), p);
  }
});

test("delete-account function: login deleted last, storage paths from the auth id only", () => {
  const src = read("supabase/functions/delete-account/index.ts");
  const deleteUserCalls = src.match(/auth\.admin\.deleteUser\(/g) ?? [];
  assert.equal(deleteUserCalls.length, 1);
  const deleteUserAt = src.indexOf("auth.admin.deleteUser(");
  assert.ok(src.indexOf(".remove(") > -1 && src.indexOf(".remove(") < deleteUserAt);
  assert.ok(src.lastIndexOf('.from("households")') < deleteUserAt);
  assert.doesNotMatch(src, /householdId/);
  assert.doesNotMatch(src, /avatar_url/);
  assert.doesNotMatch(src, /getUserById\(/);
  assert.match(src, /`avatars\/\$\{user\.id\}`/);
  assert.match(src, /`screenshots\/\$\{user\.id\}`/);
  // No storage folder is built from a member row id.
  assert.doesNotMatch(src, /`(avatars|screenshots)\/\$\{(?!user\.id\})/);
  assert.doesNotMatch(src, /me\.id\}/);
  for (const name of [
    "push_subscriptions",
    "notification_settings",
    "user_preferences",
    "join_attempts",
    '"avatars"',
    '"bug-report-screenshots"',
  ]) {
    assert.ok(src.includes(name), name);
  }
});
