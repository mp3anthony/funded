/**
 * Rules for the Payday history chart and list (R22, #409): the period choices,
 * which pays count, the per-member lines and totals, the shares and the chart
 * axes.
 *
 * Deliberately has ZERO imports so `payChart.test.mjs` can run it under plain
 * `node --test`. Erasable TypeScript syntax only (no enums, no parameter
 * properties). Dates are "YYYY-MM-DD" strings; `todayYmd` is passed in (the
 * household-local day), never read from the clock here.
 */

export type Period = "4w" | "3m" | "12m" | "all";

export const PERIODS: { value: Period; label: string }[] = [
  { value: "4w", label: "4 weeks" },
  { value: "3m", label: "3 months" },
  { value: "12m", label: "12 months" },
  { value: "all", label: "All" },
];

export const DEFAULT_PERIOD: Period = "3m";

/** What the chart and list need from a pay_history row (a `PayHistory` fits). */
export interface ChartRow {
  id: string | number;
  member_id: string | number;
  amount: number | null;
  pay_date: string;
  created_at?: string | null;
  status?: string | null;
}

export interface ChartPoint {
  id: string;
  date: string;
  amount: number;
}

export interface MemberSeries {
  memberId: string;
  /** Confirmed pays in the period, oldest first. */
  points: ChartPoint[];
  total: number;
  /** Mean of the points, or null with none. */
  average: number | null;
}

/** Line colours, in member order. The first is the app's lime (a CSS variable, so it follows the theme). */
export const SERIES_COLOURS = [
  "var(--color-primary)",
  "#38bdf8",
  "#f472b6",
  "#ffab00",
  "#a78bfa",
  "#2dd4bf",
  "#fb7185",
  "#94a3b8",
];

