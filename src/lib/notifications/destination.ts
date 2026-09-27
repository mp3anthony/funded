import { parsePaydayLogPayDate, type ReminderType } from './generateReminders';
import { buildPaydayConfirmUrl, buildPaydayLogPayUrl } from './paydayLink';

/**
 * Slice 16 (#181): the single shared "where does this notification go" rule,
 * used by BOTH push-sending paths (AppContext's app-open path and the
 * deliver-scheduled cron) AND the in-app inbox (NotificationCenter), so the
 * three can't drift. Pure — no client- or server-only imports — so it's safe
 * to import from route handlers and client components alike.
 *
 * `related_entity_id` means something different per reminder type:
 *   - manual_bill / auto_pay → bill id
 *   - lodge_payment          → pay_history id
 *   - payday_log_pay         → pay schedule id
 *   - goal_milestone         → fund id
 *
 * #182 payday link contract (param names live in ./paydayLink):
 *   - payday_log_pay → /payday?scheduleId=<id>&payDate=<YYYY-MM-DD>, the pay
 *     date recovered from the row's dedupe_key (plain /payday if the key
 *     can't be parsed, e.g. a row fetched without it)
 *   - lodge_payment  → /payday?historyId=<pay_history id>
 *
 * #193 goal link contract:
 *   - goal_milestone → /funds?goalId=<fund id>. The Goals page opens that
 *     goal's detail popup, then strips the param; a missing/deleted goal
 *     just lands on the plain Goals page.
 * Keep all destination building in this file.
 */
export interface NotificationTarget {
  type: string | null | undefined;
  related_entity_id?: string | number | null;
  dedupe_key?: string | null;
}

// Record (not a switch) so adding a new ReminderType fails type-checking
// until it's given a destination here.
const DESTINATIONS: Record<ReminderType, (id: string, n: NotificationTarget) => string | null> = {
  manual_bill: (id) => `/bills?billId=${encodeURIComponent(id)}`,
  auto_pay: (id) => `/bills?billId=${encodeURIComponent(id)}`,
  payday_log_pay: (id, n) => {
    const payDate = parsePaydayLogPayDate(n.dedupe_key, id);
    return payDate ? buildPaydayLogPayUrl(id, payDate) : '/payday';
  },
  lodge_payment: (id) => buildPaydayConfirmUrl(id),
  goal_milestone: (id) => `/funds?goalId=${encodeURIComponent(id)}`,
};

/** In-app route for a notification, or null when it has no specific
 *  destination (no related entity, or an unknown type). */
export function getNotificationDestination(n: NotificationTarget): string | null {
  if (n.related_entity_id === null || n.related_entity_id === undefined || n.related_entity_id === '') {
    return null;
  }
  if (!n.type || !Object.prototype.hasOwnProperty.call(DESTINATIONS, n.type)) return null;
  return DESTINATIONS[n.type as ReminderType](String(n.related_entity_id), n);
}

/** URL to put on a push payload — falls back to home when there's no
 *  specific destination (unchanged pre-#181 behaviour). */
export function getNotificationPushUrl(n: NotificationTarget): string {
  return getNotificationDestination(n) ?? '/';
}
