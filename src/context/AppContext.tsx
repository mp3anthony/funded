"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { CheckCircle, Clock, AlertCircle, Plane, Shield, Car, PiggyBank, Home, BookOpen, CreditCard, TrendingUp, HelpCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { type Session } from "@supabase/supabase-js";
import { type HouseholdContribution, type ContributionRule } from "@/types";
import { adjustAutopayBillDate } from "@/lib/utils";
import { generateReminders } from "@/lib/notifications/generateReminders";
import { todayInZone } from "@/lib/notifications/timezone";


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

export interface NotificationSettings {
  id?: string;
  user_id?: string;
  all_enabled: boolean;
  manual_bill_reminders: boolean;
  lodge_payment_reminders: boolean;
  auto_pay_reminders: boolean;
  manual_bill_reminder_days: number;
  auto_pay_reminder_days: number;
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

function parseDateForDb(dateStr: string): string {
  try {
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split("T")[0];
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

  /* Notifications */
  notifications: Notification[];
  notificationSettings: NotificationSettings | null;
  markNotificationRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;

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
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<string | null>(null);

  /* ── Auth ────────────────────────────────── */
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isAuthLoading, setIsAuthLoading] = useState(!initialSession);
  const [isDataLoading, setIsDataLoading] = useState(!initialIsOnboarded && !!initialSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Auth useEffect - getSession result:', session ? 'has session' : 'no session', 'user:', session?.user?.id);
      setSession(session);
      setIsAuthLoading(false);
      // Mark data as loading in the same batch as the session resolving, so the
      // very first render after auth knows "session found, data not yet checked".
      // Without this, isDataLoading stays false until loadData runs one render
      // later, and AppShell's Onboarding gate briefly wins the gap — the
      // cold-start "create or join" flash (see #49). Only when a session exists;
      // a null session must stay non-loading so the login redirect still fires.
      if (session) setIsDataLoading(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth useEffect - onAuthStateChange event:', _event, 'session:', session ? 'has session' : 'no session', 'user:', session?.user?.id);
      setSession(session);
      setIsAuthLoading(false);
      // Only "session just established" events should enter the loading state.
      // TOKEN_REFRESHED / USER_UPDATED fire in the background (roughly hourly,
      // and on tab refocus) and must stay silent — otherwise they'd flash the
      // full-screen loading wheel over a working app, since loadData re-runs on
      // every session change. Mirror the codebase's existing convention that
      // treats INITIAL_SESSION and SIGNED_IN as the authoritative signals
      // (see src/app/auth/callback/page.tsx).
      if (session && (_event === "INITIAL_SESSION" || _event === "SIGNED_IN")) {
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

  /* ── Sync/Load Data ─────────────────────────── */
  // Only load data AFTER auth has resolved and we have a valid session.
  // This prevents a race condition where RLS returns empty results
  // (because no auth token is set yet), causing the app to show onboarding.
  async function loadData() {
    if (isAuthLoading || !session?.user) {
      console.log('loadData skipped - isAuthLoading:', isAuthLoading, 'session:', session ? 'exists' : 'null');
      setIsOnboarded(false);
      setIsDataLoading(false);
      return;
    }
    if (!dbHouseholdId && !isOnboarded) {
      setIsDataLoading(true);
    }
    console.log('loadData running with authenticated session, user:', session.user.id);
    try {
      // STEP 1: Get ONLY the household_id from membership (no nested join!)
      const { data: membership, error: memError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (memError || !membership?.household_id) {
        console.log('[loadData] No active household membership or user has no household yet');
        setIsOnboarded(false);
        setIsDataLoading(false);
        return;
      }

      // STEP 2: Fetch household details by ID (separate request, no recursion)
      const { data: household, error: hhError } = await supabase
        .from('households')
        .select('id, name, join_code, code_expires_at, is_joint_fund')
        .eq('id', membership.household_id)
        .single();

      if (hhError || !household) {
        console.error('[loadData] Failed to fetch household details:', hhError);
        setIsOnboarded(false);
        setIsDataLoading(false);
        return;
      }

      console.log('loadData - found household:', household.id, household.name, household.is_joint_fund);
      setDbHouseholdId(household.id);
      setHouseholdNameState(household.name);
      setIsJointFund(!!household.is_joint_fund);
      setJoinCode(household.join_code || null);
      setCodeExpiresAt(household.code_expires_at || null);
      setIsOnboarded(true);

      // Fetch related data
      const [billsRes, fundsRes, paydaysRes, membersRes, billSplitsRes] = await Promise.all([
        supabase.from("bills").select("*").eq("household_id", household.id),
        supabase.from("funds").select("*").eq("household_id", household.id),
        supabase.from("paydays").select("*").eq("household_id", household.id),
        supabase.from("household_members").select("*").eq("household_id", household.id),
        supabase.from("bill_splits").select("*"),
      ]);

      if (billsRes.data) {
        setBills(billsRes.data.map(mapBillFromDb));
      }
      if (fundsRes.data) {
        setFunds(fundsRes.data.map(mapFundFromDb));
      }
      if (paydaysRes.data) {
        setPaydays(paydaysRes.data.map(mapPaydayFromDb));
      }

      let loadedMembers: Member[] = [];
      if (membersRes.data) {
        loadedMembers = membersRes.data.map(mapMemberFromDb);
      }
      setMembers(loadedMembers);

      if (billSplitsRes.data) {
        // Filter bill splits locally to only load splits for current household's bills
        const billIds = new Set((billsRes.data || []).map(b => b.id));
        setBillSplits(billSplitsRes.data.filter((split: any) => billIds.has(split.bill_id)));
      }

      // Fetch payday schedule, history, contributions, and rules
      await Promise.all([
        fetchPayData(household.id),
        fetchHouseholdContributions(household.id),
        fetchContributionRules(household.id),
        fetchNotifications(session.user.id, household.id)
      ]);
    } catch (err) {
      console.error('[loadData] Failed loading all household data:', err);
      setIsOnboarded(false);
    } finally {
      setIsDataLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [isAuthLoading, session]);

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

    const { data: households } = await supabase
      .from("households")
      .select("id, name")
      .limit(1);

    if (households && households.length > 0) {
      setDbHouseholdId(households[0].id);
      setHouseholdNameState(households[0].name);
      return households[0].id;
    }

    const nameToUse = householdName.trim() || "My Household";
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const userIdToUse = currentSession?.user?.id;
    console.log('ensureHousehold - currentSession:', currentSession ? 'exists' : 'null', 'userIdToUse:', userIdToUse);

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
      const { data: newMember } = await supabase
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
      if (newMember) {
        setMembers([mapMemberFromDb(newMember)]);
      }
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
      if (newMember) {
        setMembers([mapMemberFromDb(newMember)]);
      }
      setIsOnboarded(true);

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
        return;
      }

      setIsJointFund(jointFundVal);

      if (isModeChanging) {
        await resetBillContributions();
      }
    } catch (err) {
      console.error("Failed to update payment mode:", err);
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
        return;
      }

      if (data) {
        setPaydays((prev) => [...prev, mapPaydayFromDb(data)]);
      }
    } catch (err) {
      console.error("Failed to add payday:", err);
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

    // Cache backup state for potential rollback on failure
    const backupState = {
      dbHouseholdId,
      householdName,
      isJointFund,
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
        const currentUserInOldHousehold = backupState.members.find(
          (m) => String(m.email).toLowerCase() === String(session?.user?.email).toLowerCase()
        );

        if (currentUserInOldHousehold && currentUserInOldHousehold.role === "owner") {
          // Cascade delete current household from database
          const { error: deleteError } = await supabase
            .from("households")
            .delete()
            .eq("id", backupState.dbHouseholdId);
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
      await loadData();
    } catch (err: any) {
      console.error("Failed to join household, rolling back state:", err);
      // Rollback React states to cached values
      setDbHouseholdId(backupState.dbHouseholdId);
      setHouseholdNameState(backupState.householdName);
      setIsJointFund(backupState.isJointFund);
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

      const newNextPayDate = currentDate.toISOString().split("T")[0];

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
          const payDateStr = tempDate.toISOString().split("T")[0];
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

          const nextValidDateStr = tempDate.toISOString().split("T")[0];
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
          auto_pay_reminder_days: 1
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

  // Client-side notification generation
  useEffect(() => {
    if (!session?.user || !notificationSettings || !notificationSettings.all_enabled || isDataLoading) return;
    
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
        currentMemberId,
        settings: notificationSettings,
        existingKeys,
      });

      if (rows.length > 0) {
        // Upsert with ignoreDuplicates so concurrent client/cron runs never
        // create the same reminder twice; .select() returns ONLY the rows
        // that were actually inserted (duplicates are silently skipped).
        const { data, error } = await supabase
          .from('notifications')
          .upsert(rows, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
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
  }, [bills, payHistory, notificationSettings, isDataLoading, session, dbHouseholdId, members, notifications]);

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
    session,
    isAuthLoading,
    isDataLoading,
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

