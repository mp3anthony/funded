import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAcceptedMember,
  eligibleNewOwners,
  leaveModeFor,
  canDemote,
  isDeleteConfirmed,
  nextCreatorUserId,
  deleteAccountModeFor,
  isPickNewOwnerReply,
  isUnauthorizedReply,
  PICK_NEW_OWNER_ERROR,
} from "./householdLeave.ts";
import { readFileSync } from "node:fs";

const owner = { id: "o1", role: "owner", user_id: "u1", invitation_status: "accepted", created_at: "2026-01-01" };
const owner2 = { id: "o2", role: "owner", user_id: "u2", invitation_status: "accepted", created_at: "2026-02-01" };
const owner3 = { id: "o3", role: "owner", user_id: "u3", invitation_status: "accepted", created_at: "2026-03-01" };
const member = { id: "m1", role: "member", user_id: "u4", invitation_status: "accepted", created_at: "2026-04-01" };
const pending = { id: "p1", role: "member", user_id: null, invitation_status: "pending", created_at: "2026-05-01" };
const pendingOwner = { id: "p2", role: "owner", user_id: null, invitation_status: "pending", created_at: "2026-05-02" };

test("isAcceptedMember: needs user_id and not pending", () => {
  assert.equal(isAcceptedMember(member), true);
  assert.equal(isAcceptedMember(pending), false);
  assert.equal(isAcceptedMember({ id: "x", role: "member", user_id: "u9" }), true);
  assert.equal(isAcceptedMember({ id: "x", role: "member", user_id: null }), false);
  assert.equal(isAcceptedMember({ id: "x", role: "member", user_id: "u9", invitation_status: "pending" }), false);
});

test("leaveModeFor: regular member leaves", () => {
  assert.equal(leaveModeFor([owner, member], member), "leave");
});
test("leaveModeFor: owner with another accepted owner leaves", () => {
  assert.equal(leaveModeFor([owner, owner2], owner), "leave");
});
test("leaveModeFor: only owner with accepted member must transfer or delete", () => {
  assert.equal(leaveModeFor([owner, member], owner), "transfer-or-delete");
});
test("leaveModeFor: sole member is delete-only", () => {
  assert.equal(leaveModeFor([owner], owner), "delete-only");
});
test("leaveModeFor: only pending members is delete-only", () => {
  assert.equal(leaveModeFor([owner, pending], owner), "delete-only");
});
test("leaveModeFor: a pending 'owner' does not count as another owner", () => {
  assert.equal(leaveModeFor([owner, pendingOwner], owner), "delete-only");
  assert.equal(leaveModeFor([owner, pendingOwner, member], owner), "transfer-or-delete");
});

test("eligibleNewOwners: accepted non-owners only, never the leaver", () => {
  assert.deepEqual(eligibleNewOwners([owner, owner2, member, pending], owner).map((m) => m.id), ["m1"]);
  assert.deepEqual(eligibleNewOwners([owner, pending], owner), []);
});

test("canDemote: only when another accepted owner remains", () => {
  assert.equal(canDemote([owner, owner2], owner.id), true);
  assert.equal(canDemote([owner, member], owner.id), false);
  assert.equal(canDemote([owner, pendingOwner], owner.id), false);
});

test("isDeleteConfirmed: exact DELETE, trimmed, case-sensitive", () => {
  assert.equal(isDeleteConfirmed("DELETE"), true);
  assert.equal(isDeleteConfirmed("  DELETE "), true);
  assert.equal(isDeleteConfirmed("delete"), false);
  assert.equal(isDeleteConfirmed(""), false);
});

test("nextCreatorUserId: named new owner wins", () => {
  assert.equal(nextCreatorUserId([owner, member], owner, "m1"), "u4");
});
test("nextCreatorUserId: oldest remaining accepted owner", () => {
  assert.equal(nextCreatorUserId([owner, owner3, owner2], owner), "u2");
});
test("nextCreatorUserId: creator who is not an owner leaves, owners remain", () => {
  // member row is the creator, leaving; an owner remains
  assert.equal(nextCreatorUserId([member, owner2], member), "u2");
});
test("nextCreatorUserId: no accepted owner left returns null, never a pending row", () => {
  assert.equal(nextCreatorUserId([member, pendingOwner], member), null);
  assert.equal(nextCreatorUserId([owner, pending], owner, "p1"), null);
});

test("deleteAccountModeFor: no member row is no-household", () => {
  assert.equal(deleteAccountModeFor([], null), "no-household");
  assert.equal(deleteAccountModeFor([owner], undefined), "no-household");
});
test("deleteAccountModeFor: sole owner deletes the household", () => {
  assert.equal(deleteAccountModeFor([owner], owner), "delete-household");
});
test("deleteAccountModeFor: owner with only pending members deletes the household", () => {
  assert.equal(deleteAccountModeFor([owner, pending], owner), "delete-household");
});
test("deleteAccountModeFor: sole accepted member with no owner deletes the household", () => {
  assert.equal(deleteAccountModeFor([member, pending], member), "delete-household");
});
test("deleteAccountModeFor: only owner with an accepted member must transfer", () => {
  assert.equal(deleteAccountModeFor([owner, member], owner), "transfer");
});
test("deleteAccountModeFor: a pending owner does not count, still transfer", () => {
  assert.equal(deleteAccountModeFor([owner, pendingOwner, member], owner), "transfer");
});
test("deleteAccountModeFor: owner with another accepted owner leaves", () => {
  assert.equal(deleteAccountModeFor([owner, owner2], owner), "leave");
});
test("deleteAccountModeFor: regular member leaves", () => {
  assert.equal(deleteAccountModeFor([owner, member], member), "leave");
});
test("deleteAccountModeFor: caller row with a user id but still pending just leaves", () => {
  const pendingMe = { id: "p3", role: "owner", user_id: "u5", invitation_status: "pending", created_at: "2026-06-01" };
  assert.equal(deleteAccountModeFor([pendingMe], pendingMe), "leave");
  assert.equal(deleteAccountModeFor([pendingMe, pending], pendingMe), "leave");
});

test("isPickNewOwnerReply: matches the delete-account only-owner reply (#519)", () => {
  assert.equal(isPickNewOwnerReply(new Error(PICK_NEW_OWNER_ERROR)), true);
  assert.equal(isPickNewOwnerReply(new Error("That person can't take over as owner.")), false);
  assert.equal(isPickNewOwnerReply(PICK_NEW_OWNER_ERROR), false);
  assert.equal(isPickNewOwnerReply(null), false);
  const fn = readFileSync(new URL("../../supabase/functions/delete-account/index.ts", import.meta.url), "utf8");
  assert.ok(fn.includes(JSON.stringify(PICK_NEW_OWNER_ERROR)), "edge function reply text drifted");
});

test("isUnauthorizedReply: function's Unauthorized body or a 401 status (#519)", () => {
  assert.equal(isUnauthorizedReply(new Error("Unauthorized")), true);
  assert.equal(isUnauthorizedReply(Object.assign(new Error("Edge Function returned a non-2xx status code"), { context: { status: 401 } })), true);
  assert.equal(isUnauthorizedReply(Object.assign(new Error("Edge Function returned a non-2xx status code"), { context: { status: 500 } })), false);
  assert.equal(isUnauthorizedReply(new Error("Failed to delete your account.")), false);
  assert.equal(isUnauthorizedReply(undefined), false);
});
