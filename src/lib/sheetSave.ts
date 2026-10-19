// Pure save-status helpers for the pop-up shells (R05, #392).
// Plain TS (no enums, no parameter properties, no "@/" imports) so node can run the tests on it.

export const SAVE_ERROR_MESSAGE = "Couldn't save. Check your connection and try again.";
export const SAVING_LABEL = "Saving…";
export const TRY_AGAIN_LABEL = "Try again";

export type SaveStatus = "idle" | "saving" | "error";

/** Label for the main pill: "Saving…" while saving, "Try again" after a failure. */
export function primaryPillLabel(status: SaveStatus, idleLabel: string): string {
  if (status === "saving") return SAVING_LABEL;
  if (status === "error") return TRY_AGAIN_LABEL;
  return idleLabel;
}

/** True only while a save is in flight (back, close and the pills lock). */
export function isSaveLocked(status: SaveStatus): boolean {
  return status === "saving";
}

export interface SettledSave {
  ok: boolean;
  /** The thrown error's message, when the save threw one. */
  thrownMessage?: string;
}

/** Runs a save. A throw or a `false` result is a failure; `void` or `true` is success. */
export async function settleSave(
  save: () => Promise<boolean | void> | boolean | void
): Promise<SettledSave> {
  try {
    const result = await save();
    return { ok: result !== false };
  } catch (err) {
    const message = err instanceof Error ? err.message : undefined;
    return { ok: false, thrownMessage: message || undefined };
  }
}
