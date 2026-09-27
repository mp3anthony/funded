/**
 * Slice 16 (#182): the payday notification-tap link contract, shared by the
 * link builder (destination.ts) and the Payday page that reads it. Pure — no
 * React, Supabase or AppContext imports — so it's safe from route handlers
 * and client components alike.
 *
 *   /payday?scheduleId=<id>&payDate=<YYYY-MM-DD>  ← "Payday — Log Your Pay"
 *   /payday?historyId=<pay_history id>            ← "Payment Requires Confirmation"
 *
 * The payday link carries the pay date as well as the schedule because the
 * Payday page auto-logs missed pays as `pending` on load (advancing the
 * schedule), so a late tap has to find the pending pay for that exact date
 * instead of the (now moved-on) schedule.
 */
export const PAYDAY_LINK_PARAMS = {
  scheduleId: 'scheduleId',
  payDate: 'payDate',
  historyId: 'historyId',
} as const;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function buildPaydayLogPayUrl(scheduleId: string, payDate: string): string {
  return `/payday?${PAYDAY_LINK_PARAMS.scheduleId}=${encodeURIComponent(scheduleId)}&${PAYDAY_LINK_PARAMS.payDate}=${encodeURIComponent(payDate)}`;
}

export function buildPaydayConfirmUrl(historyId: string): string {
  return `/payday?${PAYDAY_LINK_PARAMS.historyId}=${encodeURIComponent(historyId)}`;
}

/** Minimal read-only view of URLSearchParams / Next's ReadonlyURLSearchParams. */
interface ParamsLike {
  get(name: string): string | null;
  toString(): string;
}

// Structural shapes only — generic so the page gets its own objects back.
interface ScheduleLike {
  id: string | number;
  next_pay_date: string | null;
}

interface HistoryLike {
  id: string | number;
  pay_schedule_id: string | number | null;
  pay_date: string | null;
  status?: string | null;
}

export type PaydayLinkResolution<S, H> =
  | { kind: 'log'; schedule: S }
  | { kind: 'confirm'; history: H }
  | { kind: 'none' };

/** Which box (if any) a payday link should open. Missing status counts as
 *  not pending. Anything unmatched → `none` (plain Payday, no error). */
export function resolvePaydayLink<S extends ScheduleLike, H extends HistoryLike>(
  params: ParamsLike,
  schedules: readonly S[],
  history: readonly H[],
  isLoggable: (schedule: S) => boolean
): PaydayLinkResolution<S, H> {
  const historyId = params.get(PAYDAY_LINK_PARAMS.historyId);
  if (historyId) {
    const h = history.find((x) => String(x.id) === historyId);
    return h && h.status === 'pending' ? { kind: 'confirm', history: h } : { kind: 'none' };
  }

  const scheduleId = params.get(PAYDAY_LINK_PARAMS.scheduleId);
  const payDate = params.get(PAYDAY_LINK_PARAMS.payDate);
  if (scheduleId && payDate && YMD_RE.test(payDate)) {
    // (a) Already auto-logged as pending (late tap) → confirm that exact pay.
    const pending = history.find(
      (x) =>
        x.status === 'pending' &&
        String(x.pay_schedule_id ?? '') === scheduleId &&
        (x.pay_date ?? '').slice(0, 10) === payDate
    );
    if (pending) return { kind: 'confirm', history: pending };

    // (b) Still loggable for that same pay date → log it.
    const schedule = schedules.find(
      (s) => String(s.id) === scheduleId && s.next_pay_date === payDate && isLoggable(s)
    );
    if (schedule) return { kind: 'log', schedule };
  }

  return { kind: 'none' };
}

export function hasPaydayLinkParams(sp: ParamsLike): boolean {
  return Object.values(PAYDAY_LINK_PARAMS).some((name) => sp.get(name) !== null);
}

/** The query string left after removing the payday link params (no "?"). */
export function stripPaydayLinkParams(sp: ParamsLike): string {
  const next = new URLSearchParams(sp.toString());
  for (const name of Object.values(PAYDAY_LINK_PARAMS)) next.delete(name);
  return next.toString();
}