/** Colour for the member at this position in the household's member list. Wraps past eight. */
export function seriesColour(index: number): string {
  const n = SERIES_COLOURS.length;
  return SERIES_COLOURS[((Math.trunc(index) % n) + n) % n];
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dayNumber(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function fromDayNumber(n: number): string {
  const d = new Date(n * MS_PER_DAY);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

/** Same day-of-month `months` earlier, clamped to the month's length (31 Aug minus 6 months = 28 Feb). */
function monthsBack(ymd: string, months: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const idx = y * 12 + (m - 1) - months;
  const ny = Math.floor(idx / 12);
  const nm = idx - ny * 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  const day = Math.min(d, last);
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** First day (inclusive) of the period, or null for All or an unusable `todayYmd`. */
export function periodStart(period: Period, todayYmd: string): string | null {
  if (period === "all" || !YMD_RE.test(todayYmd ?? "")) return null;
  if (period === "4w") return fromDayNumber(dayNumber(todayYmd) - 27);
  return monthsBack(todayYmd, period === "3m" ? 3 : 12);
}

/** A confirmed pay with a known amount is the only kind a chart line can use. */
export function isChartable(row: ChartRow): boolean {
  return row.status !== "pending" && row.amount !== null && row.amount !== undefined;
}

function inPeriod(row: ChartRow, start: string | null): boolean {
  const date = (row.pay_date ?? "").slice(0, 10);
  return start === null || date >= start;
}

/** Newest first: pay date, then created_at as the tie-break. Never relies on fetch order. */
function newestFirst(a: ChartRow, b: ChartRow): number {
  const ad = (a.pay_date ?? "").slice(0, 10);
  const bd = (b.pay_date ?? "").slice(0, 10);
  if (ad !== bd) return ad < bd ? 1 : -1;
  const ac = a.created_at ?? "";
  const bc = b.created_at ?? "";
  if (ac === bc) return 0;
  return ac < bc ? 1 : -1;
}

/** The list: every pay (Pending too) of the chosen members in the period, newest first. */
export function listRows<R extends ChartRow>(
  rows: readonly R[],
  memberIds: readonly string[],
  start: string | null,
): R[] {
  const ids = new Set(memberIds);
  return rows
    .filter((r) => ids.has(String(r.member_id)) && inPeriod(r, start))
    .sort(newestFirst);
}

/** One series per chosen member, in the order given, from their confirmed pays in the period. */
export function buildSeries(
  rows: readonly ChartRow[],
  memberIds: readonly string[],
  start: string | null,
): MemberSeries[] {
  return memberIds.map((memberId) => {
    const points = rows
      .filter((r) => String(r.member_id) === memberId && isChartable(r) && inPeriod(r, start))
      .sort((a, b) => -newestFirst(a, b))
      .map((r) => ({ id: String(r.id), date: r.pay_date.slice(0, 10), amount: Number(r.amount) }));
    const total = points.reduce((s, p) => s + p.amount, 0);
    return { memberId, points, total, average: points.length > 0 ? total / points.length : null };
  });
}

/** Everyone's confirmed pay in the period, whoever is ticked: the base for each member's share. */
export function householdTotal(rows: readonly ChartRow[], start: string | null): number {
  return rows.filter((r) => isChartable(r) && inPeriod(r, start)).reduce((s, r) => s + Number(r.amount), 0);
}

/** A whole-number share of the household's pay, or null when nobody was paid. */
export function sharePercent(total: number, household: number): number | null {
  if (!(household > 0)) return null;
  return Math.round((total / household) * 100);
}

/** Pending pays of the chosen members in the period: they are in the list but not on the chart. */
export function pendingInPeriod(rows: readonly ChartRow[], memberIds: readonly string[], start: string | null): number {
  const ids = new Set(memberIds);
  return rows.filter((r) => r.status === "pending" && ids.has(String(r.member_id)) && inPeriod(r, start)).length;
}

/**
 * Ticking boxes: flips one member and never leaves the list empty (a chart of
 * nobody says nothing), so un-ticking the last one is ignored. `selected` is
 * the current ticks, `all` every member that can be ticked.
 */
export function toggleMember(selected: readonly string[], id: string, all: readonly string[]): string[] {
  const has = selected.includes(id);
  if (has && selected.length === 1) return [...selected];
  const next = has ? selected.filter((s) => s !== id) : [...selected, id];
  return all.filter((m) => next.includes(m));
}

/** Short label for the filter chip: "Everyone · 3 months", "Sam · All", "2 people · 4 weeks". */
export function filterLabel(
  selected: readonly string[],
  all: readonly string[],
  names: Readonly<Record<string, string>>,
  period: Period,
): string {
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "";
  let who: string;
  if (selected.length === 0 || selected.length === all.length) who = all.length === 1 ? (names[all[0]] ?? "Everyone") : "Everyone";
  else if (selected.length === 1) who = names[selected[0]] ?? "1 person";
  else who = `${selected.length} people`;
  return `${who} · ${periodLabel}`;
}

export interface ChartDomain {
  /** Day numbers for the left and right edge. */
  minDay: number;
  maxDay: number;
  /** Top of the y axis, and the tick values from 0 up to it. */
  yTop: number;
  ticks: number[];
}

/** A round number at or above `max` that gives three tidy ticks (0, half, top). */
export function niceTop(max: number): number {
  if (!(max > 0)) return 100;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  for (const mult of [1, 2, 4, 5, 10]) {
    if (mult * exp >= max) return mult * exp;
  }
  return 10 * exp;
}

/**
 * The chart's frame. The x range is the period (start to today); for All it is
 * the first to the last pay shown. y starts at $0 so a lower pay never looks
 * like a collapse.
 */
export function chartDomain(
  series: readonly MemberSeries[],
  start: string | null,
  todayYmd: string,
): ChartDomain {
  const dates = series.flatMap((s) => s.points.map((p) => dayNumber(p.date)));
  const today = YMD_RE.test(todayYmd ?? "") ? dayNumber(todayYmd) : null;
  let minDay: number;
  let maxDay: number;
  if (start !== null && today !== null) {
    minDay = dayNumber(start);
    maxDay = today;
  } else if (dates.length > 0) {
    minDay = Math.min(...dates);
    maxDay = Math.max(...dates);
  } else {
    minDay = today ?? 0;
    maxDay = minDay;
  }
  if (maxDay <= minDay) maxDay = minDay + 1;
  const max = Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.amount)));
  const yTop = niceTop(max);
  return { minDay, maxDay, yTop, ticks: [0, yTop / 2, yTop] };
}

/** 0 to 1 across the x range for a date (clamped). */
export function xFraction(ymd: string, domain: ChartDomain): number {
  const f = (dayNumber(ymd) - domain.minDay) / (domain.maxDay - domain.minDay);
  return Math.min(Math.max(f, 0), 1);
}

/** The y axis labels: "$0", "$250", "$1.5k". */
export function axisLabel(n: number): string {
  if (n >= 1000) return `$${+(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

/** "4 Oct" for the x axis ends. */
export function shortDate(ymd: string): string {
  if (!YMD_RE.test(ymd ?? "")) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, m, d] = ymd.split("-").map(Number);
  return `${d} ${months[m - 1]}`;
}

/** The day (as "YYYY-MM-DD") at an x-domain edge, for the axis labels. */
export function domainDate(day: number): string {
  return fromDayNumber(day);
}
