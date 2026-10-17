import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAcceptedMember,
  eligibleNewOwners,
  leaveModeFor,
  canDemote,
  isDeleteConfirmed,
  nextCreatorUserId,
} from "./householdLeave.ts";

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
