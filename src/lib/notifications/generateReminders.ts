import { diffDaysYmd } from './timezone';

export type ReminderType =
  | 'manual_bill'
  | 'auto_pay'
  | 'lodge_payment'
  | 'payday_log_pay'
  | 'goal_milestone';

export interface ReminderSettings {
  manual_bill_reminders: boolean;
  auto_pay_reminders: boolean;
  lodge_payment_reminders: boolean;
  manual_bill_reminder_days?: number | null;
  auto_pay_reminder_days?: number | null;
  /** Issue #97 (Slice 9): payday "log your pay" reminders. Optional so
   *  settings rows fetched before this column existed don't crash the
   *  generator — treated as enabled (matches the other types' `|| true`-ish
   *  default-on behavior) only when explicitly true; see the `!== false`
   *  checks below for the actual gating. */
  payday_reminders?: boolean;
  /** Issue #97 (Slice 9): goal/fund milestone-reached reminders. */
  goal_milestone_reminders?: boolean;
  /** Issue #139: standalone daily overdue-bill reminder toggle, layered on
   *  top of manual_bill_reminders/auto_pay_reminders — a daily overdue
   *  reminder for a bill only fires when BOTH that bill type's toggle AND
   *  this one are on. Does not affect the non-overdue ("due soon"/day-0)
   *  branches below. Optional/`!== false`-gated for the same
   *  pre-migration-row-safety reason as payday_reminders/
   *  goal_milestone_reminders above. */
  overdue_bill_reminders?: boolean;
}

/** Minimal bill shape needed to evaluate reminders. */
export interface ReminderBill {
  id: string | number;
  name: string;
  payment_type?: string | null;
  status?: string | null;
  due_date?: string | null;
  dueDate?: string | null;
}

/** Minimal pay-history shape needed to evaluate lodge reminders. */
export interface ReminderPayHistory {
  id: string;
  member_id?: string | null;
  status?: string | null;
  pay_date?: string | null;
}

/** Minimal pay-schedule shape needed to evaluate payday reminders. */
export interface ReminderPaySchedule {
  id: string;
  member_id?: string | null;
  next_pay_date?: string | null;
}

/** Minimal fund/goal shape needed to evaluate milestone reminders. Accepts
 *  both the raw DB column names (current_amount/target_amount) and the
 *  mapped client-side Fund shape (currentAmount/targetAmount), matching the
 *  due_date/dueDate dual-support pattern on ReminderBill above. */
export interface ReminderFund {
  id: string | number;
  name: string;
  current_amount?: number | string | null;
  currentAmount?: number | null;
  target_amount?: number | string | null;
  targetAmount?: number | null;
}

/** Round percentage-of-target thresholds a goal/fund can cross. No existing
 *  "milestone" concept was found anywhere in the codebase, so this ticket
 *  picks sensible round numbers rather than inventing new product copy. */
export const GOAL_MILESTONE_THRESHOLDS = [25, 50, 75, 100] as const;

export interface ReminderInput {
  userId: string;
  householdId: string | null;
  /** Today's date as 'YYYY-MM-DD' in the relevant timezone. */
  todayYmd: string;
  bills: ReminderBill[];
  payHistory: ReminderPayHistory[];
  /** Pay schedules for the household (all members') — used to evaluate
   *  payday "log your pay" reminders. Defaults to [] when omitted so
   *  existing callers don't need to change. */
  paySchedules?: ReminderPaySchedule[];
  /** Funds/goals for the household — used to evaluate milestone reminders.
   *  Defaults to [] when omitted so existing callers don't need to change. */
  funds?: ReminderFund[];
  /** The current member's id as a string, or null if unknown. */
  currentMemberId: string | null;
  settings: ReminderSettings;
  /** Dedupe keys that already exist for this user (already-sent/dismissed). */
  existingKeys: Set<string>;
}

export interface ReminderRow {
  user_id: string;
  household_id: string | null;
  type: ReminderType;
  title: string;
  message: string;
  related_entity_id: string;
  dedupe_key: string;
}

