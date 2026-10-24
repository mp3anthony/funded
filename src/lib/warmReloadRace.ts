/* ═══════════════════════════════════════════════
   Warm-Reload Empty-Result Race Guard (#74)
   ═══════════════════════════════════════════════ */
// A Supabase query that succeeds with zero rows and a genuine "this
// household/user has no rows" are indistinguishable at the call site. On a
// warm reload (token refresh / tab refocus) RLS can evaluate the request
// before the refreshed auth token has been attached to it, and hand back an
// empty-but-error-free result even though the real row set is non-empty.
// `[]` is truthy, so writing that straight into state overwrites real,
// already-loaded data — this is what made the Dashboard verdict flap
// (then the Health score) and back on a warm reload with no real data change.
//
// Agreed fix (Option 4): trust an empty result immediately UNLESS the
// previous in-memory state for that same slice was non-empty.
//   - Previous state was already empty (including the very first load ever)
//     → trust the empty result immediately, no re-fetch. This keeps the
//     overwhelmingly common case fast.
//   - Previous state was non-empty and the fresh result is empty → the
//     result is suspect. Re-fetch that one query exactly once to confirm:
//       - re-fetch also empty → commit the empty result. This correctly
//         reflects a genuine deletion made on another device.
//       - re-fetch comes back with rows → use those instead. The first
//         empty result was the race, not reality.
// A failed query (error, or `data: null`) is left alone — that is a
// different evidence class than "successful but empty", and each call site
// already has its own null-guard for it.
//
// Shared by every loadData slice (bills/expenses/funds/paydays/members/
// expense_splits/bill_splits) and fetchPayData (pay_schedules/pay_history,
// #348) so the logic lives in exactly one place. Lives in src/lib (no React
// or Supabase imports) so it can be unit-tested with `node --test`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupabaseArrayResult<T = any> = { data: T[] | null; error: unknown };

export async function resolveWarmReloadRace<T>(
  previousState: T[],
  result: SupabaseArrayResult<T>,
  refetch: () => Promise<SupabaseArrayResult<T>>
): Promise<T[] | null> {
  // A failed query is not "empty" — bail out and let the caller's existing
  // null-guard decide what to do (typically: leave state untouched).
  if (result.error || !result.data) return null;

  const isEmpty = result.data.length === 0;
  const previousStateWasNonEmpty = previousState.length > 0;

  if (!isEmpty || !previousStateWasNonEmpty) {
    // Either there are rows, or there was nothing at risk of being clobbered
    // (first-ever load, or a household that was already empty). Trust it.
    return result.data;
  }

  // Suspect: state held rows a moment ago and the fresh query says none.
  // Confirm with exactly one re-fetch before committing the overwrite.
  const confirmation = await refetch();
  if (confirmation.error || !confirmation.data) {
    // Inconclusive — do not compound one bad signal with another. Leave the
    // slice untouched rather than guessing.
    return null;
  }

  // Non-empty re-fetch => the original empty result was the race.
  // Still-empty re-fetch => the emptiness is real (genuine deletion).
  // Either way, the re-fetch's result is what gets committed.
  return confirmation.data;
}
