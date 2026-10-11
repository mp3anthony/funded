/**
 * Patch notes display window (#309). Pure and import-free so `node --test`
 * can load it with type stripping (see patchNotesWindow.test.mjs).
 *
 * The /patch-notes page shows only entries from the newest entry's month
 * (measured from the newest entry, not today's date). Older
 * entries stay in patch-notes.ts. An entry whose `date` does not parse as
 * "Month YYYY" is always kept, so a typo never hides a note. See
 * docs/conventions.md (Patch notes).
 */

export const PATCH_NOTES_WINDOW_MONTHS = 1;

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** "October 2026" -> year * 12 + monthIndex. Anything else -> null. */
export function parsePatchNoteMonth(date: unknown): number | null {
  if (typeof date !== "string") return null;
  const match = /^([a-z]+)\s+(\d{4})$/i.exec(date.trim());
  if (!match) return null;
  const monthIndex = MONTH_NAMES.indexOf(match[1].toLowerCase());
  if (monthIndex === -1) return null;
  return Number(match[2]) * 12 + monthIndex;
}

/** Entries within `months` calendar months of the newest entry. Never mutates. */
export function recentPatchNotes<T extends { date: string }>(
  entries: readonly T[],
  months: number = PATCH_NOTES_WINDOW_MONTHS,
): T[] {
  let newest: number | null = null;
  for (const entry of entries) {
    const parsed = parsePatchNoteMonth(entry.date);
    if (parsed !== null && (newest === null || parsed > newest)) newest = parsed;
  }
  if (newest === null) return [...entries];
  const cutoff = newest - (months - 1);
  return entries.filter((entry) => {
    const parsed = parsePatchNoteMonth(entry.date);
    return parsed === null || parsed >= cutoff;
  });
}