/**
 * Pure reminder generator. No I/O, no browser or Supabase dependencies.
 * Given the current state of a user's bills / pay history and their
 * notification settings, returns the notification rows that should be
 * created (excluding any whose dedupe_key already exists).
 *
 * Thresholds and message strings mirror the original client logic exactly.
 */
export function generateReminders(input: ReminderInput): ReminderRow[] {
  const {
    userId,
    householdId,
    todayYmd,
    bills,
    payHistory,
    paySchedules = [],
    funds = [],
    currentMemberId,
    settings,
    existingKeys,
  } = input;

  const rows: ReminderRow[] = [];

  const push = (row: ReminderRow) => {
    if (existingKeys.has(row.dedupe_key)) return;
    rows.push(row);
  };

  // ── Manual Bills ───────────────────────────────
  if (settings.manual_bill_reminders) {
    const threshold = settings.manual_bill_reminder_days || 3;
    for (const bill of bills) {
      if (bill.payment_type !== 'auto' && bill.status !== 'Paid') {
        const dueYmd = bill.due_date || bill.dueDate;
        if (!dueYmd) continue;
        const diffDays = diffDaysYmd(todayYmd, dueYmd);
        const id = bill.id?.toString();
        if (diffDays >= 0 && diffDays <= threshold) {
          push({
            user_id: userId,
            household_id: householdId,
            type: 'manual_bill',
            title: 'Manual Bill Due Soon',
            message: `Your bill for ${bill.name} is due in ${diffDays} days.`,
            related_entity_id: id,
            dedupe_key: `${id}-${dueYmd}-manual_bill`,
          });
        } else if (diffDays < 0 && settings.overdue_bill_reminders !== false) {
          // #132: overdue manual bills used to generate nothing at all once
          // diffDays went negative — the "due soon" branch above only
          // covers 0..threshold. Bill is still unpaid, so keep nagging daily
          // until it's paid: dedupe_key includes todayYmd (not just dueYmd)
          // so a fresh, undeduped reminder is produced every day it remains
          // overdue instead of exactly once.
          // #139: additionally gated on overdue_bill_reminders — a standalone
          // toggle layered on top of manual_bill_reminders above.
          push({
            user_id: userId,
            household_id: householdId,
            type: 'manual_bill',
            title: 'Bill Overdue',
            message: `Your bill for ${bill.name} is ${Math.abs(diffDays)} day(s) overdue.`,
            related_entity_id: id,
            dedupe_key: `${id}-${dueYmd}-manual_bill-overdue-${todayYmd}`,
          });
        }
      }
    }
  }

  // ── Auto-Pay Bills ─────────────────────────────
  if (settings.auto_pay_reminders) {
    const threshold = settings.auto_pay_reminder_days || 1;
    for (const bill of bills) {
      if (bill.payment_type === 'auto' && bill.status !== 'Paid') {
        const dueYmd = bill.due_date || bill.dueDate;
        if (!dueYmd) continue;
        const diffDays = diffDaysYmd(todayYmd, dueYmd);
        if (diffDays <= threshold) {
          const id = bill.id?.toString();
          // #132: diffDays <= 0 used to be treated as one single "passed"
          // state with a date-invariant dedupe_key, so it only ever fired
          // once and never again while the bill stayed unpaid. Day 0 (due
          // today, not yet overdue) is kept as its own non-repeating
          // "should now be paid" notice — the auto-pay attempt is expected
          // to actually happen today, so there's nothing to nag about yet.
          // Only diffDays < 0 (the auto-pay attempt's day has passed and
          // it's still not Paid) is the actual overdue case, and that's
          // what rolls its dedupe_key by todayYmd so it repeats daily until
          // the bill is marked Paid.
          const isOverdue = diffDays < 0;
          // #139: overdue auto-pay reminders additionally gated on
          // overdue_bill_reminders — the day-0 "should now be paid" and
          // upcoming branches above are untouched by this toggle.
          if (isOverdue && settings.overdue_bill_reminders === false) continue;
          const message =
            diffDays === 0
              ? `Your automatic payment should now be paid.`
              : diffDays < 0
              ? `Your auto-paid bill ${bill.name} is ${Math.abs(diffDays)} day(s) overdue and still hasn't been marked paid.`
              : `Your auto-paid bill ${bill.name} will be processed in ${diffDays} days.`;
          push({
            user_id: userId,
            household_id: householdId,
            type: 'auto_pay',
            // #132: title now distinguishes "just passed today" from
            // "still overdue days later" — otherwise day 5/10/etc. would
            // keep saying "Passed" even though the message body already
            // varies with the day count, which reads oddly for a repeating
            // daily nag.
            title: isOverdue ? 'Bill Overdue' : diffDays === 0 ? 'Auto-Pay Bill Passed' : 'Auto-Pay Upcoming',
            message,
            related_entity_id: id,
            dedupe_key: isOverdue
              ? `${id}-${dueYmd}-auto_pay-overdue-${todayYmd}`
              : `${id}-${dueYmd}-auto_pay`,
          });
        }
      }
    }
  }

  // ── Lodge Payment ──────────────────────────────
  if (settings.lodge_payment_reminders && currentMemberId) {
    for (const hist of payHistory) {
      if (hist.status === 'pending' && hist.member_id === currentMemberId) {
        push({
          user_id: userId,
          household_id: householdId,
          type: 'lodge_payment',
          title: 'Payment Requires Confirmation',
          message: `You have an unconfirmed payment logged on ${hist.pay_date}.`,
          related_entity_id: hist.id,
          dedupe_key: `${hist.id}-lodge_payment`,
        });
      }
    }
  }

  // ── Payday "Log Your Pay" ──────────────────────
  // Mirrors the lodge_payment pattern: personalized to the current member
  // only (not broadcast to the whole household), gated the same way behind
  // `currentMemberId`. A schedule is "loggable" once its next_pay_date has
  // arrived/passed — matching the exact isLoggable() check used in the
  // Payday screen (src/app/payday/payday-client.tsx). Logging a pay advances
  // next_pay_date, so the dedupe_key naturally rolls over each pay cycle
  // (same convention as manual_bill/auto_pay keying off the due date).
  if (settings.payday_reminders !== false && currentMemberId) {
    for (const schedule of paySchedules) {
      if (String(schedule.member_id ?? '') !== currentMemberId) continue;
      const nextPayYmd = schedule.next_pay_date;
      if (!nextPayYmd) continue;
      if (diffDaysYmd(todayYmd, nextPayYmd) <= 0) {
        push({
          user_id: userId,
          household_id: householdId,
          type: 'payday_log_pay',
          title: 'Payday — Log Your Pay',
          message: `Your pay from ${nextPayYmd} is ready to log.`,
          related_entity_id: String(schedule.id),
          dedupe_key: `${schedule.id}-${nextPayYmd}-payday_log_pay`,
        });
      }
    }
  }

  // ── Goal/Fund Milestone Reached ────────────────
  // Household-wide like manual_bill/auto_pay (every member gets notified
  // about every household fund crossing a milestone, not just its owner) —
  // no existing "milestone" concept exists anywhere in this codebase, so
  // this uses sensible round percentage-of-target thresholds
  // (GOAL_MILESTONE_THRESHOLDS = 25/50/75/100%). dedupe_key is keyed by
  // fund + threshold (not by date), so each milestone fires exactly once per
  // fund even if the balance later dips back below it.
  if (settings.goal_milestone_reminders !== false) {
    for (const fund of funds) {
      const current = Number(fund.currentAmount ?? fund.current_amount ?? 0);
      const target = Number(fund.targetAmount ?? fund.target_amount ?? 0);
      if (!target || target <= 0) continue;
      const pct = (current / target) * 100;
      for (const threshold of GOAL_MILESTONE_THRESHOLDS) {
        if (pct < threshold) continue;
        push({
          user_id: userId,
          household_id: householdId,
          type: 'goal_milestone',
          title: threshold >= 100 ? 'Goal Reached!' : `Goal ${threshold}% Funded`,
          message:
            threshold >= 100
              ? `${fund.name} has reached its target!`
              : `${fund.name} has reached ${threshold}% of its target.`,
          related_entity_id: String(fund.id),
          dedupe_key: `${fund.id}-${threshold}-goal_milestone`,
        });
      }
    }
  }

  return rows;
}
