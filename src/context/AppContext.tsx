"use client";

import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { CheckCircle, Clock, AlertCircle, Plane, Shield, Car, PiggyBank, Home, BookOpen, CreditCard, TrendingUp, HelpCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { type Session } from "@supabase/supabase-js";
import { type HouseholdContribution, type ContributionRule } from "@/types";
import { adjustAutopayBillDate } from "@/lib/utils";
import { generateReminders } from "@/lib/notifications/generateReminders";
import { todayInZone } from "@/lib/notifications/timezone";
import { getPushStatus, syncPushSubscriptionIfPresent, type PushStatus } from "@/lib/pushClient";


/* ═══════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════ */

export interface Bill {
  id: string | number;
  name: string;
  category: string;
  dueDate: string;
  amount: number;
  status: string;
  frequency: string;
  statusColor: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statusIcon: React.ComponentType<any>;
  categoryColor: string;
  assignee_id?: string;
  payment_type?: "auto" | "manual";
  invoice_date?: string | null;
  due_date?: string | null;
  notes?: string | null;
  is_recurring?: boolean;
  is_paused?: boolean;
}

export interface Fund {
  id: string | number;
  name: string;
  category: string;
  currentAmount: number;
  targetAmount: number;
  bgLight: string;
  barColor: string;
  accentText: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  deadline: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  member_id?: string | null;
  owner_id?: string | null;
}

export interface Payday {
  id: string | number;
  date: string; // ISO YYYY-MM-DD
  amount: number;
}

export interface PaySchedule {
  id: string;
  household_id: string;
  member_id: string;
  amount: number | null;
  frequency: "weekly" | "fortnightly" | "monthly";
  is_fixed_amount: boolean;
  next_pay_date: string; // YYYY-MM-DD
  created_at: string;
}

export interface PayHistory {
  id: string;
  household_id: string;
  member_id: string;
  pay_schedule_id: string | null;
  amount: number;
  pay_date: string; // YYYY-MM-DD
  notes: string | null;
  created_at: string;
  rule_id: string | null;
  allocation_type: "goal" | "contribution" | null;
  allocation_target_id: string | null;
  status?: 'pending' | 'confirmed';
}

export interface Member {
  id: string | number;
  name: string;
  email: string;
  role: 'owner' | 'member';
  avatar: string;
  avatar_url?: string | null;
  invitation_status?: 'pending' | 'accepted' | 'declined';
  user_id?: string | null;
}

export interface Household {
  id: string;
  name: string;
  is_joint_fund: boolean;
  user_id?: string;
  created_at?: string;
}

export interface BillSplit {
  id: string;
  bill_id: string;
  member_id: string;
  amount: number;
  created_at: string;
  status?: string;
  is_assignee?: boolean;
}

/**
 * Issue #98 (Slice 1 of 6): variable, no-due-date spend (groceries, fuel, etc.), tracked
 * separately from `bills`. Schema/migration-only for now — no UI or business logic reads this
 * yet; later sub-slices of #98 add the add/edit UI (2), Direct Pay split logic (3), the
 * weekly-draw calc integration (4), health score integration (5), and #70 category ordering (6).
 */
export interface Expense {
  id: string;
  household_id: string;
  name: string;
  category: string;
  amount: number;
  notes: string | null;
  /** Which of the two mutually-exclusive split shapes below applies to this expense. */
  split_mode: "assignee" | "percentage";
  /** Set when split_mode === "assignee" — whole-item assignment, mirrors bills.assignee_id. */
  assignee_id: string | null;
  created_at: string;
}

/**
 * Issue #98 (Slice 1 of 6): one row per household member for an expense with
 * split_mode === "percentage". New pattern (not reused from `bill_splits`, which stores computed
 * dollar amounts) — the later Direct-Pay-split sub-slice computes dollar amounts from these raw
 * percentages once the weekly-draw calc exists.
 */
export interface ExpenseSplit {
  id: string;
  household_id: string;
  expense_id: string;
  member_id: string;
  percentage: number;
  created_at: string;
}

export interface NotificationSettings {
  id?: string;
  user_id?: string;
  all_enabled: boolean;
  manual_bill_reminders: boolean;
  lodge_payment_reminders: boolean;
  auto_pay_reminders: boolean;
  manual_bill_reminder_days: number;
  auto_pay_reminder_days: number;
  /** Issue #97 (Slice 9): payday "log your pay" reminders. */
  payday_reminders: boolean;
  /** Issue #97 (Slice 9): goal/fund milestone-reached reminders. */
  goal_milestone_reminders: boolean;
  /** Issue #97 (Slice 9): per-user preferred notify hour, 0-23 (local to the
   *  household's timezone). Not yet consumed for actual send-timing — that's
   *  Slice 11 (the cron rewrite); this only stores the preference. */
  notify_hour: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  related_entity_id?: string | null;
  dedupe_key?: string | null;
  created_at: string;
}

/* ═══════════════════════════════════════════════
   Initial Mock Data (Retained for reference)
   ═══════════════════════════════════════════════ */

const INITIAL_BILLS: Bill[] = [
  {
    id: 1,
    name: "Rent / Mortgage",
    category: "Housing",
    dueDate: "June 30, 2026",
    amount: 1200.0,
    status: "Due Soon",
    frequency: "Monthly",
    statusColor: "text-amber-600 bg-accent/10 dark:text-accent",
    statusIcon: Clock,
    categoryColor: "bg-secondary/10 text-secondary",
    is_recurring: true,
  },
  {
    id: 2,
    name: "Electricity Bill",
    category: "Utilities",
    dueDate: "July 02, 2026",
    amount: 145.5,
    status: "Due Soon",
    frequency: "Monthly",
    statusColor: "text-amber-600 bg-accent/10 dark:text-accent",
    statusIcon: Clock,
    categoryColor: "bg-accent/10 text-amber-600 dark:text-accent",
    is_recurring: true,
  },
  {
    id: 3,
    name: "Fiber Internet",
    category: "Services",
    dueDate: "July 05, 2026",
    amount: 79.99,
    status: "Due Soon",
    frequency: "Monthly",
    statusColor: "text-amber-600 bg-accent/10 dark:text-accent",
    statusIcon: Clock,
    categoryColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    is_recurring: true,
  },
  {
    id: 4,
    name: "Gold's Gym Membership",
    category: "Health & Fitness",
    dueDate: "June 20, 2026",
    amount: 45.0,
    status: "Paid",
    frequency: "Monthly",
    statusColor: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
    statusIcon: CheckCircle,
    categoryColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    is_recurring: true,
  },
  {
    id: 5,
    name: "Car Insurance",
    category: "Auto",
    dueDate: "June 18, 2026",
    amount: 180.0,
    status: "Paid",
    frequency: "Monthly",
    statusColor: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
    statusIcon: CheckCircle,
    categoryColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    is_recurring: true,
  },
  {
    id: 6,
    name: "Netflix & Spotify Premium",
    category: "Entertainment",
    dueDate: "June 15, 2026",
    amount: 24.99,
    status: "Overdue",
    frequency: "Monthly",
    statusColor: "text-rose-600 bg-rose-500/10 dark:text-rose-400",
    statusIcon: AlertCircle,
    categoryColor: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    is_recurring: true,
  },
];

const INITIAL_FUNDS: Fund[] = [
  {
    id: 1,
    name: "Holiday Trip",
    category: "Travel",
    currentAmount: 3250.0,
    targetAmount: 5000.0,
    bgLight: "bg-secondary/10 text-secondary",
    barColor: "bg-secondary",
    accentText: "text-secondary",
    icon: Plane,
    deadline: null,
    status: "in_progress",
  },
  {
    id: 2,
    name: "Emergency Fund",
    category: "Safety Net",
    currentAmount: 7500.0,
    targetAmount: 10000.0,
    bgLight: "bg-primary/10 text-primary",
    barColor: "bg-primary",
    accentText: "text-primary",
    icon: Shield,
    deadline: null,
    status: "in_progress",
  },
  {
    id: 3,
    name: "New Car",
    category: "Transport",
    currentAmount: 1700.0,
    targetAmount: 15000.0,
    bgLight: "bg-accent/10 text-accent",
    barColor: "bg-accent",
    accentText: "text-accent",
    icon: Car,
    deadline: null,
    status: "in_progress",
  },
];

const INITIAL_PAYDAYS: Payday[] = [
  { id: 1, date: "2026-07-05", amount: 2500 },
  { id: 2, date: "2026-07-19", amount: 2500 },
  { id: 3, date: "2026-08-02", amount: 2500 },
];

/* ═══════════════════════════════════════════════
   UI Mapping Utilities
   ═══════════════════════════════════════════════ */

function getStatusStyle(status: string) {
  switch (status) {
    case "Paid":
      return {
        statusColor: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
        statusIcon: CheckCircle,
      };
    case "Overdue":
      return {
        statusColor: "text-rose-600 bg-rose-500/10 dark:text-rose-400",
        statusIcon: AlertCircle,
      };
    case "Due Soon":
    default:
      return {
        statusColor: "text-amber-600 bg-accent/10 dark:text-accent",
        statusIcon: Clock,
      };
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case "Household Bills":
      return "bg-secondary/10 text-secondary";
    case "Temporary":
      return "bg-accent/10 text-amber-600 dark:text-accent";
    case "Subscriptions":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "Living Costs":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "Debt & Finance":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
    case "Loans":
      return "bg-pink-500/10 text-pink-600 dark:text-pink-400";
    default:
      return "bg-surface-raised/10 text-muted dark:text-muted";
  }
}

function getFundStyle(category: string) {
  switch (category) {
    case "Home & Living":
      return {
        bgLight: "bg-indigo-500/10 text-indigo-500",
        barColor: "bg-indigo-500",
        accentText: "text-indigo-500",
        icon: Home,
      };
    case "Debt & Finance":
      return {
        bgLight: "bg-rose-500/10 text-rose-500",
        barColor: "bg-rose-500",
        accentText: "text-rose-500",
        icon: CreditCard,
      };
    case "Vacation & Travel":
      return {
        bgLight: "bg-secondary/10 text-secondary",
        barColor: "bg-secondary",
        accentText: "text-secondary",
        icon: Plane,
      };
    case "Savings":
      return {
        bgLight: "bg-emerald-500/10 text-emerald-500",
        barColor: "bg-emerald-500",
        accentText: "text-emerald-500",
        icon: PiggyBank,
      };
    case "Emergency":
      return {
        bgLight: "bg-primary/10 text-primary",
        barColor: "bg-primary",
        accentText: "text-primary",
        icon: Shield,
      };
    case "Wish List":
      return {
        bgLight: "bg-cyan-500/10 text-cyan-500",
        barColor: "bg-cyan-500",
        accentText: "text-cyan-500",
        icon: Clock,
      };
    case "Education":
      return {
        bgLight: "bg-accent/10 text-yellow-600 dark:text-accent",
        barColor: "bg-accent",
        accentText: "text-yellow-600 dark:text-accent",
        icon: BookOpen,
      };
    case "Other":
    default:
      return {
        bgLight: "bg-surface-raised/10 text-muted dark:text-muted",
        barColor: "bg-surface-raised",
        accentText: "text-muted dark:text-muted",
        icon: HelpCircle,
      };
  }
}

function generateRandomCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

function toLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateForDb(dateStr: string): string {
  if (!dateStr) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  try {
    const parsed = new Date(dateStr + "T00:00:00");
    if (!isNaN(parsed.getTime())) {
      return toLocalYmd(parsed);
    }
  } catch (e) {
    console.error("Failed to parse date for database:", dateStr);
  }
  return dateStr;
}

function formatDateForUi(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      });
    }
  } catch (e) {
    console.error("Failed to format date for UI:", dateStr);
  }
  return dateStr;
}

/* ═══════════════════════════════════════════════
   Offline-vs-"answered" Detection (#71 follow-up)
   ═══════════════════════════════════════════════ */
