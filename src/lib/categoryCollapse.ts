/**
 * Remembered collapsed categories for the Bills page (R15, #402).
 * Stored per person in this browser only (no database column, on purpose).
 * Stores the COLLAPSED names, so a brand-new category starts open.
 *
 * Deliberately has ZERO imports so `categoryCollapse.test.mjs` can run it
 * under plain `node --test`. Erasable TypeScript syntax only.
 */

function key(userId: string): string {
  return `funded:collapsedCategories:${userId}`;
}

/** Collapsed category names for this person, or [] if none / storage unavailable. */
export function loadCollapsed(userId: string): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(key(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Applies ONE person-made toggle to the remembered list. Categories opened
 * only by a deep link or a new row are in the screen state but not here, so a
 * later toggle of another category never persists them.
 */
export function applyToggle(stored: string[], category: string, collapse: boolean): string[] {
  const without = stored.filter((c) => c !== category);
  return collapse ? [...without, category] : without;
}

export function saveCollapsed(userId: string, names: string[]): void {
  try {
    globalThis.localStorage?.setItem(key(userId), JSON.stringify(names));
  } catch {
    // Private mode or blocked storage: the choice just won't be remembered.
  }
}
