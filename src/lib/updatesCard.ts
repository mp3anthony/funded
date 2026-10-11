/**
 * Pure helpers for the Updates card (#260). Import-free so node:test can run
 * them directly (see updatesCard.test.mjs).
 */

/** How many highlight bullets the card shows before collapsing to "+N more". */
export const UPDATES_CARD_BULLETS = 2;

/**
 * Which patch-notes entry the card should show, or null for none. `entries` is
 * newest first, so the newest is `entries[0]`. Nothing shows once this version
 * has been seen, or when there are no entries yet.
 */
export function pickUpdatesCardEntry<T>(
  lastSeen: string | null,
  appVersion: string,
  entries: readonly T[],
): T | null {
  if (lastSeen === appVersion) return null;
  return entries[0] ?? null;
}

/** First `max` highlights plus how many were left out. Never mutates `highlights`. */
export function updatesCardPreview(
  highlights: readonly string[],
  max: number = UPDATES_CARD_BULLETS,
): { shown: string[]; moreCount: number } {
  const shown = highlights.slice(0, max);
  return { shown, moreCount: highlights.length - shown.length };
}