// A thrown/errored Supabase call and a call that actually reached the server
// and got a definitive answer are NOT the same evidence, and loadData's error
// branches were treating them as if they were. On an iPhone with no network at
// all (airplane mode, or a fresh cold-start of the PWA while offline), every
// query in loadData fails purely because the request never left the device —
// that says nothing about whether the signed-in user has a household. Reading
// it as "not onboarded" flipped AppShell's `session && !isOnboarded &&
// !isDataLoading` gate open over a user who was, per their local session,
// still signed in — the exact "offline nav dumps you on onboarding while
// signed in" limbo reported on PR #121, recoverable only by toggling
// connectivity to force a real sign-out/in or by force-closing the app.
// `navigator.onLine === false` is the strongest, browser-verified signal (set
// by the OS network stack, not guessed from an error string) and covers the
// reported scenario directly. The message-sniffing fallback catches the
// remaining case where the device reports itself online but requests still
// can't complete (captive portal, DNS failure, etc.) — Chrome/Firefox throw
// TypeError("Failed to fetch"/"NetworkError..."), Safari throws
// TypeError("Load failed").
function isNetworkFailure(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const message =
    err instanceof Error
      ? err.message
      : (err as { message?: string } | null | undefined)?.message;
  if (typeof message === 'string') {
    return /fetch|network|load failed/i.test(message);
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBillFromDb(dbBill: any): Bill {
  const adjustedDueDate = adjustAutopayBillDate(
    dbBill.due_date,
    dbBill.frequency,
    dbBill.payment_type
  );

  let mappedStatus = dbBill.status;
  if (dbBill.is_paused) {
    mappedStatus = "Paused";
  } else if (mappedStatus !== "Paid" && dbBill.payment_type?.toLowerCase() !== "auto") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (adjustedDueDate) {
      const d = new Date(adjustedDueDate + "T00:00:00");
      if (!isNaN(d.getTime())) {
        d.setHours(0, 0, 0, 0);
        if (d.getTime() < today.getTime()) {
          mappedStatus = "Overdue";
        }
      }
    }
  }

  const statusStyle = getStatusStyle(mappedStatus);
  const categoryColor = getCategoryColor(dbBill.category);
  return {
    id: dbBill.id,
    name: dbBill.name,
    category: dbBill.category,
    dueDate: formatDateForUi(adjustedDueDate),
    amount: parseFloat(dbBill.amount),
    status: mappedStatus,
    frequency: dbBill.frequency,
    statusColor: statusStyle.statusColor,
    statusIcon: statusStyle.statusIcon,
    categoryColor,
    assignee_id: dbBill.assignee_id,
    payment_type: dbBill.payment_type ? (dbBill.payment_type.toLowerCase() as "auto" | "manual") : undefined,
    invoice_date: dbBill.invoice_date,
    due_date: adjustedDueDate,
    is_recurring: dbBill.is_recurring !== undefined ? dbBill.is_recurring : true,
    is_paused: dbBill.is_paused || false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFundFromDb(dbFund: any): Fund {
  const fundStyle = getFundStyle(dbFund.category);
  return {
    id: dbFund.id,
    name: dbFund.name,
    category: dbFund.category,
    currentAmount: parseFloat(dbFund.current_amount),
    targetAmount: parseFloat(dbFund.target_amount),
    bgLight: fundStyle.bgLight,
    barColor: fundStyle.barColor,
    accentText: fundStyle.accentText,
    icon: fundStyle.icon,
    deadline: dbFund.deadline || null,
    status: dbFund.status || 'not_started',
    member_id: dbFund.member_id || null,
    owner_id: dbFund.owner_id || null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPaydayFromDb(dbPayday: any): Payday {
  return {
    id: dbPayday.id,
    date: dbPayday.date,
    amount: parseFloat(dbPayday.amount),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMemberFromDb(dbMember: any): Member {
  const name = dbMember.name || (dbMember.email ? dbMember.email.split("@")[0] : "Member");
  return {
    id: dbMember.id,
    name,
    email: dbMember.email || "",
    role: dbMember.role || "member",
    avatar: name.charAt(0).toUpperCase(),
    avatar_url: dbMember.avatar_url || null,
    invitation_status: dbMember.invitation_status || "accepted",
    user_id: dbMember.user_id || null,
  };
}

/* ═══════════════════════════════════════════════
   Warm-Reload Empty-Result Race Guard (#74)
   ═══════════════════════════════════════════════ */
// A Supabase query that succeeds with zero rows and a genuine "this
// household/user has no rows" are indistinguishable at the call site. On a
// warm reload (token refresh / tab refocus) RLS can evaluate the request
// before the refreshed auth token has been attached to it, and hand back an
// empty-but-error-free result even though the real row set is non-empty.
// `[]` is truthy, so writing that straight into state overwrites real,
// already-loaded data — this is what made the Household Health rank flap to
// "Fully Funded" and back on a warm reload with no real data change.
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
// Shared by every loadData slice (bills/funds/paydays/members/bill_splits)
// so the logic lives in exactly one place; #89 reuses it as-is.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseArrayResult<T = any> = { data: T[] | null; error: unknown };

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

/* ═══════════════════════════════════════════════
   Context Shape
   ═══════════════════════════════════════════════ */

interface AppContextValue {
  /* Onboarding */
  isOnboarded: boolean;
  completeOnboarding: () => void;
  householdName: string;
  setHouseholdName: (name: string, userId?: string | null) => void;
  createHousehold: (name: string) => Promise<string>;
  isJointFund: boolean;
  updateHouseholdPaymentMode: (isJointFund: boolean) => Promise<void>;
  householdTimezone: string;
  updateHouseholdTimezone: (timezone: string) => Promise<void>;

  /* Bills */
  bills: Bill[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addBill: (billData: any, splitsData?: any[]) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateBill: (billId: string | number, billData: any, splitsData: any[]) => Promise<void>;
  togglePaid: (id: string | number) => void;
  markAsPaid: (bill: Bill) => Promise<void>;
  markAsUnpaid: (bill: Bill) => Promise<void>;
  togglePauseBill: (id: string | number, isPaused: boolean) => Promise<void>;
  deleteBill: (id: string | number) => void;

  /* Funds */
  funds: Fund[];
  addFund: (fund: Omit<Fund, "bgLight" | "barColor" | "accentText" | "icon">) => void;
  updateGoal: (id: string | number, goalData: any) => Promise<void>;
  deleteGoal: (id: string | number) => Promise<void>;
  updateFund: (id: string | number, fundData: any) => Promise<void>;
  deleteFund: (id: string | number) => Promise<void>;
  addMoneyToFund: (id: string | number, amount: number) => void;
  addToGoal: (id: string | number, amount: number) => Promise<void>;

  /* Paydays */
  paydays: Payday[];
  addPayday: (payday: Payday) => void;
  deletePayday: (id: string | number) => void;

  /* Payday Schedule & History */
  paySchedules: PaySchedule[];
  payHistory: PayHistory[];
  addPaySchedule: (data: Omit<PaySchedule, "id" | "household_id" | "created_at">) => Promise<void>;
  updatePaySchedule: (id: string, data: Omit<PaySchedule, "id" | "household_id" | "created_at">) => Promise<void>;
  deletePaySchedule: (id: string) => Promise<void>;
  logPay: (payScheduleId: string, amount: number, date: string, notes: string | null, status?: 'pending' | 'confirmed') => Promise<PayHistory | null>;
  confirmPay: (historyId: string) => Promise<void>;
  confirmAndUpdatePay: (historyId: string, newAmount: number, notes?: string | null) => Promise<void>;
  autoLogMissedPays: () => Promise<void>;
  deletePayHistory: (id: string) => Promise<void>;
  calculateAveragePay: (memberId: string) => number | null;

  /* Household Contributions */
  householdContributions: HouseholdContribution[];
  fetchHouseholdContributions: (householdId?: string) => Promise<void>;
  setContribution: (memberId: string, amount: number, frequency: "weekly" | "fortnightly" | "monthly") => Promise<void>;
  deleteContribution: (id: string) => Promise<void>;

  /* Contribution Rules */
  contributionRules: ContributionRule[];
  fetchContributionRules: (householdId?: string) => Promise<void>;
  addRule: (ruleData: Omit<ContributionRule, "id" | "household_id" | "created_at">) => Promise<void>;
  updateRule: (id: string, ruleData: Partial<Omit<ContributionRule, "id" | "household_id" | "created_at">>) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  toggleRuleActive: (id: string) => Promise<void>;
  checkAndApplyRules: (memberId: string, payAmount: number) => ContributionRule[];
  applyRuleAllocation: (rule: ContributionRule, payHistoryId: string) => Promise<void>;

  /* Members */
  members: Member[];
  householdMembers: Member[];
  addMember: (member: Member) => void;
  removeMember: (id: string | number, reassignBillsTo?: string, reassignGoalsTo?: string) => Promise<void>;
  updateMember: (id: string | number, data: Partial<Omit<Member, "id">>) => Promise<void>;
  updateMemberAvatar: (memberId: string | number, avatarUrl: string | null) => Promise<void>;
  joinCode: string | null;
  codeExpiresAt: string | null;
  regenerateJoinCode: () => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  deleteHousehold: () => Promise<void>;

  /* Bill Splits */
  billSplits: BillSplit[];
  setBillSplits: React.Dispatch<React.SetStateAction<BillSplit[]>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addBillSplit: (splitData: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateBillSplit: (id: string | number, splitData: any) => void;
  deleteBillSplit: (id: string | number) => void;

  /* Auth */
  session: Session | null;
  isAuthLoading: boolean;
  isDataLoading: boolean;
  /* True once loadData has been stuck on a network failure (see
   * isNetworkFailure/#71) for long enough that automatic recovery
   * (polling, 'online'/'visibilitychange'/'focus' retries) shouldn't be
   * trusted to be enough on its own — AppShell shows a manual retry
   * affordance instead of an indefinite silent spinner. */
  showOfflineRetry: boolean;
  /* Manually re-runs loadData and clears showOfflineRetry, for the retry
   * affordance above. */
  retryLoadData: () => void;

  /* Notifications */
  notifications: Notification[];
  notificationSettings: NotificationSettings | null;
  markNotificationRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  /* Slice 13 (#99): this device's push subscription health, centralized so
   * every NotificationCenter mount point shares one copy — see review
   * finding 2. */
  pushStatus: PushStatus | null;
  setPushStatus: (status: PushStatus) => void;

  /* Theme */
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/* ═══════════════════════════════════════════════
   Provider
   ═══════════════════════════════════════════════ */

interface AppProviderProps {
  children: ReactNode;
  initialSession?: Session | null;
  initialIsOnboarded?: boolean;
}

export function AppProvider({ children, initialSession = null, initialIsOnboarded = false }: AppProviderProps) {
  /* ── Theme State & Logic ─────────────────────── */
  const [theme, setThemeState] = useState<"light" | "dark" | "system">("system");

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as "light" | "dark" | "system" | null;
      if (savedTheme) {
        setTimeout(() => {
          setThemeState(savedTheme);
        }, 0);
      }
    }
  }, []);

  // Update theme settings on change
  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;

    const applyTheme = (t: "light" | "dark" | "system") => {
      let activeTheme = t;
      if (t === "system") {
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        activeTheme = systemPrefersDark ? "dark" : "light";
      }

      // Update HTML tag classes/dataset
      if (!root.classList.contains(activeTheme)) {
        root.classList.remove("light", "dark");
        root.classList.add(activeTheme);
      }
      if (root.getAttribute("data-theme") !== activeTheme) {
        root.setAttribute("data-theme", activeTheme);
      }



      console.log("[ThemeManager] applied:", activeTheme, "HTML classes:", root.className, "data-theme:", root.getAttribute("data-theme"));
    };

    applyTheme(theme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
    }

    // Set up MutationObserver to defend against Next.js HTML tag reconciliations
    const observer = new MutationObserver(() => {
      applyTheme(theme);
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme"]
    });

    let cleanupSystemListener: (() => void) | undefined;
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme("system");
      mediaQuery.addEventListener("change", handleChange);
      cleanupSystemListener = () => mediaQuery.removeEventListener("change", handleChange);
    }

    return () => {
      observer.disconnect();
      if (cleanupSystemListener) cleanupSystemListener();
    };
  }, [theme]);

  const setTheme = (newTheme: "light" | "dark" | "system") => {
    setThemeState(newTheme);
  };

  /* ── Onboarding & Household ──────────────────── */
  const [isOnboarded, setIsOnboarded] = useState(initialIsOnboarded);
  const [householdName, setHouseholdNameState] = useState("");
  const [dbHouseholdId, setDbHouseholdId] = useState<string | null>(null);
  const [isJointFund, setIsJointFund] = useState(false);
  // Falls back to Australia/Sydney (matches the DB column default and
  // todayInZone's own fallback in src/lib/notifications/timezone.ts) whenever
  // a household row hasn't been fetched yet or has no value set.
  const [householdTimezone, setHouseholdTimezone] = useState("Australia/Sydney");
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);
  // Sticky record of WHICH user we have positively identified a household for
  // this session — the user's id, not a bare boolean. A ref, not derived state,
  // because the async functions that need it (loadData, createHousehold,
  // joinHousehold, ensureHousehold) close over the render that scheduled them
  // and cannot observe setState calls made since — including their own. Used to
  // keep a *failed* query from clearing isOnboarded, which is what opens the #75
  // item 3 trap door: an already-onboarded user shown "create or join", who can
  // then create or join a second household and lock themselves out of their real
  // data.
  //
  // Keyed by user id because it must not survive a user switch. The installed
  // auth-js (2.108.2) emits only SIGNED_IN for signInWithPassword — no
  // SIGNED_OUT first — and /login is reachable while already signed in, so user
  // B can arrive with no null-session tick at all: loadData's no-session branch
  // never runs, and a bare boolean would still read true. B's membership query
  // then erroring would be read as "B is already onboarded", leaving isOnboarded
  // true over user A's dbHouseholdId, household name and data arrays — B looking
  // at A's dashboard. AppProvider never unmounts across sign-out/sign-in (both
  // are client-side router navigations, no page reload), so none of that state
  // is cleared for us. A user-id mismatch therefore counts as "unknown".
  // Cleared on sign-out (see loadData's no-session branch).
  const resolvedHouseholdUserIdRef = useRef<string | null>(null);

  /* ── Auth ────────────────────────────────── */
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isAuthLoading, setIsAuthLoading] = useState(!initialSession);
  // Pessimistic by design: assume household data is NOT loaded until loadData
  // proves otherwise. AppShell's gate (src/components/AppShell.tsx:182) is the
  // app's single loading gate, so any render where this is wrongly false hands
  // every dashboard component empty arrays to compute against — the cold-open
  // "Fully Funded" flash in #73 (empty state scores exactly 85, clearing the
  // >= 80 threshold). The previous initialiser was
  // `!initialIsOnboarded && !!initialSession`, which evaluated to false for
  // every user unconditionally — not conditionally on onboarding. This
  // function's defaults are `initialSession = null, initialIsOnboarded = false`
  // and the sole mount site passes no props (src/app/layout.tsx:104), so the
  // expression was always `true && false`. There is no server-provided initial
  // data of any kind, and every data array below starts as [], so
  // "already loaded" is never a legitimate starting assumption.
  const [isDataLoading, setIsDataLoading] = useState(true);
  // True while loadData is stuck in the "network failure, deliberately left
  // isDataLoading true" state from the isNetworkFailure branches below (#71
  // follow-up). Drives the polling/visibilitychange/focus recovery effect
  // and, after it's been true for a while, the showOfflineRetry escape
  // hatch — see both further down.
  const [isNetworkStuck, setIsNetworkStuck] = useState(false);
  const [showOfflineRetry, setShowOfflineRetry] = useState(false);
  // True once the Retry button has been shown at least once during the
  // CURRENT stuck episode (set by the escape-hatch effect below when its 30s
  // timer fires, cleared by the resolve-reset effect once the episode ends).
  // Declared here, ahead of noteRetryAttempt, since that function reads it;
  // both live near the state they coordinate.
  const hasShownOfflineRetryRef = useRef(false);
  // Bumped once per failed retry attempt (manual Retry click, or an automatic
  // poll/online/focus/visibilitychange retry) that lands AFTER the
  // escape-hatch button has already been shown once this episode. Included in
  // the escape-hatch effect's dependency array below so that effect re-arms a
  // fresh 30s timer on each such attempt, instead of relying on
  // isNetworkStuck's true->true non-transition (the bug: retryLoadData set
  // showOfflineRetry false directly, and nothing else was watching to put it
  // back if the retry it kicked off also failed). Gated on
  // hasShownOfflineRetryRef, not "is the button visible right now" — a manual
  // retry deliberately hides the button before this fires, and gating on
  // current visibility would miss exactly that case. Deliberately NOT bumped
  // by retries before the button has ever shown in this episode — that would
  // restart the initial 30s countdown on every 5s poll tick and the button
  // would never appear at all.
  const [retryGeneration, setRetryGeneration] = useState(0);
  function noteRetryAttempt() {
    if (hasShownOfflineRetryRef.current) {
      setRetryGeneration((g) => g + 1);
    }
  }
  // Guards against overlapping loadData() calls. Automatic recovery calls
  // loadData every 5s while stuck (plus on 'online'/'focus'/'visibilitychange'),
  // and if a single call takes longer than 5s to settle the interval would
  // otherwise fire again before it finishes, stacking concurrent in-flight
  // requests indefinitely. Set at the very top of loadData and cleared in a
  // top-level finally so every exit path (including the early "no session"
  // return) releases it.
  const loadDataInFlightRef = useRef(false);

  // Mirrors of the two values the loadData effect below depends on, as of the
  // last time an auth callback dispatched them. Both auth callbacks fire outside
  // React's render cycle from an effect with an empty dependency array, so they
  // cannot read the live state (their closure is frozen at mount) — and they
  // need to know whether the state change they are about to make will actually
  // re-run that effect. See willRunLoadData below for why that matters (#75).
  const lastDispatchedSessionRef = useRef<Session | null>(initialSession);
  const isAuthLoadingRef = useRef(!initialSession);

  useEffect(() => {
    // Raising isDataLoading is only safe when loadData is guaranteed to run and
    // clear it again. The auth callbacks do NOT run loadData themselves; the
    // effect below does, and it re-runs only when one of its dependencies
    // changes identity — a genuinely new session object, or isAuthLoading
    // flipping. supabase-js can emit a repeated INITIAL_SESSION / SIGNED_IN
    // carrying the SAME session object; setSession then bails out (Object.is),
    // isAuthLoading is already false, so the effect never re-fires and a raised
    // flag is never cleared — a permanent full-screen wheel, since isDataLoading
    // initialises true (#73) and AppShell's gate (src/components/AppShell.tsx:172,
    // :182) is the app's only loading gate. This predicate is checked BEFORE the
    // refs are updated, so it compares against what React currently holds.
    // Deliberately narrow: it changes only *whether the flag is raised*, never
    // when or how loadData is triggered (#75 item 1).
    const willRunLoadData = (session: Session | null) =>
      isAuthLoadingRef.current || lastDispatchedSessionRef.current !== session;

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        console.log('Auth useEffect - getSession result:', session ? 'has session' : 'no session', 'user:', session?.user?.id);
        const loadDataWillRun = willRunLoadData(session);
        lastDispatchedSessionRef.current = session;
        isAuthLoadingRef.current = false;
        setSession(session);
        setIsAuthLoading(false);
        // Mark data as loading in the same batch as the session resolving, so the
        // very first render after auth knows "session found, data not yet checked".
        // Without this, isDataLoading stays false until loadData runs one render
        // later, and AppShell's Onboarding gate briefly wins the gap — the
        // cold-start "create or join" flash (see #49). Only when a session exists;
        // a null session must stay non-loading so the login redirect still fires.
        if (session && loadDataWillRun) setIsDataLoading(true);
      })
      .catch((err) => {
        // getSession() reads from storage and can reject (corrupt/blocked local
        // storage, a failed refresh round-trip). Unhandled, the rejection meant
        // setIsAuthLoading(false) never ran, so isDataLoading — true from mount
        // since #73 — never cleared: a permanent wheel, and AppShell never got
        // far enough for the /login redirect to fire (#75 item 2).
        console.error('[AppContext] auth.getSession() rejected:', err);

        // If onAuthStateChange has already delivered a real session, it owns the
        // auth state. Don't sign a working app out just because this parallel
        // read failed — that path has already cleared isAuthLoading and will
        // have raised/cleared isDataLoading correctly.
        if (lastDispatchedSessionRef.current) return;

        // Otherwise settle on a coherent "no session" state: auth resolved, no
        // data to load. That is what AppShell's gate needs to stop showing the
        // wheel and let the /login redirect happen.
        isAuthLoadingRef.current = false;
        setSession(null);
        setIsAuthLoading(false);
        setIsDataLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth useEffect - onAuthStateChange event:', _event, 'session:', session ? 'has session' : 'no session', 'user:', session?.user?.id);
      const loadDataWillRun = willRunLoadData(session);
      lastDispatchedSessionRef.current = session;
      isAuthLoadingRef.current = false;
      setSession(session);
      setIsAuthLoading(false);
      // Only "session just established" events should enter the loading state.
      // TOKEN_REFRESHED / USER_UPDATED fire in the background (roughly hourly,
      // and on tab refocus) and must stay silent — otherwise they'd flash the
      // full-screen loading wheel over a working app, since loadData re-runs on
      // every session change. Mirror the codebase's existing convention that
      // treats INITIAL_SESSION and SIGNED_IN as the authoritative signals
      // (see src/app/auth/callback/page.tsx).
      // loadDataWillRun is the #75 item 1 guard: a repeated INITIAL_SESSION /
      // SIGNED_IN carrying the same session object raises nothing, because
      // nothing would come along to lower it.
      if (session && (_event === "INITIAL_SESSION" || _event === "SIGNED_IN") && loadDataWillRun) {
        setIsDataLoading(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function completeOnboarding() {
    setIsOnboarded(true);
  }

  /* ── Data States ────────────────────────────── */
  const [bills, setBills] = useState<Bill[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [paydays, setPaydays] = useState<Payday[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [billSplits, setBillSplits] = useState<BillSplit[]>([]);
  const [paySchedules, setPaySchedules] = useState<PaySchedule[]>([]);
  const [payHistory, setPayHistory] = useState<PayHistory[]>([]);
  const [householdContributions, setHouseholdContributions] = useState<HouseholdContribution[]>([]);
  const [contributionRules, setContributionRules] = useState<ContributionRule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  /* Slice 13 (#99): this device's push subscription health, centralized here
   * (review finding 2) so every NotificationCenter mount point (AppShell's
   * floating bell AND settings-client.tsx) reads/updates the same copy —
   * re-enabling push from one instance's PushStatusDialog is immediately
   * reflected in the other. */
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);

  /* ── Sync/Load Data ─────────────────────────── */
  // Only load data AFTER auth has resolved and we have a valid session.
  // This prevents a race condition where RLS returns empty results
  // (because no auth token is set yet), causing the app to show onboarding.
  async function loadData(options?: { assumeEmptyPreviousState?: boolean }) {
    // Overlap guard (#71 follow-up): skip this call outright if a previous
    // one is still in flight, rather than letting them stack. Released in the
    // top-level finally below no matter which branch this call exits through.
    if (loadDataInFlightRef.current) {
      console.log('loadData skipped - a previous call is still in flight');
      return;
    }
    loadDataInFlightRef.current = true;
    try {
      await loadDataInner(options);
    } finally {
      loadDataInFlightRef.current = false;
    }
  }

  async function loadDataInner(options?: { assumeEmptyPreviousState?: boolean }) {
    if (isAuthLoading || !session?.user) {
      console.log('loadData skipped - isAuthLoading:', isAuthLoading, 'session:', session ? 'exists' : 'null');
      // No session means signed out (or never signed in): forget any household
      // we had resolved, so the next user through doesn't inherit this one's
      // "already onboarded" knowledge.
      if (!isAuthLoading) resolvedHouseholdUserIdRef.current = null;
      setIsOnboarded(false);
      // Only clear the loading flag once auth has actually resolved. This effect
      // also fires on mount while isAuthLoading is still true; clearing it there
      // would immediately undo the pessimistic initialiser above, leaving the
      // gate dependent purely on setIsAuthLoading(false) and setIsDataLoading(true)
      // happening to land in the same React batch — the exact fragility behind
      // #49 and #73. Once auth HAS resolved with no session, clearing is
      // required so the /login redirect isn't stuck behind the loading wheel.
      if (!isAuthLoading) setIsDataLoading(false);
      return;
    }
    if (!dbHouseholdId && !isOnboarded) {
      setIsDataLoading(true);
    }
    console.log('loadData running with authenticated session, user:', session.user.id);
    // Do we already know THIS user has a household? Declared outside the try so
    // the catch below can see it too. Deliberately consults only the user-keyed
    // ref: isOnboarded and dbHouseholdId are not user-scoped and are never reset,
    // so after a same-tab user switch they still hold the *previous* user's
    // values — exactly the evidence this guard must not trust (see
    // resolvedHouseholdUserIdRef's declaration). A same-user warm reload still
    // matches its own id, so a transient error there keeps every loaded value in
    // place, which is the whole point of the guard.
    const knownOnboarded = resolvedHouseholdUserIdRef.current === session.user.id;
    // Set when a step below fails specifically because the device couldn't
    // reach the network at all (see isNetworkFailure). That is inconclusive
    // evidence, not a "no household" answer, so it must not resolve
    // isDataLoading to false — doing so would open AppShell's Onboarding gate
    // (`session && !isOnboarded && !isDataLoading`) over a still-signed-in
    // user with no real answer yet, stranding them until they force-close the
    // app or toggle connectivity. Left true, the loading state simply
    // persists — a graceful "still figuring this out" rather than a broken
    // onboarding screen — and the 'online' listener on the effect below
    // retries loadData the moment connectivity actually returns.
    let networkFailure = false;
    try {
      // STEP 1: Get ONLY the household_id from membership (no nested join!)
      const { data: membership, error: memError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      // A failed query and a successful-but-empty one are NOT the same answer,
      // and collapsing them is the root of #75 item 3. "The request errored"
      // says nothing about whether a household exists; clearing isOnboarded on
      // it hands an already-onboarded user to AppShell's Onboarding gate, where
      // creating or joining produces a second household_members row. That row is
      // fatal: this very query is .maybeSingle(), which errors (PGRST116) on
      // more than one row, so every later load fails and the user's real bills,
      // funds and paydays are stranded under the original household_id with no
      // way back. So on an error for a user we already know is onboarded, leave
      // every piece of loaded state exactly as it is and just stop loading.
      if (memError) {
        console.error('[loadData] Household membership query failed:', memError);
        if (isNetworkFailure(memError)) {
          networkFailure = true;
        } else {
          if (!knownOnboarded) setIsOnboarded(false);
          setIsDataLoading(false);
        }
        return;
      }

      if (!membership?.household_id) {
        // Successful query, no membership row — the one result that genuinely
        // means "this user has no household yet".
        console.log('[loadData] No active household membership or user has no household yet');
        resolvedHouseholdUserIdRef.current = null;
        setIsOnboarded(false);
        setIsDataLoading(false);
        return;
      }

      // STEP 2: Fetch household details by ID (separate request, no recursion)
      const { data: household, error: hhError } = await supabase
        .from('households')
        .select('id, name, join_code, code_expires_at, is_joint_fund, timezone')
        .eq('id', membership.household_id)
        .single();

      // Same reasoning as STEP 1. Note there is no "successful but empty" case
      // to separate out here: .single() reports zero rows AS an error, and we
      // already hold a household_id that a membership row points at, so a
      // failure here is a fetch problem rather than evidence of no household.
      if (hhError || !household) {
        console.error('[loadData] Failed to fetch household details:', hhError);
        if (isNetworkFailure(hhError)) {
          networkFailure = true;
        } else {
          if (!knownOnboarded) setIsOnboarded(false);
          setIsDataLoading(false);
        }
        return;
      }

      console.log('loadData - found household:', household.id, household.name, household.is_joint_fund);
      resolvedHouseholdUserIdRef.current = session.user.id;
      setDbHouseholdId(household.id);
      setHouseholdNameState(household.name);
      setIsJointFund(!!household.is_joint_fund);
      setJoinCode(household.join_code || null);
      setCodeExpiresAt(household.code_expires_at || null);
      setHouseholdTimezone(household.timezone || "Australia/Sydney");
      setIsOnboarded(true);

      // Fetch related data
      await loadHouseholdRelatedData(household.id, session.user.id, options);
    } catch (err) {
      console.error('[loadData] Failed loading all household data:', err);
      if (isNetworkFailure(err)) {
        // The request never reached the server at all — see the
        // `networkFailure` declaration above for why this must not resolve
        // to "not onboarded".
        networkFailure = true;
      } else {
        // A thrown request (network drop mid-load) is the same class of evidence
        // as the query errors handled above: it does not mean "no household".
        // Re-read the ref rather than reusing knownOnboarded — STEP 2 may have set
        // it since, and if the throw came from the related-data fetches we have
        // already positively identified the household.
        if (resolvedHouseholdUserIdRef.current !== session.user.id && !knownOnboarded) setIsOnboarded(false);
      }
    } finally {
      if (!networkFailure) {
        setIsDataLoading(false);
      }
      // Always resync, in both directions: flips true on a fresh network
      // failure, and — just as importantly — flips back false the moment a
      // retry actually succeeds (or resolves to a definitive answer another
      // way), so the recovery effect below stops polling/listening the
      // instant it's no longer needed instead of running forever.
      setIsNetworkStuck(networkFailure);
      // This call's outcome is the direct answer to "did that retry attempt
      // fail?" — feed it to the escape-hatch generation counter regardless of
      // which trigger (manual button, poll, online, focus, visibilitychange)
      // caused this call. noteRetryAttempt is itself a no-op unless the Retry
      // button is currently showing, so this can't disturb the very first 30s
      // countdown (see its declaration above).
      if (networkFailure) {
        noteRetryAttempt();
      }
    }
  }

  useEffect(() => {
    loadData();
  }, [isAuthLoading, session]);

  // Recovery for the "stuck on network failure" state above (#71 follow-up,
  // PR #121 iPhone re-report). The original fix relied solely on a single
  // 'online' listener, on the assumption that the browser firing 'online' the
  // moment connectivity returns is a reliable signal. It isn't: iOS Safari in
  // standalone PWA mode has a documented history of never firing 'online' (or
  // firing it late/unreliably) after airplane mode is toggled off, which is
  // exactly Anthony's report — reconnecting produced no change and the app
  // kept trying to load forever. A single edge-triggered event is also
  // fragile in a second way even where it DOES fire reliably: it is a
  // one-shot signal with no fallback if it's ever missed (backgrounding at
  // the wrong instant, etc.), so this stuck state needs a recovery path that
  // does not depend on catching one specific event at one specific moment.
  //
  // So this effect layers three independent, redundant triggers instead of
  // trusting any single one:
  //   - a 5s poll, so recovery happens on its own even if every event below
  //     is missed entirely (the actual iOS failure mode observed);
  //   - 'online', for browsers where it does fire reliably (cheap to keep);
  //   - 'visibilitychange'/'focus', which catch the common real-world path of
  //     backgrounding the app, fixing connectivity (or just walking back
  //     indoors), then re-foregrounding it — independent of whether the OS
  //     ever dispatched an 'online' event for that transition at all.
  // Each retry re-runs the actual loadData function from the latest render
  // (not a frozen one), so there's no stale-closure risk of the #74 shape:
  // this effect's cleanup runs and the effect re-fires on every isNetworkStuck
  // transition, so a stale set of listeners/interval closing over a stale
  // loadData is never left running.
  useEffect(() => {
    if (!isNetworkStuck) return;

    const poll = window.setInterval(() => {
      loadData();
    }, 5000);
    function retryNow() {
      loadData();
    }
    function handleVisibility() {
      if (document.visibilityState === 'visible') retryNow();
    }
    window.addEventListener('online', retryNow);
    window.addEventListener('focus', retryNow);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(poll);
      window.removeEventListener('online', retryNow);
      window.removeEventListener('focus', retryNow);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNetworkStuck]);

  // Escape hatch: even with the layered recovery above, an infinite spinner
  // with zero feedback and no available action is a bad end state on its own
  // if the device genuinely stays offline for a while (or the retries above
  // are, for some other reason, not getting through). If loadData has been
  // continuously stuck for 30s straight — or 30s have passed since the most
  // recent failed retry attempt once the button has already been shown once
  // (retryGeneration; see noteRetryAttempt above) — stop asking the user to
  // just trust it's working and surface a manual retry affordance (AppShell)
  // instead.
  //
  // Deliberately does NOT hide the button in this effect's own cleanup: a
  // retryGeneration bump reruns this effect (to re-arm a fresh timer) without
  // the button needing to disappear and reappear in between — once shown, it
  // stays shown, uninterrupted, through any number of further failed
  // automatic retries. Hiding is instead the responsibility of (a)
  // retryLoadData below, for the deliberate "user asked us to try again"
  // moment, and (b) the resolve-reset effect further down, once the episode
  // is actually over.
  useEffect(() => {
    if (!isNetworkStuck) return;
    const timer = window.setTimeout(() => {
      setShowOfflineRetry(true);
      hasShownOfflineRetryRef.current = true;
    }, 30000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isNetworkStuck, retryGeneration]);

  // Resolves the escape hatch the moment the stuck episode actually ends —
  // i.e. isNetworkStuck flips back to false, whether from a successful auto
  // retry or a successful manual one. Kept as its own effect, separate from
  // the timer effect above, specifically so it does NOT also fire on a bare
  // retryGeneration bump (which must leave an already-visible button alone).
  useEffect(() => {
    if (isNetworkStuck) return;
    setShowOfflineRetry(false);
    hasShownOfflineRetryRef.current = false;
  }, [isNetworkStuck]);

  function retryLoadData() {
    // Hide immediately as visible feedback that the tap registered. If this
    // attempt also fails, loadDataInner's finally calls noteRetryAttempt(),
    // which — because hasShownOfflineRetryRef is still true from this episode
    // — bumps retryGeneration and re-arms a fresh 30s timer above, so the
    // button reliably reappears instead of staying hidden forever.
    setShowOfflineRetry(false);
    loadData();
  }

  /* ── Load a Known Household's Related Data ──── */
  // Everything loadData does AFTER it has positively identified the household:
  // the related-data fan-out, by household id. Extracted so the createHousehold
  // and joinHousehold adopt paths — which already hold a verified household id —
  // can hydrate directly instead of calling loadData(). Routing them through
  // loadData meant re-running its membership .maybeSingle(), and if that failed
  // again (the very failure that put the user on "create or join" in the first
  // place) it returned early with the resolution ref now set: isOnboarded stayed
  // true, isDataLoading cleared, and the dashboard rendered with bills, funds,
  // paydays and members all still [] — which computes to exactly 85 in
  // calculateHealthScore and displays "Fully Funded" (#73's false positive).
  //
  // Takes userId explicitly rather than reading session: the adopt paths get a
  // fresher user from supabase.auth.getSession() than this render's closure.
  //
  // `assumeEmptyPreviousState` exists for callers that already know the
  // slate is genuinely empty right now (joinHousehold's household-switch
  // branch: it calls setBills([])/setFunds([])/etc. immediately before
  // calling loadData(), then this runs). Those setX([]) calls don't
  // retroactively update the `bills`/`funds`/`paydays`/`members`/`billSplits`
  // variables this closure reads — plain closed-over state, not refs — so
  // without this flag resolveWarmReloadRace would see the OLD household's
  // real non-empty data as "previous state" while checking the NEW
  // household's fetch, and needlessly fire a confirm re-fetch for every slice
  // that's honestly empty in the new household. Passing `true` here routes
  // those slices through resolveWarmReloadRace's own empty-previous-state
  // fast path (same one a first-ever load takes) instead of a synthetic ref.
  async function loadHouseholdRelatedData(
    householdId: string,
    userId: string,
    options?: { assumeEmptyPreviousState?: boolean }
  ) {
    const assumeEmptyPreviousState = options?.assumeEmptyPreviousState ?? false;

    const [billsRes, fundsRes, paydaysRes, membersRes, billSplitsRes] = await Promise.all([
      supabase.from("bills").select("*").eq("household_id", householdId),
      supabase.from("funds").select("*").eq("household_id", householdId),
      supabase.from("paydays").select("*").eq("household_id", householdId),
      supabase.from("household_members").select("*").eq("household_id", householdId),
      supabase.from("bill_splits").select("*"),
    ]);

    // Each slice below is reconciled against a warm-reload race (#74): an
    // empty-but-error-free result is only trusted outright when the slice's
    // previous in-memory state was already empty. Otherwise it's confirmed
    // with one re-fetch before it's allowed to overwrite real data. See
    // resolveWarmReloadRace above for the full rationale. bills/funds/paydays/
    // members are independent of one another, so they're reconciled
    // concurrently rather than compounding re-fetch latency sequentially.
    const [resolvedBills, resolvedFunds, resolvedPaydays, resolvedMembers] = await Promise.all([
      resolveWarmReloadRace(assumeEmptyPreviousState ? [] : bills, billsRes, async () =>
        await supabase.from("bills").select("*").eq("household_id", householdId)
      ),
      resolveWarmReloadRace(assumeEmptyPreviousState ? [] : funds, fundsRes, async () =>
        await supabase.from("funds").select("*").eq("household_id", householdId)
      ),
      resolveWarmReloadRace(assumeEmptyPreviousState ? [] : paydays, paydaysRes, async () =>
        await supabase.from("paydays").select("*").eq("household_id", householdId)
      ),
      resolveWarmReloadRace(assumeEmptyPreviousState ? [] : members, membersRes, async () =>
        await supabase.from("household_members").select("*").eq("household_id", householdId)
      ),
    ]);

    if (resolvedBills) {
      setBills(resolvedBills.map(mapBillFromDb));
    }
    if (resolvedFunds) {
      setFunds(resolvedFunds.map(mapFundFromDb));
    }
    if (resolvedPaydays) {
      setPaydays(resolvedPaydays.map(mapPaydayFromDb));
    }
    if (resolvedMembers) {
      setMembers(resolvedMembers.map(mapMemberFromDb));
    }

    // Bill splits are fetched unscoped (no household_id column on the table)
    // and filtered locally to this household's bills. The filter must run
    // against `resolvedBills` (post race-check), not the raw `billsRes.data`
    // — otherwise a bills race that got corrected above would still filter
    // every split out here. The reconciliation itself is then applied to the
    // *filtered* array, since that's the actual value being committed to
    // `billSplits` state and compared against its previous value. This one
    // stays sequential (can't join the Promise.all above) because it depends
    // on `resolvedBills`.
    const billIds = new Set((resolvedBills || []).map((b) => b.id));
    const filterSplitsToHousehold = (splits: typeof billSplitsRes.data) =>
      splits ? splits.filter((split: any) => billIds.has(split.bill_id)) : null;

    const resolvedBillSplits = await resolveWarmReloadRace(
      assumeEmptyPreviousState ? [] : billSplits,
      { data: filterSplitsToHousehold(billSplitsRes.data), error: billSplitsRes.error },
      async () => {
        const refetched = await supabase.from("bill_splits").select("*");
        return { data: filterSplitsToHousehold(refetched.data), error: refetched.error };
      }
    );
    if (resolvedBillSplits) {
      setBillSplits(resolvedBillSplits);
    }

    // Fetch payday schedule, history, contributions, and rules
    await Promise.all([
      fetchPayData(householdId),
      fetchHouseholdContributions(householdId),
      fetchContributionRules(householdId),
      fetchNotifications(userId, householdId)
    ]);
  }

  /* ── Fetch Pay Data ─────────────────────────── */
  async function fetchPayData(householdId?: string) {
    const hId = householdId || dbHouseholdId;
    if (!hId) return;

    try {
      const [schedulesRes, historyRes] = await Promise.all([
        supabase.from("pay_schedules").select("*").eq("household_id", hId),
        supabase.from("pay_history").select("*").eq("household_id", hId).order("pay_date", { ascending: false }),
      ]);

      if (schedulesRes.data) {
        setPaySchedules(schedulesRes.data);
      }
      if (historyRes.data) {
        setPayHistory(historyRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch payday schedules and history:", err);
    }
  }

  /* ── Helper to Ensure Household Exists ──────── */
  async function ensureHousehold(): Promise<string> {
    if (dbHouseholdId) return dbHouseholdId;

    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const userIdToUse = currentSession?.user?.id;
    console.log('ensureHousehold - currentSession:', currentSession ? 'exists' : 'null', 'userIdToUse:', userIdToUse);

    // #75 item 3, door 3 — the same trap door as createHousehold and
    // joinHousehold, reached from ~14 write paths (addBill, addFund, …). This
    // used to select the first household RLS would hand back and, if that came
    // back empty *or errored* (the error was discarded), insert a fresh
    // household AND a household_members row with no membership check at all.
    // Same fatal outcome: a second household_members row makes loadData's STEP 1
    // .maybeSingle() error (PGRST116) on every later load, so the user's real
    // bills, funds and paydays are stranded under the original household_id with
    // no way back. The early return on dbHouseholdId above is not a membership
    // check — dbHouseholdId is never reset to null anywhere, so it is stale after
    // a same-tab user switch, and it is null on precisely the path that matters
    // (a wrongly-shown "create or join" screen after a failed membership query).
    if (userIdToUse) {
      const { data: existingMembership, error: membershipError } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", userIdToUse)
        // .limit(1) before .maybeSingle() on purpose: a plain .maybeSingle()
        // errors on multiple rows, which would blind this guard in exactly the
        // already-duplicated state where it matters most. The .order() makes the
        // pick deterministic (oldest membership = the original household) rather
        // than whichever row Postgres happens to return first.
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        // Can't tell whether they already belong somewhere. Refuse rather than
        // insert on a guess: every caller surfaces a thrown error and the write
        // can be retried, whereas a duplicate membership row cannot be undone
        // from the client.
        console.error('[ensureHousehold] Existing membership check failed:', JSON.stringify(membershipError, null, 2));
        throw new Error("Couldn't check your existing household. Please check your connection and try again.");
      }

      if (existingMembership?.household_id) {
        const { data: existing, error: existingError } = await supabase
          .from("households")
          .select("id, name")
          .eq("id", existingMembership.household_id)
          .maybeSingle();

        if (existingError || !existing) {
          // A membership row we could read implies a household we can read
          // (households RLS is membership-based), so this is a fetch problem.
          // Don't fall through to the insert — that is the duplicate-row path.
          console.error('[ensureHousehold] Failed to load the household this user already belongs to:', JSON.stringify(existingError, null, 2));
          throw new Error("Couldn't open your existing household. Please check your connection and try again.");
        }

        resolvedHouseholdUserIdRef.current = userIdToUse;
        setDbHouseholdId(existing.id);
        setHouseholdNameState(existing.name);
        return existing.id;
      }
    }

    const nameToUse = householdName.trim() || "My Household";

    const insertData: any = { name: nameToUse, is_joint_fund: false };
    if (userIdToUse) {
      insertData.user_id = userIdToUse;
    }

    const { data: newHousehold, error } = await supabase
      .from("households")
      .insert(insertData)
      .select()
      .single();

    if (error || !newHousehold) {
      throw new Error(
        "Failed to resolve household: " + (error?.message || "Unknown error")
      );
    }

    setDbHouseholdId(newHousehold.id);
    setHouseholdNameState(newHousehold.name);

    if (currentSession?.user) {
      const userName = currentSession.user.user_metadata?.full_name || currentSession.user.email?.split("@")[0] || "Owner";
      const userEmail = currentSession.user.email || "";
      const { data: newMember, error: memberError } = await supabase
        .from("household_members")
        .insert({
          household_id: newHousehold.id,
          user_id: currentSession.user.id,
          name: userName,
          email: userEmail,
          role: "owner"
        })
        .select()
        .single();

      if (memberError) {
        // #91: this insert failing does not mean the household is unusable, but
        // it does mean no household_members row exists for this user yet, so we
        // must not mark the household resolved/trusted (resolvedHouseholdUserIdRef)
        // or seed members from a row that was never created. Throw so callers see
        // the failure and the write can be retried, matching the membership-check
        // and household-fetch failures above in this same function.
        console.error('[ensureHousehold] Member insert failed:', JSON.stringify(memberError, null, 2));
        throw new Error(`Member insert failed: ${memberError.message}`);
      }

      if (newMember) {
        setMembers([mapMemberFromDb(newMember)]);
      }
      // A membership row now exists for this user, so a later query failure must
      // not clear isOnboarded and route them to "create or join" (#75 item 3).
      resolvedHouseholdUserIdRef.current = currentSession.user.id;
    }

    return newHousehold.id;
  }

  /* ── Household Creation and Name Actions ────── */
  async function createHousehold(name: string): Promise<string> {
    try {
      const { data: { session: currentSession }, error: authError } = await supabase.auth.getSession();
      const activeUser = currentSession?.user || session?.user;

      if (authError) {
        console.error('[createHousehold] Auth session error:', JSON.stringify(authError, null, 2));
      }

      if (!activeUser?.id) {
        throw new Error('Pre-insert validation failed: No active user session found.');
      }

      if (!name || name.trim() === '') {
        throw new Error('Pre-insert validation failed: Household name is required.');
      }

      // #75 item 3, door 1: never create a second household for a user who
      // already belongs to one. Reaching this function does not prove the user
      // is new — a transient membership-query failure in loadData can route an
      // already-onboarded user to AppShell's Onboarding gate, and Onboarding
      // step 1 calls this function directly (src/components/Onboarding.tsx:54).
      // Nothing else stops it: households INSERT is WITH CHECK true,
      // household_members INSERT is WITH CHECK true, and there is no unique
      // index on household_members.user_id (a constraint was deliberately
      // deferred pending the multi-household question — see #75). The second
      // membership row is what actually breaks the account: loadData's STEP 1 is
      // .maybeSingle(), which errors on more than one row, so every subsequent
      // load fails forever and the real data is unreachable. The sibling helper
      // ensureHousehold() runs its own equivalent membership check (:1072-1115),
      // but Onboarding bypasses that function entirely by calling here.
      //
      // Deliberately does NOT seed from dbHouseholdId. That state is never reset
      // to null anywhere, and AppProvider never unmounts across sign-out/sign-in,
      // so after a same-tab user switch it still holds the PREVIOUS user's
      // household id. Seeding from it skipped this query altogether and sent user
      // B down the adopt branch below pointed at user A's household — which B has
      // no membership for, so the households lookup returns nothing, B is bounced
      // back to Onboarding step 1, and because the function still returned an id
      // no error is shown. Every retry repeats it and B can never onboard. Always
      // ask the database about activeUser.id instead.
      const { data: existingMembership, error: membershipError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', activeUser.id)
        // .limit(1) before .maybeSingle() on purpose: a plain .maybeSingle()
        // errors on multiple rows, which would blind this guard in exactly the
        // already-duplicated state where it matters most. The .order() makes the
        // pick deterministic (oldest membership = the original household) rather
        // than whichever row Postgres happens to return first.
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        // Can't tell whether they already have a household. Refuse rather than
        // guess: Onboarding surfaces this message and the user can retry, which
        // is recoverable. Creating on a guess is not.
        console.error('[createHousehold] Existing membership check failed:', JSON.stringify(membershipError, null, 2));
        throw new Error("Couldn't check your existing household. Please check your connection and try again.");
      }

      const existingHouseholdId = existingMembership?.household_id ?? null;

      if (existingHouseholdId) {
        console.warn('[createHousehold] User already belongs to household', existingHouseholdId, '— adopting it instead of creating a second one');
        // Adopt, don't no-op: Onboarding awaits this and advances its wizard on
        // success, and setIsOnboarded(true) drops AppShell's Onboarding gate
        // altogether, so the user lands in their real household rather than
        // sitting on a screen that silently did nothing.
        const { data: existing, error: existingError } = await supabase
          .from('households')
          .select('id, name, join_code, code_expires_at, is_joint_fund, timezone')
          .eq('id', existingHouseholdId)
          .maybeSingle();

        if (existingError || !existing) {
          // Same reasoning as ensureHousehold's equivalent branch: a membership
          // row we could read implies a household we can read (households RLS is
          // membership-based), so this is a fetch problem, not evidence the
          // household is gone. Discarding this error let the adopt path "succeed"
          // with no name, no join code and no data while still returning an id —
          // Onboarding advanced, AppShell bounced the user straight back to step
          // 1, and nothing explained why. Throw instead: Onboarding catches and
          // renders the message (src/components/Onboarding.tsx:55-58) so the user
          // can retry.
          console.error('[createHousehold] Failed to load the household this user already belongs to:', JSON.stringify(existingError, null, 2));
          throw new Error("Couldn't open your existing household. Please check your connection and try again.");
        }

        // Hydrate bills/funds/paydays/members for the adopted household — unlike
        // the create path below, this household is not empty. Call the helper
        // directly rather than loadData(): loadData would re-run its membership
        // .maybeSingle(), and if that failed again — the very failure that put
        // the user on "create or join" in the first place — it returns early and
        // we would be back to rendering the dashboard on empty arrays.
        //
        // Hydrate BEFORE committing any household state, and reveal the dashboard
        // only once the data is actually in state. Two reasons, both #73-shaped:
        //
        // 1. The 85 canary. setIsOnboarded(true) followed by an await flushes
        //    that batch mid-flight, and at that moment isDataLoading is false —
        //    loadData cleared it (:916/:944) when it routed this user to
        //    Onboarding, and nothing raises it again (loadData's own raise at
        //    :882 is skipped once dbHouseholdId and isOnboarded are both truthy).
        //    AppShell's gates therefore opened over bills/funds/paydays/members
        //    still [], which computes to exactly 85 in calculateHealthScore
        //    (src/lib/utils.ts:88) and clears the >= 80 "Fully Funded" threshold
        //    (src/components/HealthScoreCard.tsx:34). Committing after the await
        //    removes the window outright instead of covering it with a wheel.
        //
        // 2. loadHouseholdRelatedData has no try/catch and its Promise.all
        //    propagates, so hydration CAN throw. Committing first made that
        //    failure permanent: onboarded, empty arrays, and nothing re-runs
        //    loadData (session and isAuthLoading are unchanged). Committing after
        //    does NOT make a failed hydration side-effect-free — the helper's
        //    first Promise.all (:991) can resolve and commit bills, funds,
        //    paydays, members and billSplits before the second (:1022) rejects.
        //    What it does guarantee is that none of the HOUSEHOLD state is
        //    committed: dbHouseholdId, resolvedHouseholdUserIdRef and isOnboarded
        //    are all untouched. Those three are what gate everything, so
        //    Onboarding is still mounted (isOnboarded never flipped) and its
        //    catch renders the message (src/components/Onboarding.tsx:55-58) on a
        //    live component, and the retry re-runs the membership check from a
        //    clean slate. Leaving dbHouseholdId and the ref set after a failed
        //    hydration would also hand joinHousehold's door-2 guard a "trusted
        //    household" with no members list behind it.
        //
        // The old "set the ref before hydrating so loadData's guards keep the
        // user here" reasoning is obsolete: hydration no longer goes through
        // loadData, and loadHouseholdRelatedData touches neither the ref nor
        // isOnboarded.
        //
        // Deliberately does NOT raise isDataLoading first. AppShell's Onboarding
        // gate is `!isOnboarded && !isDataLoading`
        // (src/components/AppShell.tsx:172), so raising it would unmount
        // Onboarding mid-hydration and destroy the very error state the failure
        // path needs to display. isOnboarded staying false already holds the
        // dashboard back. The finally still clears the flag unconditionally so
        // neither path can leave the gate raised (#73's permanent wheel).
        try {
          await loadHouseholdRelatedData(existing.id, activeUser.id);

          resolvedHouseholdUserIdRef.current = activeUser.id;
          setDbHouseholdId(existing.id);
          setHouseholdNameState(existing.name);
          setIsJointFund(!!existing.is_joint_fund);
          setJoinCode(existing.join_code || null);
          setCodeExpiresAt(existing.code_expires_at || null);
          setHouseholdTimezone(existing.timezone || "Australia/Sydney");
          setIsOnboarded(true);
        } finally {
          setIsDataLoading(false);
        }
        return existing.id;
      }

      // Verify the session user actually exists in auth.users via standard auth service
      const { data: { user: dbUser }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError || !dbUser) {
        throw new Error('Session invalid: User no longer exists. Please sign out and sign up again.');
      }

      const joinCodeValue = Math.random().toString(36).substring(2, 8).toUpperCase();

      console.log('[createHousehold] Attempting insert:', { name, joinCode: joinCodeValue, userId: activeUser.id });

      const { data: household, error: hhError } = await supabase
        .from('households')
        .insert({
          name,
          user_id: activeUser.id,
          join_code: joinCodeValue,
          code_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      // LOG THE ACTUAL ERROR OBJECT
      if (hhError) {
        console.error('[createHousehold] SUPABASE ERROR:', JSON.stringify(hhError, null, 2));
        throw new Error(`Household insert failed: ${hhError.message} | Code: ${hhError.code}`);
      }

      if (!household) {
        console.error('[createHousehold] No data returned despite no error');
        throw new Error('Household created but no data returned');
      }

      console.log('[createHousehold] Household created successfully:', household.id);

      // Insert member...
      const userName = activeUser.user_metadata?.full_name || activeUser.email?.split('@')[0] || 'Owner';
      const userEmail = activeUser.email || "";
      const { data: newMember, error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: activeUser.id,
          name: userName,
          email: userEmail,
          role: 'owner',
          invitation_status: 'accepted'
        })
        .select()
        .single();

      if (memberError) {
        console.error('[createHousehold] MEMBER INSERT ERROR:', JSON.stringify(memberError, null, 2));
        throw new Error(`Member insert failed: ${memberError.message}`);
      }

      // Update state
      setDbHouseholdId(household.id);
      setHouseholdNameState(household.name);
      setIsJointFund(false);
      setJoinCode(household.join_code || null);
      setCodeExpiresAt(household.code_expires_at || null);
      setHouseholdTimezone(household.timezone || "Australia/Sydney");
      if (newMember) {
        setMembers([mapMemberFromDb(newMember)]);
      }
      // This user now demonstrably has a household, so a later query failure
      // must not clear isOnboarded and send them back here (#75 item 3).
      resolvedHouseholdUserIdRef.current = activeUser.id;
      // Do NOT setIsOnboarded(true) here — that would unmount the onboarding
      // wizard mid-flow (#78). completeOnboarding() on step 5's "Enter App" is
      // the only thing that should flip this.

      return household.id;

    } catch (err) {
      console.error('[createHousehold] CAUGHT EXCEPTION:', err);
      throw err;
    }
  }

  async function setHouseholdName(name: string) {
    setHouseholdNameState(name);
    try {
      if (dbHouseholdId) {
        const { error } = await supabase
          .from("households")
          .update({ name })
          .eq("id", dbHouseholdId);
        if (error) throw error;
      }
    } catch (err) {
      console.error("Failed to update household name:", err);
    }
  }

  /* ── Bills Actions ──────────────────────────── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function addBill(billData: any, splitsData: any[] = []) {
    try {
      const hId = await ensureHousehold();

      // Step 1: Save Bill
      const dbBillData = {
        household_id: hId,
        name: billData.name,
        amount: billData.amount,
        due_date: parseDateForDb(billData.dueDate || billData.due_date),
        invoice_date: billData.invoiceDate || billData.invoice_date ? parseDateForDb(billData.invoiceDate || billData.invoice_date) : null,
        payment_type: billData.paymentType || billData.payment_type || "manual",
        assignee_id: billData.assignee || billData.assignee_id || null,
        category: billData.category || "Uncategorized",
        status: billData.status || "Due Soon",
        frequency: billData.frequency || "Monthly",
        notes: billData.notes || null,
        is_recurring: true,
        is_paused: false,
      };

      const { data: newBill, error: billError } = await supabase
        .from("bills")
        .insert(dbBillData)
        .select()
        .single();

      if (billError || !newBill) {
        console.error("Error inserting bill:", billError);
        throw billError || new Error("Failed to insert bill record.");
      }

      let newSplits = [];
      // Step 2: Save Splits
      if (splitsData && splitsData.length > 0) {
        const newBillId = newBill.id;
        const dbSplitsData = splitsData.map((split) => ({
          household_id: hId,
          bill_id: newBillId,
          member_id: split.member_id,
          amount: split.amount,
          status: split.status || "Pending",
          is_assignee: split.is_assignee || false,
        }));

        const { data, error: splitsError } = await supabase
          .from("bill_splits")
          .insert(dbSplitsData)
          .select();

        if (splitsError) {
          console.error("Error inserting bill splits (bill saved successfully):", splitsError);
          throw splitsError;
        }
        if (data) {
          newSplits = data;
        }
      }

      // Step 3: Update Local State
      setBills((prev) => [...prev, mapBillFromDb(newBill)]);

      if (newSplits && newSplits.length > 0) {
        setBillSplits((prev) => [...prev, ...newSplits]);
      }
    } catch (err) {
      console.error("Failed to add bill:", err);
      throw err;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function updateBill(billId: string | number, billData: any, splitsData: any[]) {
    console.log('updateBill - Start - billId:', billId);
    console.log('updateBill - billData input:', billData);
    console.log('updateBill - splitsData input:', splitsData);

    try {
      const hId = await ensureHousehold();
      console.log('updateBill - householdId resolved:', hId);

      if (!billId) {
        throw new Error("updateBill - Error: billId is undefined or empty!");
      }

      // Step 1: Update Bill in Supabase
      const dbBillData = {
        name: billData.name,
        amount: billData.amount,
        due_date: parseDateForDb(billData.dueDate || billData.due_date),
        invoice_date: billData.invoiceDate || billData.invoice_date ? parseDateForDb(billData.invoiceDate || billData.invoice_date) : null,
        payment_type: billData.paymentType || billData.payment_type || "manual",
        assignee_id: billData.assignee || billData.assignee_id || null,
        category: billData.category || "Uncategorized",
        status: billData.status || "Due Soon",
        frequency: billData.frequency || "Monthly",
        notes: billData.notes || null,
        is_recurring: true,
        is_paused: billData.is_paused || false,
      };

      console.log('updateBill - dbBillData payload:', dbBillData);

      const { data: updatedBill, error: billError } = await supabase
        .from("bills")
        .update(dbBillData)
        .eq("id", billId)
        .select()
        .single();

      if (billError || !updatedBill) {
        console.error("updateBill - Error updating bills row:", billError);
        throw billError || new Error("Failed to update bill record.");
      } else {
        console.log('updateBill - successfully updated bills table row:', updatedBill);
      }

      // Step 2: Delete Existing Splits
      console.log('updateBill - deleting splits for bill_id:', billId);
      const { error: deleteError } = await supabase
        .from("bill_splits")
        .delete()
        .eq("bill_id", billId);

      if (deleteError) {
        console.error("updateBill - Error deleting existing bill splits:", deleteError);
        throw deleteError;
      } else {
        console.log('updateBill - splits deleted successfully');
      }

      let newSplits = [];
      // Step 3: Insert New Splits
      if (splitsData && splitsData.length > 0) {
        const dbSplitsData = splitsData.map((split) => {
          if (!split.member_id || split.amount === undefined || isNaN(Number(split.amount))) {
            console.warn("updateBill - invalid split data detected:", split);
          }
          return {
            household_id: hId,
            bill_id: billId,
            member_id: split.member_id,
            amount: Number(split.amount) || 0,
            status: split.status || "Pending",
            is_assignee: split.is_assignee || false,
          };
        });

        console.log('updateBill - inserting new splits:', dbSplitsData);

        const { data, error: splitsError } = await supabase
          .from("bill_splits")
          .insert(dbSplitsData)
          .select();

        if (splitsError) {
          console.error("updateBill - Error inserting new bill splits:", splitsError);
          throw splitsError;
        } else {
          console.log('updateBill - splits inserted successfully:', data);
        }

        if (data) {
          newSplits = data;
        }
      }

      // Step 4: Update Local State
      if (updatedBill) {
        setBills((prev) =>
          prev.map((b) => (b.id === billId ? mapBillFromDb(updatedBill) : b))
        );
      }
      setBillSplits((prev) => {
        const filtered = prev.filter((s) => String(s.bill_id) !== String(billId));
        return [...filtered, ...newSplits];
      });

    } catch (err) {
      console.error("updateBill - Fatal error during execution:", err);
      throw err;
    }
  }

  async function resetBillContributions() {
    try {
      const hId = await ensureHousehold();
      console.warn("resetBillContributions - Deleting all bill splits due to payment mode change for household:", hId);
      const { error } = await supabase
        .from("bill_splits")
        .delete()
        .eq("household_id", hId);

      if (error) {
        console.error("Error deleting bill splits during reset:", error);
        return;
      }

      setBillSplits([]);
    } catch (err) {
      console.error("Failed to reset bill contributions:", err);
    }
  }

  async function updateHouseholdPaymentMode(jointFundVal: boolean) {
    try {
      const hId = await ensureHousehold();

      // Mode is changing if household is already onboarded and the value is different
      const oldMode = isJointFund;
      const isModeChanging = isOnboarded && oldMode !== jointFundVal;

      console.log(`updateHouseholdPaymentMode - updating to: ${jointFundVal}. isModeChanging: ${isModeChanging}`);

      const { error } = await supabase
        .from("households")
        .update({ is_joint_fund: jointFundVal })
        .eq("id", hId);

      if (error) {
        console.error("Error updating household payment mode:", error);
        throw error;
      }

      setIsJointFund(jointFundVal);

      if (isModeChanging) {
        await resetBillContributions();
      }
    } catch (err) {
      console.error("Failed to update payment mode:", err);
      throw err;
    }
  }

  // #37. Owner-only, matching the ownership-gated pattern used for
  // leave/delete-household — but unlike delete-household there is no
  // server-side edge function backing this: households UPDATE RLS
  // ("Users can update their household", fix_households_rls_recursion.sql)
  // is deliberately member-wide, not owner-only, so this client-side check
  // is the actual enforcement (same as the member-management "canManage"
  // gating in settings-client.tsx — RLS there is member-wide too). The
  // Settings UI also hides the control from non-owners so this should only
  // ever be reached by an owner in normal use.
  async function updateHouseholdTimezone(timezone: string) {
    try {
      const hId = await ensureHousehold();

      const currentMember = members.find(
        (m) => String(m.email).toLowerCase() === String(session?.user?.email).toLowerCase()
      );
      if (currentMember?.role !== "owner") {
        throw new Error("Only the household owner can change the timezone.");
      }

      // Must be a valid IANA zone string Intl.DateTimeFormat accepts, same
      // validation todayInZone() relies on to not silently fall back.
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
      } catch {
        throw new Error("That doesn't look like a valid timezone.");
      }

      const { error } = await supabase
        .from("households")
        .update({ timezone })
        .eq("id", hId);

      if (error) {
        console.error("Error updating household timezone:", error);
        throw error;
      }

      setHouseholdTimezone(timezone);
    } catch (err) {
      console.error("Failed to update household timezone:", err);
      throw err;
    }
  }

  async function togglePaid(id: string | number) {
    try {
      const { data, error } = await supabase
        .from("bills")
        .update({ status: "Paid" })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating bill status:", error);
        return;
      }

      if (data) {
        setBills((prev) =>
          prev.map((bill) => (bill.id === id ? mapBillFromDb(data) : bill))
        );
      }
    } catch (err) {
      console.error("Failed to toggle paid:", err);
    }
  }

  async function markAsPaid(bill: Bill) {
    try {
      let nextDueDateStr = bill.due_date || bill.dueDate;

      if (bill.is_recurring) {
        const d = new Date(nextDueDateStr + "T00:00:00");
        if (!isNaN(d.getTime())) {
          const freq = (bill.frequency || "monthly").toLowerCase();
          if (freq === "weekly") d.setDate(d.getDate() + 7);
          else if (freq === "fortnightly" || freq === "fortnightly") d.setDate(d.getDate() + 14);
          else if (freq === "yearly") d.setFullYear(d.getFullYear() + 1);
          else d.setMonth(d.getMonth() + 1); // default monthly

          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          nextDueDateStr = `${year}-${month}-${day}`;
        }
      }

      const { data, error } = await supabase
        .from("bills")
        .update({ status: "Paid", due_date: nextDueDateStr })
        .eq("id", bill.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating bill as paid:", error);
        return;
      }

      if (data) {
        setBills((prev) =>
          prev.map((b) => (b.id === bill.id ? mapBillFromDb(data) : b))
        );

        // Delete any notifications related to this bill
        const { error: deleteNotifError } = await supabase
          .from("notifications")
          .delete()
          .eq("related_entity_id", bill.id.toString());
        if (!deleteNotifError) {
          setNotifications((prev) => prev.filter((n) => n.related_entity_id !== bill.id.toString()));
        }
      }
    } catch (err) {
      console.error("Failed to mark as paid:", err);
    }
  }

  async function markAsUnpaid(bill: Bill) {
    try {
      let prevDueDateStr = bill.due_date || bill.dueDate;

      if (bill.is_recurring) {
        const d = new Date(prevDueDateStr + "T00:00:00");
        if (!isNaN(d.getTime())) {
          const freq = (bill.frequency || "monthly").toLowerCase();
          if (freq === "weekly") d.setDate(d.getDate() - 7);
          else if (freq === "fortnightly" || freq === "fortnightly") d.setDate(d.getDate() - 14);
          else if (freq === "yearly") d.setFullYear(d.getFullYear() - 1);
          else d.setMonth(d.getMonth() - 1); // default monthly

          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          prevDueDateStr = `${year}-${month}-${day}`;
        }
      }

      const { data, error } = await supabase
        .from("bills")
        .update({ status: "Due Soon", due_date: prevDueDateStr })
        .eq("id", bill.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating bill as unpaid:", error);
        return;
      }

      if (data) {
        setBills((prev) =>
          prev.map((b) => (b.id === bill.id ? mapBillFromDb(data) : b))
        );
      }
    } catch (err) {
      console.error("Failed to mark as unpaid:", err);
    }
  }

  async function togglePauseBill(id: string | number, isPaused: boolean) {
    try {
      const { data, error } = await supabase
        .from("bills")
        .update({ is_paused: isPaused })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error toggling pause status:", error);
        return;
      }

      if (data) {
        setBills((prev) =>
          prev.map((bill) => (bill.id === id ? mapBillFromDb(data) : bill))
        );
      }
    } catch (err) {
      console.error("Failed to toggle pause status:", err);
    }
  }

  async function deleteBill(id: string | number) {
    try {
      // Delete associated splits first to be safe
      const { error: splitErr } = await supabase.from("bill_splits").delete().eq("bill_id", id);
      if (splitErr) {
        console.error("Error deleting bill splits:", splitErr);
        throw splitErr;
      }

      const { data, error } = await supabase
        .from("bills")
        .delete()
        .eq("id", id)
        .select();

      if (error) {
        console.error("Error deleting bill:", error);
        throw error;
      }
      if (!data || data.length === 0) {
        throw new Error(
          "The bill couldn't be deleted — it may have already been removed, or you may not have permission to delete it."
        );
      }

      setBills((prev) => prev.filter((b) => b.id !== id));
      setBillSplits((prev) => prev.filter((s) => s.bill_id !== id));
    } catch (err) {
      console.error("Failed to delete bill:", err);
      throw err;
    }
  }

  /* ── Funds Actions ──────────────────────────── */
  async function addFund(fund: Omit<Fund, "bgLight" | "barColor" | "accentText" | "icon">) {
    try {
      const hId = await ensureHousehold();

      const dbFundData = {
        household_id: hId,
        name: fund.name,
        category: fund.category,
        current_amount: fund.currentAmount,
        target_amount: fund.targetAmount,
        deadline: fund.deadline ? parseDateForDb(fund.deadline) : null,
        status: fund.status || 'not_started',
        member_id: fund.member_id || null,
        owner_id: session?.user?.id || null,
      };

      const { data, error } = await supabase
        .from("funds")
        .insert(dbFundData)
        .select()
        .single();

      if (error) {
        console.error("Error inserting fund:", error);
        return;
      }

      if (data) {
        setFunds((prev) => [...prev, mapFundFromDb(data)]);
      }
    } catch (err) {
      console.error("Failed to add fund:", err);
    }
  }

  async function updateGoal(id: string | number, goalData: any) {
    try {
      const dbFundData = {
        name: goalData.name,
        category: goalData.category || "Custom",
        current_amount: goalData.currentAmount,
        target_amount: goalData.targetAmount,
        deadline: goalData.deadline ? parseDateForDb(goalData.deadline) : null,
        status: goalData.status || 'not_started',
        member_id: goalData.member_id || null,
        owner_id: session?.user?.id || null,
      };

      const { data, error } = await supabase
        .from("funds")
        .update(dbFundData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating goal/fund:", error);
        return;
      }

      if (data) {
        setFunds((prev) =>
          prev.map((f) => (f.id === id ? mapFundFromDb(data) : f))
        );
      }
    } catch (err) {
      console.error("Failed to update goal:", err);
    }
  }

  async function deleteGoal(id: string | number) {
    try {
      // .select() makes Postgres return the rows it actually deleted. If the
      // delete is silently blocked (RLS/no match), data comes back empty with
      // no error — we must treat that as a failure, not a success.
      const { data, error } = await supabase
        .from("funds")
        .delete()
        .eq("id", id)
        .select();
      if (error) {
        console.error("Error deleting goal/fund:", error);
        throw error;
      }
      if (!data || data.length === 0) {
        throw new Error(
          "The goal couldn't be deleted — it may have already been removed, or you may not have permission to delete it."
        );
      }
      setFunds((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Failed to delete goal:", err);
      throw err;
    }
  }

  const updateFund = updateGoal;
  const deleteFund = deleteGoal;

  async function addToGoal(id: string | number, amount: number) {
    try {
      const fund = funds.find((f) => f.id === id);
      if (!fund) return;

      const newCurrentAmount = fund.currentAmount + amount;

      const { data, error } = await supabase
        .from("funds")
        .update({ current_amount: newCurrentAmount })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error adding to goal:", error);
        return;
      }

      if (data) {
        setFunds((prev) =>
          prev.map((f) => (f.id === id ? mapFundFromDb(data) : f))
        );
      }
    } catch (err) {
      console.error("Failed to add money to goal:", err);
    }
  }

  async function addMoneyToFund(id: string | number, amount: number) {
    try {
      const fund = funds.find((f) => f.id === id);
      if (!fund) return;

      const newCurrentAmount = Math.min(fund.currentAmount + amount, fund.targetAmount);

      const { data, error } = await supabase
        .from("funds")
        .update({ current_amount: newCurrentAmount })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating fund amount:", error);
        return;
      }

      if (data) {
        setFunds((prev) =>
          prev.map((f) => (f.id === id ? mapFundFromDb(data) : f))
        );
      }
    } catch (err) {
      console.error("Failed to add money to fund:", err);
    }
  }

  /* ── Paydays Actions ────────────────────────── */
  async function addPayday(payday: Payday) {
    try {
      const hId = await ensureHousehold();

      const dbPaydayData = {
        household_id: hId,
        date: payday.date,
        amount: payday.amount,
      };

      const { data, error } = await supabase
        .from("paydays")
        .insert(dbPaydayData)
        .select()
        .single();

      if (error) {
        console.error("Error inserting payday:", error);
        throw error;
      }

      if (data) {
        setPaydays((prev) => [...prev, mapPaydayFromDb(data)]);
      }
    } catch (err) {
      console.error("Failed to add payday:", err);
      throw err;
    }
  }

  async function deletePayday(id: string | number) {
    try {
      const { error } = await supabase.from("paydays").delete().eq("id", id);

      if (error) {
        console.error("Error deleting payday:", error);
        return;
      }

      setPaydays((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete payday:", err);
    }
  }

  /* ── Members Actions ────────────────────────── */
  async function addMember(member: Member) {
    try {
      const hId = await ensureHousehold();

      const dbMemberData = {
        household_id: hId,
        name: member.name,
        email: member.email,
        role: member.role || "member",
      };

      const { data, error } = await supabase
        .from("household_members")
        .insert(dbMemberData)
        .select()
        .single();

      if (error) {
        console.error("Error inserting member:", error);
        return;
      }

      if (data) {
        setMembers((prev) => [...prev, mapMemberFromDb(data)]);
      }
    } catch (err) {
      console.error("Failed to add member:", err);
    }
  }

  async function regenerateJoinCode() {
    if (!dbHouseholdId) return;
    try {
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let newCode = "";
      for (let i = 0; i < 6; i++) {
        newCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from("households")
        .update({
          join_code: newCode,
          code_expires_at: expiresAt,
        })
        .eq("id", dbHouseholdId);

      if (error) throw error;

      setJoinCode(newCode);
      setCodeExpiresAt(expiresAt);
    } catch (err) {
      console.error("Failed to regenerate join code:", err);
      throw err;
    }
  }

  async function joinHousehold(code: string) {
    const sanitizedCode = code.trim().toUpperCase();

    // #75 item 3, door 2. Deliberately runs BEFORE the backupState/try block
    // below: that block's catch rolls every household field back to the cached
    // values, which would immediately undo the recovery this guard performs.
    //
    // The question this gate has to answer is "do we already hold a household id
    // we can TRUST for THIS user?" — and the presence of dbHouseholdId cannot
    // answer it. That value is never reset to null anywhere and AppProvider never
    // unmounts across sign-out/sign-in (both are client-side router navigations,
    // no page reload), so after a same-tab user switch it still holds the
    // PREVIOUS user's household. Gating on mere presence therefore skipped this
    // entire check for exactly the user who needed it: A uses the app, B signs in
    // on the same tab (reachable — /login works while already signed in, and the
    // installed auth-js emits only SIGNED_IN for signInWithPassword, so there
    // need be no null-session tick at all), B's loadData membership query errors
    // transiently and drops B on "create or join" with dbHouseholdId still A's.
    // B joins, the edge function adds a SECOND household_members row (it only
    // checks membership within the household being joined, and there is no unique
    // index on household_members.user_id), and step 2's cleanup below searches
    // backupState.members — A's list — for B's email, finds nothing and cleans up
    // nothing. B's real membership survives alongside the new one and loadData's
    // .maybeSingle() then errors PGRST116 on every load, forever. Worse still, if
    // B's email IS in A's member list with role "owner", step 2 cascade-deletes
    // A's entire household.
    //
    // resolvedHouseholdUserIdRef is the user-scoped answer: it holds the id of
    // the user we positively resolved a household for this session, is only ever
    // set alongside setDbHouseholdId, and is cleared on sign-out (loadData's
    // no-session branch). When it matches the current user, dbHouseholdId is
    // genuinely theirs and joining another household is the supported switch —
    // the guard steps aside and step 2 below removes the old household/membership
    // as designed. When it does not match (stale from a previous user, or never
    // resolved) we ask the database instead of guessing.
    //
    // Two paths this must not disturb: a genuinely new user has no membership row
    // at all, so the query below finds nothing and the join proceeds untouched;
    // and an invited user's unclaimed record has user_id = null, so it cannot
    // match .eq('user_id', …) — the claim/recovery logic further down still runs.
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const userId = currentSession?.user?.id || session?.user?.id;
    const holdsTrustedHousehold =
      !!dbHouseholdId && !!userId && resolvedHouseholdUserIdRef.current === userId;

    if (userId && !holdsTrustedHousehold) {
      // .limit(1) before .maybeSingle() so an already-duplicated user (who
      // would make a bare .maybeSingle() error) is still detected. The
      // .order() makes the pick deterministic (oldest membership = the
      // original household) rather than whichever row Postgres happens to
      // return first.
      const { data: existingMembership, error: membershipError } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        // Can't tell whether they already belong somewhere. Refuse; retrying is
        // recoverable, a duplicate membership row is not.
        console.error("[joinHousehold] Existing membership check failed:", membershipError);
        throw new Error("Couldn't check your existing household. Please check your connection and try again.");
      }

      if (existingMembership?.household_id) {
        console.warn("[joinHousehold] User already belongs to household", existingMembership.household_id, "— refusing join and restoring it");
        const { data: existing, error: existingError } = await supabase
          .from("households")
          .select("id, name, join_code, code_expires_at, is_joint_fund, timezone")
          .eq("id", existingMembership.household_id)
          .maybeSingle();

        if (existingError || !existing) {
          // Same reasoning as ensureHousehold (:1102-1108) and createHousehold
          // (:1241-1253): a membership row we could read implies a household we
          // can read (households RLS is membership-based), so a failure here is
          // a fetch problem, not evidence the household is gone.
          //
          // Throws BEFORE touching any state, and that ordering is the whole
          // point. Two throws now leave this branch, but they are mutually
          // exclusive — this one exits before the refusal throw below is
          // reachable — and they must not be swapped. "We've reopened it"
          // would be a lie here: nothing was reopened, and the honest advice is
          // to retry. The refusal message is only true once the household has
          // actually been hydrated.
          //
          // Committing dbHouseholdId and isOnboarded(true) regardless of the
          // lookup is what made the old code incoherent: it dropped AppShell's
          // Onboarding gate for a household with no name, no join code and no
          // related data — the empty-arrays dashboard that computes to exactly
          // 85 in calculateHealthScore and reads "Fully Funded" (#73). Leaving
          // state untouched keeps the user where they were, which is also why
          // this message is actually visible on the Onboarding path, unlike the
          // refusal below.
          //
          // The join is still refused: throwing exits joinHousehold before the
          // edge function is invoked, so no second household_members row can be
          // created. Wording matches the sibling helpers and, like theirs,
          // avoids JoinHouseholdSheet's "already a member" / "expired" /
          // "Invalid" substring matches (src/components/JoinHouseholdSheet.tsx:76-84).
          console.error("[joinHousehold] Failed to load the household this user already belongs to:", JSON.stringify(existingError, null, 2));
          throw new Error("Couldn't open your existing household. Please check your connection and try again.");
        }

        // Hydrate first, commit second — the same ordering and for the same two
        // reasons as createHousehold's adopt branch (:1255-1311). Briefly: a
        // setIsOnboarded(true) before the await flushes mid-flight while
        // isDataLoading is false, opening AppShell's gates over empty arrays,
        // which computes to exactly 85 in calculateHealthScore
        // (src/lib/utils.ts:88) and reads "Fully Funded"
        // (src/components/HealthScoreCard.tsx:34); and loadHouseholdRelatedData
        // can throw, which committing-first made permanent. Committing after does
        // NOT make a failed hydration side-effect-free — the helper's first
        // Promise.all (:991) can commit bills/funds/paydays/members/billSplits
        // before the second (:1022) rejects. What it guarantees is that none of
        // the household state is committed: dbHouseholdId,
        // resolvedHouseholdUserIdRef and isOnboarded are untouched. Those three
        // gate everything, so JoinHouseholdSheet is still mounted and its catch
        // (src/components/JoinHouseholdSheet.tsx:73-84) shows the user what
        // happened, and the retry starts from a clean slate.
        //
        // Leaving dbHouseholdId and the ref uncommitted on a failed hydration
        // also matters here specifically: setting them would make the door-2 gate
        // above read holdsTrustedHousehold === true on the retry, skipping the
        // membership check and treating the next attempt as a supported switch —
        // straight back into the duplicate-row hazard this guard exists to stop.
        //
        // Deliberately does NOT raise isDataLoading first: AppShell's Onboarding
        // gate is `!isOnboarded && !isDataLoading`
        // (src/components/AppShell.tsx:172), so raising it would unmount the
        // sheet mid-hydration and swallow the error. The finally still clears the
        // flag on both paths so neither can leave the gate raised.
        try {
          await loadHouseholdRelatedData(existing.id, userId);

          resolvedHouseholdUserIdRef.current = userId;
          setDbHouseholdId(existing.id);
          setHouseholdNameState(existing.name);
          setIsJointFund(!!existing.is_joint_fund);
          setJoinCode(existing.join_code || null);
          setCodeExpiresAt(existing.code_expires_at || null);
          setHouseholdTimezone(existing.timezone || "Australia/Sydney");
          setIsOnboarded(true);
        } finally {
          setIsDataLoading(false);
        }

        // Throw rather than report success: we did not join the household they
        // asked for. Reached only once the household above loaded AND hydrated
        // cleanly, so "we've reopened it" is literally true — both failure cases
        // threw their own, different messages earlier. The wording deliberately
        // avoids JoinHouseholdSheet's "already a member" / "expired" / "Invalid"
        // substring matches (src/components/JoinHouseholdSheet.tsx:76-84), which
        // would otherwise rewrite it into a wrong explanation. That sheet only
        // actually displays it on the Settings path; on the Onboarding path the
        // setIsOnboarded(true) above unmounts the sheet before the throw lands,
        // so the message is swallowed. Harmless — the user ends up in their real
        // household either way — but don't rely on it being seen there.
        throw new Error("You already belong to a household, so we've reopened it instead of joining a new one.");
      }
    }

    // Cache backup state for potential rollback on failure
    const backupState = {
      dbHouseholdId,
      householdName,
      isJointFund,
      householdTimezone,
      bills,
      funds,
      paydays,
      members,
      billSplits,
      paySchedules,
      payHistory,
      householdContributions,
      contributionRules,
    };

    try {
      // 1. Attempt to invoke the join-household Supabase Edge Function
      const { data, error } = await supabase.functions.invoke("join-household", {
        body: { code: sanitizedCode },
      });

      let newHouseholdId = "";

      if (!error && data && !data.error) {
        newHouseholdId = data.householdId;
      } else {
        if (data?.error) {
          throw new Error(data.error);
        }
        if (error) {
          let parsedError: Error | null = null;
          if ((error as any).context) {
            try {
              const contextClone = (error as any).context.clone();
              const errText = await contextClone.text();
              console.warn("[joinHousehold] Error context text response:", errText);
              const errBody = JSON.parse(errText);
              if (errBody && errBody.error) {
                parsedError = new Error(errBody.error);
              }
            } catch (jsonErr) {
              console.error("[joinHousehold] Failed to parse edge function error response:", jsonErr);
            }
          }

          // Recovery Logic: If already a member, check if we can claim the user_id = null record
          if (parsedError && parsedError.message === "You are already a member of this household") {
            console.log("[joinHousehold] Already member error detected, attempting client-side claim of user_id = null record...");
            const { data: household } = await supabase
              .from("households")
              .select("id")
              .eq("join_code", sanitizedCode)
              .maybeSingle();

            console.log("[joinHousehold] Recovery household query result:", household);

            if (household) {
              const { data: { session: currentSession } } = await supabase.auth.getSession();
              const userObj = currentSession?.user || session?.user;
              console.log("[joinHousehold] Recovery userObj query result:", userObj?.id, userObj?.email);
              if (userObj) {
                const userEmail = userObj.email || "";
                const { data: existingMember } = await supabase
                  .from("household_members")
                  .select("id, user_id, email, household_id")
                  .eq("household_id", household.id)
                  .ilike("email", userEmail)
                  .maybeSingle();

                console.log("[joinHousehold] Recovery existingMember query result:", existingMember);

                if (existingMember && !existingMember.user_id) {
                  console.log("[joinHousehold] Found unclaimed member record, claiming it now...");
                  const { error: updateErr } = await supabase
                    .from("household_members")
                    .update({
                      user_id: userObj.id,
                      invitation_status: "accepted"
                    })
                    .eq("id", existingMember.id);

                  if (!updateErr) {
                    console.log("[joinHousehold] Successfully claimed membership record on client!");
                    newHouseholdId = household.id;
                    parsedError = null; // Clear error to skip throwing
                  } else {
                    console.error("[joinHousehold] Failed to claim membership on client:", updateErr);
                  }
                } else if (existingMember && existingMember.user_id) {
                  console.log("[joinHousehold] Member record already has user_id:", existingMember.user_id);
                } else {
                  console.log("[joinHousehold] No matching member record found for email:", userEmail);
                }
              }
            }
          }

          if (parsedError) {
            throw parsedError;
          }
          if (!newHouseholdId) {
            throw error;
          }
        }

        // Only run fallback client-side join logic if we haven't already resolved newHouseholdId!
        if (!newHouseholdId) {
          // Fallback: Perform validation queries directly on client database
          console.warn("Edge function invocation failed or not deployed, running fallback database logic");

          // 1.1 Fetch household by join code
          const { data: household, error: hError } = await supabase
            .from("households")
            .select("id, code_expires_at")
            .eq("join_code", sanitizedCode)
            .single();

          if (hError || !household) {
            throw new Error("Invalid join code.");
          }

          // 1.2 Verify join code expiry
          if (new Date(household.code_expires_at) < new Date()) {
            throw new Error("Join code has expired.");
          }

          // 1.3 Authenticate current user email
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          const userObj = currentSession?.user || session?.user;
          if (!userObj) {
            throw new Error("Unauthorized.");
          }

          const userName = userObj.user_metadata?.full_name || userObj.email?.split("@")[0] || "Member";
          const userEmail = userObj.email || "";

          // 1.4 Ensure user is not already a member
          const { data: existingMember } = await supabase
            .from("household_members")
            .select("id, user_id")
            .eq("household_id", household.id)
            .eq("email", userEmail)
            .maybeSingle();

          if (existingMember) {
            if (existingMember.user_id === userObj.id) {
              throw new Error("You are already a member of this household.");
            } else if (!existingMember.user_id) {
              // Claim the existing member record
              const { error: updateErr } = await supabase
                .from("household_members")
                .update({
                  user_id: userObj.id,
                  invitation_status: "accepted"
                })
                .eq("id", existingMember.id);

              if (updateErr) {
                throw new Error("Failed to claim household membership: " + updateErr.message);
              }
            } else {
              throw new Error("This email is already registered as a member with another user.");
            }
          } else {
            // 1.5 Insert new member row
            const { error: insertErr } = await supabase
              .from("household_members")
              .insert({
                household_id: household.id,
                user_id: userObj.id,
                name: userName,
                email: userEmail,
                role: "member",
                invitation_status: "accepted"
              });

            if (insertErr) {
              throw new Error("Failed to join household: " + insertErr.message);
            }
          }
          newHouseholdId = household.id;
        }
      }

      // 2. WIPE CURRENT USER DATA IN DATABASE FIRST
      if (backupState.dbHouseholdId && backupState.dbHouseholdId !== newHouseholdId) {
        const oldHouseholdId = backupState.dbHouseholdId;

        // #89: this decision used to be made straight off `backupState.members`
        // — a cached React state snapshot, not a fresh DB read. If that
        // snapshot was itself the victim of the warm-reload RLS race (#74:
        // successful query, zero rows, because the auth token hadn't
        // attached yet), `currentUserInOldHousehold` resolved to `undefined`
        // regardless of DB truth, and cascade-delete/own-membership-removal
        // was silently skipped — orphaning the old household or membership
        // row. Do a live read and run it through the same
        // resolveWarmReloadRace reconciliation loadData uses, with
        // `backupState.members` as the "previous state" side of that check,
        // before trusting an empty/absent result.
        const fetchOldHouseholdMembers = async (): Promise<SupabaseArrayResult<Member>> => {
          const res = await supabase
            .from("household_members")
            .select("*")
            .eq("household_id", oldHouseholdId);
          return { data: res.data ? res.data.map(mapMemberFromDb) : null, error: res.error };
        };

        const freshOldHouseholdMembersRes = await fetchOldHouseholdMembers();
        const confirmedOldHouseholdMembers = await resolveWarmReloadRace(
          backupState.members,
          freshOldHouseholdMembersRes,
          fetchOldHouseholdMembers
        );

        if (confirmedOldHouseholdMembers) {
          const currentUserInOldHousehold = confirmedOldHouseholdMembers.find(
            (m) => String(m.email).toLowerCase() === String(session?.user?.email).toLowerCase()
          );

          if (currentUserInOldHousehold && currentUserInOldHousehold.role === "owner") {
            // Cascade delete current household from database
            const { error: deleteError } = await supabase
              .from("households")
              .delete()
              .eq("id", oldHouseholdId);
            if (deleteError) {
              console.error("Error deleting old household:", deleteError);
            }
          } else if (currentUserInOldHousehold) {
            // Delete old membership record
            await supabase
              .from("household_members")
              .delete()
              .eq("id", currentUserInOldHousehold.id);
          }
        } else {
          // Inconclusive (query failed, or the empty result couldn't be
          // confirmed one way or the other) — don't guess. Skip the
          // cascade-delete/membership-removal rather than risk deleting a
          // household or row that's still genuinely in use.
          console.error(
            "Could not confirm old household membership state before join cleanup; skipping cascade-delete/membership removal for household",
            oldHouseholdId
          );
        }
      }

      // 3. WIPE local state variables
      setBills([]);
      setFunds([]);
      setPaydays([]);
      setMembers([]);
      setBillSplits([]);
      setPaySchedules([]);
      setPayHistory([]);
      setHouseholdContributions([]);
      setContributionRules([]);

      // 4. Fetch fresh data for the new household
      setDbHouseholdId(newHouseholdId);
      // assumeEmptyPreviousState: true — the setX([]) calls just above wiped
      // this local state, but loadData/loadHouseholdRelatedData read
      // bills/funds/paydays/members/billSplits as plain closed-over
      // variables from this render, which those setters don't retroactively
      // update. Without this flag, resolveWarmReloadRace would see the OLD
      // household's real, non-empty data as "previous state" while checking
      // the NEW household's fetch, and needlessly re-fetch every slice
      // that's honestly empty in the new household.
      await loadData({ assumeEmptyPreviousState: true });
    } catch (err: any) {
      console.error("Failed to join household, rolling back state:", err);
      // Rollback React states to cached values
      setDbHouseholdId(backupState.dbHouseholdId);
      setHouseholdNameState(backupState.householdName);
      setIsJointFund(backupState.isJointFund);
      setHouseholdTimezone(backupState.householdTimezone);
      setBills(backupState.bills);
      setFunds(backupState.funds);
      setPaydays(backupState.paydays);
      setMembers(backupState.members);
      setBillSplits(backupState.billSplits);
      setPaySchedules(backupState.paySchedules);
      setPayHistory(backupState.payHistory);
      setHouseholdContributions(backupState.householdContributions);
      setContributionRules(backupState.contributionRules);
      throw err;
    }
  }

  // #85. Non-owner self-leave: delete only the caller's own household_members
  // row, scoped to the current household (user_id + household_id). Existing
  // RLS ("hm_delete_own" / "Users can delete household_members") already
  // permits user_id = auth.uid() deletes, and every dependent row
  // (pay_schedules, pay_history, contribution_rules, household_contributions,
  // bill_splits — all keyed off member_id) cascades off that row automatically,
  // so no extra cleanup queries are needed here. The household_id filter
  // matters because of the documented #75 edge case in joinHousehold() below
  // (~lines 2106-2262): a user can transiently end up with a second
  // household_members row in a different household, and an unscoped
  // user_id-only delete would wipe every membership the user has instead of
  // just the one they're leaving. Reads but does not mutate dbHouseholdId:
  // the caller (Settings) does a full-page redirect on success, which reloads
  // AppContext from scratch and lets AppShell's existing onboarding gate take
  // it from there.
  async function leaveHousehold() {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const userId = currentSession?.user?.id || session?.user?.id;

      if (!userId) {
        throw new Error("You need to be signed in to leave a household.");
      }

      if (!dbHouseholdId) {
        throw new Error("No household to leave.");
      }

      const { error } = await supabase
        .from("household_members")
        .delete()
        .eq("user_id", userId)
        .eq("household_id", dbHouseholdId);

      if (error) {
        console.error("[leaveHousehold] Failed to delete membership row:", error);
        throw new Error("Failed to leave household: " + error.message);
      }
    } catch (err) {
      console.error("Failed to leave household:", err);
      throw err;
    }
  }

  // #85. Owner leaves: full household teardown. Routed through the
  // delete-household edge function (service-role key, same pattern as
  // join-household) because notifications.household_id has no cascade and its
  // RLS only allows deleting your own rows — a plain client-side household
  // delete would foreign-key-violate the moment any member has a notification
  // row. The function re-verifies ownership server-side via
  // is_household_owner(); it does not trust the client. On success every other
  // table cascades off households.id automatically.
  async function deleteHousehold() {
    if (!dbHouseholdId) {
      throw new Error("No household to delete.");
    }

    try {
      const { data, error } = await supabase.functions.invoke("delete-household", {
        body: { householdId: dbHouseholdId },
      });

      if (!error && data && !data.error) {
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (error) {
        let parsedError: Error | null = null;
        if ((error as any).context) {
          try {
            const contextClone = (error as any).context.clone();
            const errText = await contextClone.text();
            const errBody = JSON.parse(errText);
            if (errBody && errBody.error) {
              parsedError = new Error(errBody.error);
            }
          } catch (jsonErr) {
            console.error("[deleteHousehold] Failed to parse edge function error response:", jsonErr);
          }
        }
        throw parsedError || error;
      }

      throw new Error("Failed to delete household.");
    } catch (err) {
      console.error("Failed to delete household:", err);
      throw err;
    }
  }

  async function removeMember(id: string | number, reassignBillsTo?: string, reassignGoalsTo?: string) {
    try {
      // 1. Handle Bill Splits
      if (reassignBillsTo) {
        const { error: splitErr } = await supabase
          .from("bill_splits")
          .update({ member_id: reassignBillsTo })
          .eq("member_id", id);

        if (splitErr) {
          console.error("Failed to reassign bill splits:", splitErr);
          throw splitErr;
        }

        setBillSplits((prev) =>
          prev.map((s) => (String(s.member_id) === String(id) ? { ...s, member_id: reassignBillsTo } : s))
        );
      } else {
        const { error: splitErr } = await supabase
          .from("bill_splits")
          .delete()
          .eq("member_id", id);

        if (splitErr) {
          console.error("Failed to delete bill splits:", splitErr);
          throw splitErr;
        }

        setBillSplits((prev) => prev.filter((s) => String(s.member_id) !== String(id)));
      }

      // 2. Handle Goals (Funds)
      if (reassignGoalsTo) {
        const { error: goalErr } = await supabase
          .from("funds")
          .update({ member_id: reassignGoalsTo })
          .eq("member_id", id);

        if (goalErr) {
          console.error("Failed to reassign goals:", goalErr);
          throw goalErr;
        }

        setFunds((prev) =>
          prev.map((f) => (String(f.member_id) === String(id) ? { ...f, member_id: reassignGoalsTo } : f))
        );
      } else {
        const { error: goalErr } = await supabase
          .from("funds")
          .delete()
          .eq("member_id", id);

        if (goalErr) {
          console.error("Failed to delete goals:", goalErr);
          throw goalErr;
        }

        setFunds((prev) => prev.filter((f) => String(f.member_id) !== String(id)));
      }

      // 3. Delete Pay Schedules
      const { error: scheduleErr } = await supabase
        .from("pay_schedules")
        .delete()
        .eq("member_id", id);

      if (scheduleErr) {
        console.error("Failed to delete pay schedules:", scheduleErr);
        throw scheduleErr;
      }

      setPaySchedules((prev) => prev.filter((s) => String(s.member_id) !== String(id)));

      // 4. Delete Household Contributions
      const { error: contributionErr } = await supabase
        .from("household_contributions")
        .delete()
        .eq("member_id", id);

      if (contributionErr) {
        console.error("Failed to delete household contributions:", contributionErr);
      } else {
        setHouseholdContributions((prev) => prev.filter((c) => String(c.member_id) !== String(id)));
      }

      // 5. Delete Pay History
      const { error: historyErr } = await supabase
        .from("pay_history")
        .delete()
        .eq("member_id", id);

      if (historyErr) {
        console.error("Failed to delete pay history:", historyErr);
      } else {
        setPayHistory((prev) => prev.filter((h) => String(h.member_id) !== String(id)));
      }

      // 6. Delete member record
      const { error } = await supabase.from("household_members").delete().eq("id", id);

      if (error) {
        console.error("Error deleting member record:", error);
        throw error;
      }

      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Failed to remove member:", err);
      throw err;
    }
  }

  async function updateMember(id: string | number, data: Partial<Omit<Member, "id">>) {
    try {
      const { data: updated, error } = await supabase
        .from("household_members")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating member:", error);
        return;
      }

      if (updated) {
        setMembers((prev) =>
          prev.map((m) => (m.id === id ? mapMemberFromDb(updated) : m))
        );

        // Sync with Supabase Auth metadata if the current user is updating their own record
        const currentUserEmail = session?.user?.email;
        if (currentUserEmail && String(updated.email).toLowerCase() === String(currentUserEmail).toLowerCase() && data.name) {
          await supabase.auth.updateUser({
            data: { full_name: data.name }
          });
        }
      }
    } catch (err) {
      console.error("Failed to update member:", err);
    }
  }

  async function updateMemberAvatar(memberId: string | number, avatarUrl: string | null) {
    try {
      const { error } = await supabase
        .from("household_members")
        .update({ avatar_url: avatarUrl })
        .eq("id", memberId);

      if (error) {
        console.error("Error updating member avatar:", error);
        return;
      }

      setMembers((prev) =>
        prev.map((m) =>
          String(m.id) === String(memberId) ? { ...m, avatar_url: avatarUrl } : m
        )
      );
    } catch (err) {
      console.error("Failed to update member avatar:", err);
    }
  }

  /* ── Bill Splits Actions ────────────────────── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function addBillSplit(splitData: any) {
    try {
      const hId = await ensureHousehold();
      const dbSplitData = { household_id: hId, ...splitData };

      const { data, error } = await supabase
        .from("bill_splits")
        .insert(dbSplitData)
        .select()
        .single();

      if (error) {
        console.error("Error inserting bill split:", error);
        return;
      }

      if (data) {
        setBillSplits((prev) => [...prev, data]);
      }
    } catch (err) {
      console.error("Failed to add bill split:", err);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function updateBillSplit(id: string | number, splitData: any) {
    try {
      const { data, error } = await supabase
        .from("bill_splits")
        .update(splitData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating bill split:", error);
        return;
      }

      if (data) {
        setBillSplits((prev) =>
          prev.map((split) => (split.id === id ? data : split))
        );
      }
    } catch (err) {
      console.error("Failed to update bill split:", err);
    }
  }

  async function deleteBillSplit(id: string | number) {
    try {
      const { error } = await supabase.from("bill_splits").delete().eq("id", id);

      if (error) {
        console.error("Error deleting bill split:", error);
        return;
      }

      setBillSplits((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to delete bill split:", err);
    }
  }

  /* ── Payday Schedule & History Actions ───────── */
  async function addPaySchedule(data: Omit<PaySchedule, "id" | "household_id" | "created_at">) {
    try {
      const hId = await ensureHousehold();
      const insertData = {
        household_id: hId,
        member_id: data.member_id,
        amount: data.amount,
        frequency: data.frequency,
        is_fixed_amount: data.is_fixed_amount,
        next_pay_date: parseDateForDb(data.next_pay_date),
      };

      const { data: newSchedule, error } = await supabase
        .from("pay_schedules")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error inserting pay schedule:", error);
        throw error;
      }

      if (newSchedule) {
        setPaySchedules((prev) => [...prev, newSchedule]);
      }
    } catch (err) {
      console.error("Failed to add pay schedule:", err);
      throw err;
    }
  }

  async function updatePaySchedule(id: string, data: Omit<PaySchedule, "id" | "household_id" | "created_at">) {
    try {
      const updateData = {
        member_id: data.member_id,
        amount: data.amount,
        frequency: data.frequency,
        is_fixed_amount: data.is_fixed_amount,
        next_pay_date: parseDateForDb(data.next_pay_date),
      };

      const { data: updated, error } = await supabase
        .from("pay_schedules")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating pay schedule:", error);
        throw error;
      }

      if (updated) {
        setPaySchedules((prev) =>
          prev.map((s) => (s.id === id ? updated : s))
        );
      }
    } catch (err) {
      console.error("Failed to update pay schedule:", err);
      throw err;
    }
  }

  async function deletePaySchedule(id: string) {
    try {
      const { data, error } = await supabase
        .from("pay_schedules")
        .delete()
        .eq("id", id)
        .select();
      if (error) {
        console.error("Error deleting pay schedule:", error);
        throw error;
      }
      if (!data || data.length === 0) {
        throw new Error(
          "The payday schedule couldn't be deleted — it may have already been removed, or you may not have permission to delete it."
        );
      }
      setPaySchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to delete pay schedule:", err);
      throw err;
    }
  }

  async function logPay(
    payScheduleId: string,
    amount: number,
    date: string,
    notes: string | null,
    status: 'pending' | 'confirmed' = 'confirmed'
  ): Promise<PayHistory | null> {
    try {
      const hId = await ensureHousehold();

      const schedule = paySchedules.find((s) => s.id === payScheduleId);
      if (!schedule) {
        console.error("logPay - could not find pay schedule:", payScheduleId);
        return null;
      }

      const historyItem = {
        household_id: hId,
        member_id: schedule.member_id,
        pay_schedule_id: payScheduleId,
        amount,
        pay_date: parseDateForDb(date),
        notes,
        status,
      };

      const { data: newHistory, error: historyErr } = await supabase
        .from("pay_history")
        .insert(historyItem)
        .select()
        .single();

      if (historyErr) {
        console.error("logPay - failed to insert pay history:", historyErr);
        return null;
      }

      // Advance pay date by frequency
      const currentDate = new Date(schedule.next_pay_date + "T00:00:00");
      if (schedule.frequency === "weekly") {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (schedule.frequency === "fortnightly" || schedule.frequency === "fortnightly" as any) {
        currentDate.setDate(currentDate.getDate() + 14);
      } else if (schedule.frequency === "monthly") {
        currentDate.setMonth(currentDate.getMonth() + 1);
      } else {
        currentDate.setDate(currentDate.getDate() + 7); // Default fallback to avoid non-advanced date
      }

      const newNextPayDate = toLocalYmd(currentDate);

      const { data: updatedSchedule, error: scheduleErr } = await supabase
        .from("pay_schedules")
        .update({ next_pay_date: newNextPayDate })
        .eq("id", payScheduleId)
        .select()
        .single();

      if (scheduleErr) {
        console.error("logPay - failed to update next_pay_date:", scheduleErr);
      }

      if (newHistory) {
        setPayHistory((prev) => [newHistory, ...prev]);
      }
      if (updatedSchedule) {
        setPaySchedules((prev) =>
          prev.map((s) => (s.id === payScheduleId ? updatedSchedule : s))
        );
      }
      return newHistory;
    } catch (err) {
      console.error("Failed to log pay:", err);
      return null;
    }
  }

  async function confirmPay(historyId: string) {
    try {
      const { data, error } = await supabase
        .from("pay_history")
        .update({ status: "confirmed" })
        .eq("id", historyId)
        .select()
        .single();

      if (error) {
        console.error("confirmPay - failed to update pay history status:", error);
        return;
      }

      if (data) {
        setPayHistory((prev) =>
          prev.map((h) => (h.id === historyId ? data : h))
        );
      }
    } catch (err) {
      console.error("Failed to confirm pay:", err);
    }
  }

  async function confirmAndUpdatePay(historyId: string, newAmount: number, notes?: string | null) {
    try {
      const updateData: any = {
        amount: newAmount,
        status: "confirmed",
      };
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from("pay_history")
        .update(updateData)
        .eq("id", historyId)
        .select()
        .single();

      if (error) {
        console.error("confirmAndUpdatePay - failed to update pay history:", error);
        return;
      }

      if (data) {
        setPayHistory((prev) =>
          prev.map((h) => (h.id === historyId ? data : h))
        );
      }
    } catch (err) {
      console.error("Failed to confirm and update pay:", err);
    }
  }

  async function autoLogMissedPays() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const hId = await ensureHousehold();

      for (const schedule of paySchedules) {
        if (!schedule.next_pay_date) continue;

        const nextPayDateObj = new Date(schedule.next_pay_date + "T00:00:00");
        nextPayDateObj.setHours(0, 0, 0, 0);

        if (nextPayDateObj.getTime() >= today.getTime()) {
          continue; // Not missed
        }

        const missedRecords: any[] = [];
        let tempDate = new Date(nextPayDateObj);

        while (tempDate.getTime() < today.getTime()) {
          const payDateStr = toLocalYmd(tempDate);
          missedRecords.push({
            household_id: hId,
            member_id: schedule.member_id,
            pay_schedule_id: schedule.id,
            amount: schedule.is_fixed_amount ? (schedule.amount || 0) : 0,
            pay_date: payDateStr,
            notes: schedule.is_fixed_amount
              ? "Automatically logged missed pay"
              : "Automatically logged missed pay — amount needs review",
            status: "pending",
          });

          // Advance tempDate
          if (schedule.frequency === "weekly") {
            tempDate.setDate(tempDate.getDate() + 7);
          } else if (schedule.frequency === "fortnightly" || schedule.frequency === "fortnightly" as any) {
            tempDate.setDate(tempDate.getDate() + 14);
          } else if (schedule.frequency === "monthly") {
            tempDate.setMonth(tempDate.getMonth() + 1);
          } else {
            tempDate.setDate(tempDate.getDate() + 7); // Fallback to avoid infinite loop
          }
        }

        if (missedRecords.length > 0) {
          const { error: insertErr } = await supabase
            .from("pay_history")
            .insert(missedRecords);

          if (insertErr) {
            console.error(`Failed to insert missed pay history for schedule ${schedule.id}:`, insertErr);
            continue;
          }

          const nextValidDateStr = toLocalYmd(tempDate);
          const { error: updateErr } = await supabase
            .from("pay_schedules")
            .update({ next_pay_date: nextValidDateStr })
            .eq("id", schedule.id);

          if (updateErr) {
            console.error(`Failed to update next_pay_date for schedule ${schedule.id}:`, updateErr);
          }
        }
      }

      await fetchPayData(hId);
    } catch (err) {
      console.error("Failed to automatically log missed pays:", err);
    }
  }

  async function deletePayHistory(id: string) {
    try {
      const historyItem = payHistory.find((h) => h.id === id);
      if (!historyItem) {
        throw new Error("Pay history item not found");
      }

      const { error } = await supabase.from("pay_history").delete().eq("id", id);
      if (error) {
        console.error("Error deleting pay history:", error);
        throw error;
      }
      setPayHistory((prev) => prev.filter((h) => h.id !== id));

      // Rollback next pay date of the associated pay schedule if linked
      if (historyItem.pay_schedule_id) {
        const schedule = paySchedules.find((s) => s.id === historyItem.pay_schedule_id);
        if (schedule) {
          const prevPayDate = historyItem.pay_date;
          const { data: updatedSchedule, error: scheduleErr } = await supabase
            .from("pay_schedules")
            .update({ next_pay_date: prevPayDate })
            .eq("id", schedule.id)
            .select()
            .single();

          if (scheduleErr) {
            console.error("Failed to roll back pay schedule date:", scheduleErr);
          } else if (updatedSchedule) {
            setPaySchedules((prev) =>
              prev.map((s) => (s.id === schedule.id ? updatedSchedule : s))
            );
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete pay history:", err);
      throw err;
    }
  }

  function calculateAveragePay(memberId: string): number | null {
    const memberHistory = payHistory.filter(
      (h) => String(h.member_id) === String(memberId)
    );
    if (memberHistory.length < 3) return null;

    const sorted = [...memberHistory].sort((a, b) => new Date(b.pay_date).getTime() - new Date(a.pay_date).getTime());
    const last3 = sorted.slice(0, 3);
    const sum = last3.reduce((s, entry) => s + Number(entry.amount), 0);
    return sum / 3;
  }

  async function fetchHouseholdContributions(householdId?: string) {
    const hId = householdId || dbHouseholdId;
    if (!hId) return;

    try {
      const { data, error } = await supabase
        .from("household_contributions")
        .select("*")
        .eq("household_id", hId);

      if (error) {
        console.error("Error fetching household contributions:", error);
        return;
      }

      if (data) {
        setHouseholdContributions(data);
      }
    } catch (err) {
      console.error("Failed to fetch household contributions:", err);
    }
  }

  async function setContribution(memberId: string, amount: number, frequency: "weekly" | "fortnightly" | "monthly") {
    try {
      const hId = await ensureHousehold();

      // Clean up other frequencies for the same member to avoid orphaned cycles
      const { error: deleteErr } = await supabase
        .from("household_contributions")
        .delete()
        .eq("member_id", memberId)
        .neq("frequency", frequency);

      if (deleteErr) {
        console.error("Error cleaning up other contributions:", deleteErr);
      }

      const dbData = {
        household_id: hId,
        member_id: memberId,
        amount,
        frequency,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("household_contributions")
        .upsert(dbData, { onConflict: "household_id,member_id,frequency" })
        .select()
        .single();

      if (error) {
        console.error("Error upserting household contribution:", error);
        return;
      }

      if (data) {
        setHouseholdContributions((prev) => {
          const filtered = prev.filter(
            (c) => String(c.member_id) !== String(memberId) || c.frequency === frequency
          );
          const exists = filtered.some((c) => c.id === data.id);
          if (exists) {
            return filtered.map((c) => (c.id === data.id ? data : c));
          }
          return [...filtered, data];
        });
      }
    } catch (err) {
      console.error("Failed to set household contribution:", err);
    }
  }

  async function deleteContribution(id: string) {
    try {
      const { error } = await supabase
        .from("household_contributions")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting household contribution:", error);
        return;
      }

      setHouseholdContributions((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete household contribution:", err);
    }
  }

  async function fetchContributionRules(householdId?: string) {
    const hId = householdId || dbHouseholdId;
    if (!hId) return;

    try {
      const { data, error } = await supabase
        .from("contribution_rules")
        .select("*")
        .eq("household_id", hId);

      if (error) {
        console.error("Error fetching contribution rules:", error);
        return;
      }

      if (data) {
        setContributionRules(data);
      }
    } catch (err) {
      console.error("Failed to fetch contribution rules:", err);
    }
  }

  async function addRule(ruleData: Omit<ContributionRule, "id" | "household_id" | "created_at">) {
    try {
      const hId = await ensureHousehold();
      const insertData = {
        household_id: hId,
        ...ruleData,
        is_active: ruleData.is_active ?? true,
      };

      const { data, error } = await supabase
        .from("contribution_rules")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error inserting contribution rule:", error);
        return;
      }

      if (data) {
        setContributionRules((prev) => [...prev, data]);
      }
    } catch (err) {
      console.error("Failed to add contribution rule:", err);
    }
  }

  async function updateRule(id: string, ruleData: Partial<Omit<ContributionRule, "id" | "household_id" | "created_at">>) {
    try {
      const { data, error } = await supabase
        .from("contribution_rules")
        .update(ruleData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating contribution rule:", error);
        return;
      }

      if (data) {
        setContributionRules((prev) =>
          prev.map((r) => (r.id === id ? data : r))
        );
      }
    } catch (err) {
      console.error("Failed to update contribution rule:", err);
    }
  }

  async function deleteRule(id: string) {
    try {
      const { error } = await supabase
        .from("contribution_rules")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting contribution rule:", error);
        return;
      }

      setContributionRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete contribution rule:", err);
    }
  }

  async function toggleRuleActive(id: string) {
    const rule = contributionRules.find((r) => r.id === id);
    if (!rule) return;
    await updateRule(id, { is_active: !rule.is_active });
  }

  function checkAndApplyRules(memberId: string, payAmount: number): ContributionRule[] {
    return contributionRules.filter(
      (r) =>
        r.is_active &&
        String(r.member_id) === String(memberId) &&
        payAmount > Number(r.threshold_amount)
    );
  }

  async function applyRuleAllocation(rule: ContributionRule, payHistoryId: string) {
    try {
      // Find the corresponding pay history item to get the logged pay amount
      let historyItem = payHistory.find((h) => h.id === payHistoryId);
      let payAmount = historyItem ? Number(historyItem.amount) : 0;

      if (!historyItem) {
        // Fallback: Query direct from database to prevent race conditions
        const { data, error } = await supabase
          .from("pay_history")
          .select("amount")
          .eq("id", payHistoryId)
          .single();
        if (data && !error) {
          payAmount = Number(data.amount);
        }
      }

      // Calculate calculatedAmount to allocate
      let calculatedAmount = Number(rule.amount_to_add);
      if (rule.amount_type === "percentage") {
        const surplus = payAmount - Number(rule.threshold_amount);
        calculatedAmount = surplus > 0 ? surplus * (Number(rule.amount_to_add) / 100) : 0;
      }

      // Ensure we don't allocate negative or zero amounts
      if (calculatedAmount <= 0) {
        console.log(`Skipping rule allocation for rule ${rule.id} because calculated amount is <= 0.`);
        return;
      }

      if (rule.action_type === "goal") {
        await addToGoal(rule.action_target_id, calculatedAmount);
      } else if (rule.action_type === "contribution") {
        console.log(`Allocated surplus of $${calculatedAmount.toFixed(2)} to base joint contribution.`);
      }

      const { data: updatedHistory, error } = await supabase
        .from("pay_history")
        .update({
          rule_id: rule.id,
          allocation_type: rule.action_type,
          allocation_target_id: rule.action_target_id,
        })
        .eq("id", payHistoryId)
        .select()
        .single();

      if (error) {
        console.error("Error updating pay history rule allocation:", error);
        return;
      }

      if (updatedHistory) {
        setPayHistory((prev) =>
          prev.map((h) => (h.id === payHistoryId ? updatedHistory : h))
        );
      }
    } catch (err) {
      console.error("Failed to apply rule allocation:", err);
    }
  }

  /* ── Notifications ─────────────────────────── */
  async function fetchNotifications(userId: string, householdId: string) {
    try {
      const [notifsRes, settingsRes] = await Promise.all([
        supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('notification_settings').select('*').eq('user_id', userId).maybeSingle()
      ]);

      if (notifsRes.data) setNotifications(notifsRes.data);
      if (settingsRes.data) {
        setNotificationSettings(settingsRes.data);
      } else {
        // Create default settings if none exist
        const defaultSettings = {
          user_id: userId,
          all_enabled: true,
          manual_bill_reminders: true,
          lodge_payment_reminders: true,
          auto_pay_reminders: true,
          manual_bill_reminder_days: 3,
          auto_pay_reminder_days: 1,
          payday_reminders: true,
          goal_milestone_reminders: true,
          notify_hour: 9,
        };
        const { data: newSettings } = await supabase.from('notification_settings').insert(defaultSettings).select().single();
        if (newSettings) setNotificationSettings(newSettings);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }

  async function markNotificationRead(id: string) {
    if (!session?.user) return;
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', session.user.id);
      if (!error) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  }

  async function deleteNotification(id: string) {
    if (!session?.user) return;
    try {
      // Dismiss = keep-and-mark. We mark the row as read (rather than
      // deleting it) so its dedupe_key persists and the server/client
      // reminder generators respect the dismissal instead of resurfacing it.
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', session.user.id);
      if (!error) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.error("Failed to dismiss notification:", err);
    }
  }

  async function clearAllNotifications() {
    if (!session?.user) return;
    try {
      // Mark all of the user's unread notifications as read (keep the rows so
      // their dedupe keys survive and dismissals are respected server-side).
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);
      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error("Failed to clear all notifications:", err);
    }
  }

  async function updateNotificationSettings(settings: Partial<NotificationSettings>) {
    if (!session?.user || !notificationSettings) return;
    try {
      const { data: updated, error } = await supabase
        .from('notification_settings')
        .update(settings)
        .eq('user_id', session.user.id)
        .select()
        .single();
        
      if (!error && updated) {
        setNotificationSettings(updated);
      }
    } catch (err) {
      console.error("Failed to update notification settings:", err);
    }
  }

  /* Slice 13 (#99) review finding 1: this device's push status, plus the
   * auto-heal that used to live in NotificationCenter.tsx (commit a2400c6) —
   * moved here so it fires exactly once per signed-in session, from one
   * owner, rather than once per NotificationCenter mount point (of which
   * there are now two: AppShell's floating bell + settings-client.tsx).
   * Unconditional: runs regardless of whether the user opens any dialog. If
   * the browser already has a live PushManager subscription, silently
   * re-POST it (idempotent upsert) to repair a stale/missing server-side
   * push_subscriptions row — delivery runs off that table via pg_cron
   * (Slice 11), so a device that drifted out of sync would otherwise stay
   * silently un-delivered until the user happened to notice and act. */
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      await syncPushSubscriptionIfPresent();
      const status = await getPushStatus();
      if (!cancelled) setPushStatus(status);
    })();
    return () => {
      cancelled = true;
    };
    // Deliberately keyed on the user id only, not the whole `session` object
    // — session's access token refreshes periodically, which would refire
    // this on every refresh instead of once per signed-in user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // Client-side notification generation
  useEffect(() => {
    // isOnboarded is required so this never fires with a stale household's
    // bills/payHistory/members still in state during a same-tab user switch
    // (A -> B): isDataLoading can read false before B's household data has
    // actually replaced A's, but isOnboarded only becomes true once the
    // current user is confirmed onboarded into their (current) household
    // (see #90).
    if (!session?.user || !notificationSettings || !notificationSettings.all_enabled || isDataLoading || !isOnboarded) return;

    const generateClientNotifications = async () => {
      // Use the device timezone so client-side behavior stays identical to
      // before for AU users. The server cron uses each household's stored
      // timezone instead.
      const todayYmd = todayInZone(Intl.DateTimeFormat().resolvedOptions().timeZone);

      const currentMemberId =
        members.find(m => m.user_id === session.user.id)?.id?.toString() ?? null;

      // Build the set of dedupe keys already represented in current state
      // (covers both freshly-sent and dismissed-but-kept notifications), so
      // we never regenerate a reminder that already exists.
      const existingKeys = new Set<string>();
      for (const n of notifications) {
        if (n.dedupe_key) {
          existingKeys.add(n.dedupe_key);
          continue;
        }
        // Reconstruct the key for rows that predate the dedupe_key column.
        if (!n.related_entity_id) continue;
        if (n.type === 'manual_bill' || n.type === 'auto_pay') {
          const bill = bills.find(b => b.id?.toString() === n.related_entity_id);
          const dueYmd = bill ? (bill.due_date || bill.dueDate) : '';
          existingKeys.add(`${n.related_entity_id}-${dueYmd}-${n.type}`);
        } else if (n.type === 'lodge_payment') {
          existingKeys.add(`${n.related_entity_id}-lodge_payment`);
        }
      }

      const rows = generateReminders({
        userId: session.user.id,
        householdId: dbHouseholdId,
        todayYmd,
        bills,
        payHistory,
        paySchedules,
        funds,
        currentMemberId,
        settings: notificationSettings,
        existingKeys,
      });

      if (rows.length > 0) {
        // Slice 11 v2 (#96 half B rework): mark these rows delivered
        // immediately since we're about to push them ourselves right below
        // — this is the instant, app-is-open delivery path, distinct from
        // the daily generation cron. Without this, the separate
        // deliver-scheduled cron would see delivered_at IS NULL and push
        // these a second time on its next run. `scheduled_for` is left
        // unset here and defaults to `now()` via the DB column default,
        // which is correct for this path (delivery is immediate).
        const rowsWithDelivery = rows.map(row => ({
          ...row,
          delivered_at: new Date().toISOString(),
        }));

        // Upsert with ignoreDuplicates so concurrent client/cron runs never
        // create the same reminder twice; .select() returns ONLY the rows
        // that were actually inserted (duplicates are silently skipped).
        const { data, error } = await supabase
          .from('notifications')
          .upsert(rowsWithDelivery, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
          .select();
        if (!error && data) {
           setNotifications(prev => [...data, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
           
           // Fire web push for each new notification
           for (const notif of data) {
             try {
               await fetch('/api/push/send', {
                 method: 'POST',
                 headers: {
                   'Content-Type': 'application/json',
                   'Authorization': `Bearer ${session.access_token}`,
                 },
                 body: JSON.stringify({
                   userId: notif.user_id,
                   title: notif.title,
                   body: notif.message,
                   url: notif.related_entity_id 
                     ? `/bills?billId=${notif.related_entity_id}` 
                     : '/',
                   icon: '/icons/icon-192x192.png?v=2'
                 }),
               });
             } catch (e) {
               console.error('Push send failed:', e);
             }
           }
        }
      }
    };

    generateClientNotifications();
  }, [bills, payHistory, paySchedules, funds, notificationSettings, isDataLoading, isOnboarded, session, dbHouseholdId, members, notifications]);

  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name));

  /* ── Value ─────────────────────────────────── */
  const value: AppContextValue = {
    isOnboarded,
    completeOnboarding,
    householdName,
    setHouseholdName,
    createHousehold,
    bills,
    addBill,
    updateBill,
    togglePaid,
    markAsPaid,
    markAsUnpaid,
    togglePauseBill,
    deleteBill,
    isJointFund,
    updateHouseholdPaymentMode,
    householdTimezone,
    updateHouseholdTimezone,
    funds,
    addFund,
    updateGoal,
    deleteGoal,
    updateFund,
    deleteFund,
    addMoneyToFund,
    addToGoal,
    paydays,
    addPayday,
    deletePayday,
    members: sortedMembers,
    householdMembers: sortedMembers,
    addMember,
    removeMember,
    updateMember,
    updateMemberAvatar,
    joinCode,
    codeExpiresAt,
    regenerateJoinCode,
    joinHousehold,
    leaveHousehold,
    deleteHousehold,
    billSplits,
    setBillSplits,
    addBillSplit,
    updateBillSplit,
    deleteBillSplit,
    paySchedules,
    payHistory,
    addPaySchedule,
    updatePaySchedule,
    deletePaySchedule,
    logPay,
    confirmPay,
    confirmAndUpdatePay,
    autoLogMissedPays,
    deletePayHistory,
    calculateAveragePay,
    householdContributions,
    fetchHouseholdContributions,
    setContribution,
    deleteContribution,
    contributionRules,
    fetchContributionRules,
    addRule,
    updateRule,
    deleteRule,
    toggleRuleActive,
    checkAndApplyRules,
    applyRuleAllocation,
    notifications,
    notificationSettings,
    markNotificationRead,
    deleteNotification,
    clearAllNotifications,
    updateNotificationSettings,
    pushStatus,
    setPushStatus,
    session,
    isAuthLoading,
    isDataLoading,
    showOfflineRetry,
    retryLoadData,
    theme,
    setTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/* ═══════════════════════════════════════════════
   Hook
   ═══════════════════════════════════════════════ */

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within an <AppProvider>");
  }
  return ctx;
}

export function useCurrentUser() {
  const { session, members } = useApp();
  const email = session?.user?.email || "";
  const currentMember = members.find((m) => String(m.email).toLowerCase() === String(email).toLowerCase());
  return {
    id: currentMember?.id || "",
    name: currentMember?.name || email.split("@")[0] || "User",
    email: email,
    avatar: (currentMember?.name || email || "U").charAt(0).toUpperCase(),
    avatar_url: currentMember?.avatar_url || null,
  };
}

