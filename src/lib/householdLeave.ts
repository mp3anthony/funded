/**
 * Pure helpers for Leave / Delete household (#251) and Delete my account
 * (#509). Import-free so node:test can run them directly (see
 * householdLeave.test.mjs). The leave-household and delete-account edge
 * functions recompute the same rules server-side (Deno cannot import from
 * src), so keep them in step: accepted = has a user_id and is not pending;
 * owner = role "owner" AND accepted.
 */

export interface LeaveMember {
  id: string | number;
  role: "owner" | "member";
  user_id?: string | null;
  invitation_status?: "pending" | "accepted" | "declined";
  created_at?: string;
}

export type LeaveMode = "leave" | "transfer-or-delete" | "delete-only";

/** In the household for real: signed up and not still pending. */
export function isAcceptedMember(m: LeaveMember): boolean {
  return !!m.user_id && (m.invitation_status ?? "accepted") !== "pending";
}

function isAcceptedOwner(m: LeaveMember): boolean {
  return m.role === "owner" && isAcceptedMember(m);
}

/** Accepted non-owners the leaving only-owner can hand ownership to. */
export function eligibleNewOwners<T extends LeaveMember>(members: readonly T[], leaverId: string | number): T[] {
  return members.filter((m) => String(m.id) !== String(leaverId) && m.role !== "owner" && isAcceptedMember(m));
}

/**
 * leave: plain leave (regular member, or owner while another accepted owner remains).
 * transfer-or-delete: only owner with accepted members: hand over ownership then leave, or delete.
 * delete-only: sole member, or only pending members left.
 */
export function leaveModeFor(members: readonly LeaveMember[], leaver: LeaveMember): LeaveMode {
  if (leaver.role !== "owner") return "leave";
  if (members.some((m) => String(m.id) !== String(leaver.id) && isAcceptedOwner(m))) return "leave";
  return eligibleNewOwners(members, leaver.id).length > 0 ? "transfer-or-delete" : "delete-only";
}

/** Another accepted owner exists, so the leaver's owner rights can safely go. */
export function canDemote(members: readonly LeaveMember[], memberId: string | number): boolean {
  return members.some((m) => String(m.id) !== String(memberId) && isAcceptedOwner(m));
}

export type DeleteAccountMode = "no-household" | "leave" | "transfer" | "delete-household";

/**
 * What Delete my account does to the caller's household (#509). Mirrors the
 * delete-account edge function.
 * no-household: no member row.
 * leave: caller's row not accepted yet, a regular member, or an owner while
 *   another accepted owner remains.
 * transfer: only owner with other accepted members: pick a new owner first.
 * delete-household: no other accepted member (the household goes too).
 */
export function deleteAccountModeFor(
  members: readonly LeaveMember[],
  me: LeaveMember | null | undefined,
): DeleteAccountMode {
  if (!me) return "no-household";
  if (!isAcceptedMember(me)) return "leave";
  const others = members.filter((m) => String(m.id) !== String(me.id));
  if (!others.some(isAcceptedMember)) return "delete-household";
  if (me.role === "owner" && !others.some(isAcceptedOwner)) return "transfer";
  return "leave";
}

export function isDeleteConfirmed(text: string): boolean {
  return text.trim() === "DELETE";
}

/**
 * Who `households.user_id` (the creator record; RLS no longer trusts it, #350)
 * should point at after `leaver` goes. Mirrors the edge function. null = no
 * accepted owner remains: the column is set to null.
 */
export function nextCreatorUserId(
  members: readonly LeaveMember[],
  leaver: LeaveMember,
  newOwnerMemberId?: string | number | null,
): string | null {
  const owners = members.filter((m) => String(m.id) !== String(leaver.id) && isAcceptedOwner(m));
  if (newOwnerMemberId != null) {
    const named = members.find((m) => String(m.id) === String(newOwnerMemberId));
    if (named && String(named.id) !== String(leaver.id) && isAcceptedMember(named)) return named.user_id ?? null;
    return null;
  }
  const oldest = [...owners].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))[0];
  return oldest?.user_id ?? null;
}
