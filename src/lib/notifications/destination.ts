import type { ReminderType } from './generateReminders';

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
 * #182 will extend the payday cases here with query params (e.g. schedule id
 * / pay date) to open popups — keep all destination building in this file.
 */
export interface NotificationTarget {
  type: string | null | undefined;
  related_entity_id?: string | number | null;
}

// Record (not a switch) so adding a new ReminderType fails type-checking
// until it's given a destination here.
const DESTINATIONS: Record<ReminderType, (id: string) => string | null> = {
  manual_bill: (id) => `/bills?billId=${encodeURIComponent(id)}`,
  auto_pay: (id) => `/bills?billId=${encodeURIComponent(id)}`,
  payday_log_pay: () => '/payday',
  lodge_payment: () => '/payday',
  goal_milestone: () => '/funds',
};

/** In-app route for a notification, or null when it has no specific
 *  destination (no related entity, or an unknown type). */
export function getNotificationDestination(n: NotificationTarget): string | null {
  if (n.related_entity_id === null || n.related_entity_id === undefined || n.related_entity_id === '') {
    return null;
  }
  if (!n.type || !Object.prototype.hasOwnProperty.call(DESTINATIONS, n.type)) return null;
  return DESTINATIONS[n.type as ReminderType](String(n.related_entity_id));
}

/** URL to put on a push payload — falls back to home when there's no
 *  specific destination (unchanged pre-#181 behaviour). */
export function getNotificationPushUrl(n: NotificationTarget): string {
  return getNotificationDestination(n) ?? '/';
}
