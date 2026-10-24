/**
 * Rules for the Payday member cards and the member sheet (R21, #408): which
 * members get a card, the order of their pay schedules, the progress ring, and
 * the card wording.
 *
 * Deliberately has ZERO imports so `paydayCards.test.mjs` can run it under plain
 * `node --test`. Erasable TypeScript syntax only (no enums, no parameter
 * properties). Dates are "YYYY-MM-DD" strings; `todayYmd` is passed in (the
 * household-local day), never read from the clock here. `parseAmount` and
 * `amountLabel` are small copies of the ones in `addPayFlow.ts` on purpose:
 * node's test runner cannot resolve a relative .ts import.
 */

export type Frequency = "weekly" | "fortnightly" | "monthly";

/** What the cards need from a member (a `Member` fits). */
export interface CardMember {
  id: string | number;
  name: string;
  user_id?: string | null;
  invitation_status?: string | null;
}

/** What the cards need from a pay schedule (a `PaySchedule` fits). */
export interface CardSchedule {
  id: string | number;
  member_id: string | number;
  frequency: string;
  is_fixed_amount: boolean;
  amount: number | null;
  next_pay_date: string;
  created_at?: string | null;
}

export interface MemberCard<M extends CardMember, S extends CardSchedule> {
  member: M;
  /** Soonest next pay first. Empty = the member has no pay set up yet. */
  schedules: S[];
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Signed up and not still pending (the same rule as `isAcceptedMember` in `householdLeave.ts`). */
function isAccepted(m: CardMember): boolean {
  return !!m.user_id && (m.invitation_status ?? "accepted") !== "pending";
}

/** Soonest next pay date first; same day by creation time, then id, so the order never depends on fetch order. */
function bySoonest(a: CardSchedule, b: CardSchedule): number {
  if (a.next_pay_date !== b.next_pay_date) return a.next_pay_date < b.next_pay_date ? -1 : 1;
  const ac = a.created_at ?? "";
  const bc = b.created_at ?? "";
  if (ac !== bc) return ac < bc ? -1 : 1;
  return String(a.id).localeCompare(String(b.id));
}

/**
 * One card per member in the household: every accepted member, plus anyone
 * (even a not-yet-accepted member) who already has a pay schedule, so no pay is
 * ever hidden. Members with pay come first, the soonest payday first; members
 * with no pay yet come last, by name.
 */
export function memberCards<M extends CardMember, S extends CardSchedule>(
  members: readonly M[],
  schedules: readonly S[],
): MemberCard<M, S>[] {
  const cards: MemberCard<M, S>[] = [];
  for (const member of members) {
    const own = schedules.filter((s) => String(s.member_id) === String(member.id)).sort(bySoonest);
    if (own.length === 0 && !isAccepted(member)) continue;
    cards.push({ member, schedules: own });
  }
  return cards.sort((a, b) => {
    const aHas = a.schedules.length > 0;
    const bHas = b.schedules.length > 0;
    if (aHas !== bHas) return aHas ? -1 : 1;
    if (aHas && bHas) {
      const d = bySoonest(a.schedules[0], b.schedules[0]);
      if (d !== 0) return d;
    }
    return a.member.name.localeCompare(b.member.name);
  });
}

/** Whole days from `todayYmd` to `ymd` (negative once the day has passed). Null when either date is not a valid YYYY-MM-DD. */
export function daysUntil(ymd: string, todayYmd: string): number | null {
  const next = (ymd ?? "").slice(0, 10);
  if (!YMD_RE.test(next) || !YMD_RE.test(todayYmd ?? "")) return null;
  const [ny, nm, nd] = next.split("-").map(Number);
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  return Math.round((Date.UTC(ny, nm - 1, nd) - Date.UTC(ty, tm - 1, td)) / MS_PER_DAY);
}

/** Length of one pay cycle in days (a month is 30, close enough for a progress ring). */
export function cycleDays(frequency: string): number {
  if (frequency === "weekly") return 7;
  if (frequency === "fortnightly") return 14;
  return 30;
}

/**
 * How far through the pay cycle we are, 0 to 100: days since the last pay over
 * the cycle length. Full on pay day and after; empty when the date is not known
 * or more than a whole cycle away.
 */
export function ringPercent(daysLeft: number | null, frequency: string): number {
  if (daysLeft === null) return 0;
  if (daysLeft <= 0) return 100;
  const cycle = cycleDays(frequency);
  const elapsed = cycle - daysLeft;
  return Math.min(100, Math.max(0, Math.round((elapsed / cycle) * 100)));
}

/** "Due now" on or after pay day, else "in 5 days" ("in 1 day"). Blank when the date is not known. */
export function dueText(daysLeft: number | null): string {
  if (daysLeft === null) return "";
  if (daysLeft <= 0) return "Due now";
  return `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
}

/** "Fortnightly" */
export function frequencyLabel(frequency: string): string {
  return frequency ? `${frequency.charAt(0).toUpperCase()}${frequency.slice(1)}` : "";
}

/** "Fortnightly · in 5 days" (just the frequency while the date is not known). */
export function cardLine(frequency: string, daysLeft: number | null): string {
  const due = dueText(daysLeft);
  const label = frequencyLabel(frequency);
  return due ? `${label} · ${due}` : label;
}

export const ESTIMATE_NOTE = "Estimate from your last 4 pays";
export const NO_ESTIMATE_NOTE = "Not enough pays yet";

export interface CardAmount {
  /** The amount to show, or null when there is nothing to show (variable pay with too few pays). */
  amount: number | null;
  /** Variable pay: the figure is an average, shown grey. */
  estimate: boolean;
  /** Small line under the amount, or null. */
  note: string | null;
}

/** Fixed pay shows its amount; variable pay shows the average of the last 4 confirmed pays (`average`, null with fewer than 2). */
export function cardAmount(
  schedule: { is_fixed_amount: boolean; amount: number | null },
  average: number | null,
): CardAmount {
  if (schedule.is_fixed_amount) {
    const n = Number(schedule.amount);
    return { amount: Number.isFinite(n) && n > 0 ? n : null, estimate: false, note: null };
  }
  if (average === null) return { amount: null, estimate: true, note: NO_ESTIMATE_NOTE };
  return { amount: average, estimate: true, note: ESTIMATE_NOTE };
}

/** "$1,850" for whole dollars, "$1,850.50" otherwise. */
export function moneyLabel(n: number): string {
  const whole = Math.round(n * 100) % 100 === 0;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "$1,200.00" */
export function amountLabel(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "12.50", "1,200", "$40", " 7 " give a number above 0; anything else gives null. */
export function parseAmount(str: string): number | null {
  const cleaned = str.replace(/[\s,]/g, "").replace(/^\$/, "");
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "a week", "a fortnight", "a month" */
export function perFrequency(frequency: string): string {
  if (frequency === "weekly") return "a week";
  if (frequency === "fortnightly") return "a fortnight";
  return "a month";
}

/** The Contribution row value: "$50 a week", or "Not set". */
export function contributionLine(
  contribution: { amount: number | string; frequency: string } | null | undefined,
): string {
  if (!contribution) return "Not set";
  const n = Number(contribution.amount);
  if (!Number.isFinite(n) || n <= 0) return "Not set";
  return `${moneyLabel(n)} ${perFrequency(contribution.frequency)}`;
}

/** The Contribution card's seed: the saved amount and frequency, else blank and the member's own pay frequency (weekly when unknown). */
export function contributionSeed(
  contribution: { amount: number | string; frequency: string } | null | undefined,
  payFrequency: string | null | undefined,
): { amount: string; frequency: Frequency } {
  if (contribution) return { amount: String(contribution.amount), frequency: asFrequency(contribution.frequency) };
  return { amount: "", frequency: asFrequency(payFrequency ?? "weekly") };
}

function asFrequency(f: string): Frequency {
  return f === "fortnightly" || f === "monthly" ? f : "weekly";
}

/** The rules that run on this member's pay (all of them, old "Contribution" ones included), oldest first. */
export function rulesForMember<R extends { member_id: string | number; created_at?: string | null }>(
  rules: readonly R[],
  memberId: string | number,
): R[] {
  return rules
    .filter((r) => String(r.member_id) === String(memberId))
    .sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
}

/** The DOM id and highlight key of a member's card (the Add flow and the page both use it). */
export function memberCardKey(memberId: string | number): string {
  return `member-pay-${memberId}`;
}

/** The sheet row for one pay schedule: "Fortnightly · $1,850" (or "Variable") and "Next 24 Oct". */
export function scheduleRow(
  schedule: { frequency: string; is_fixed_amount: boolean; amount: number | null; next_pay_date: string },
): { label: string; value: string } {
  const amount = cardAmount(schedule, null).amount;
  const what = schedule.is_fixed_amount && amount !== null ? moneyLabel(amount) : "Variable";
  return {
    label: `${frequencyLabel(schedule.frequency)} · ${what}`,
    value: `Next ${shortDate(schedule.next_pay_date)}`,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "24 Oct" for a YYYY-MM-DD date. */
export function shortDate(ymd: string): string {
  const [, m, d] = (ymd ?? "").slice(0, 10).split("-").map(Number);
  if (!m || !d || m < 1 || m > 12) return ymd ?? "";
  return `${d} ${MONTHS[m - 1]}`;
}
