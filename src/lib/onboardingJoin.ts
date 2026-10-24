/**
 * Pure rules for the full-screen join-household screen (R33, #420). Import-free
 * so node:test can run them directly (see onboardingJoin.test.mjs).
 */

export const JOIN_CODE_LENGTH = 6;

const GENERIC_JOIN_ERROR = "Couldn't join right now. Please check your connection and try again.";

/** Letters and digits only, upper case, capped at the code length. */
export function sanitizeCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").slice(0, JOIN_CODE_LENGTH).toUpperCase();
}

/** The code as shown in the box: ABC-123 (dash after the third character). */
export function formatCode(code: string): string {
  return code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

/** Join can run once the code is complete and no join is already running. */
export function canJoin(code: string, joining: boolean): boolean {
  return !joining && code.length === JOIN_CODE_LENGTH;
}

/** Plain-English line for a failed join, from the message the join threw. */
export function joinErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  const msg = raw.trim();
  const lower = msg.toLowerCase();
  if (lower.includes("invalid") || lower.includes("expired")) {
    return "That code didn't work. Check it with the owner.";
  }
  if (lower.includes("already a member")) {
    return "You're already in this household.";
  }
  // "already belong" (the existing-household guard) keeps its own wording.
  return msg || GENERIC_JOIN_ERROR;
}
