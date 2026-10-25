"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useApp, type PayHistory } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Dialog from "@/components/ui/Dialog";
import PayHistoryCard from "@/components/PayHistoryCard";
import PayHistoryChart from "@/components/PayHistoryChart";
import { cn } from "@/lib/utils";
import { applyToggle, loadCollapsed, saveCollapsed } from "@/lib/categoryCollapse";
import {
  DEFAULT_PERIOD,
  PERIODS,
  buildSeries,
  filterLabel,
  householdTotal,
  listRows,
  pendingInPeriod,
  periodStart,
  seriesColour,
  sharePercent,
  toggleMember,
  type Period,
} from "@/lib/payChart";

const PAGE_SIZE = 15;
const COLLAPSE_SCOPE = "payday";
const COLLAPSE_NAME = "History";

interface PayHistorySectionProps {
  /** Household-local day; blank until the page has mounted. */
  todayYmd: string;
  /** The tick (or tap) on a Pending row. */
  onConfirmPending: (history: PayHistory) => void;
}

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Payday History (R22, #409): a drop-down with tick boxes (who, and a period),
 * a chart with one coloured line per ticked member, each member's total and
 * share under it, and the list below, newest first. Replaces the per-member
 * collapsed lists and the single-select contributor filter. Rules live in
 * `lib/payChart.ts`.
 */
export default function PayHistorySection({ todayYmd, onConfirmPending }: PayHistorySectionProps) {
  const { payHistory, householdMembers, session } = useApp();
  const userId = session?.user?.id;
  // Open by default; the remembered choice is read after mount so server and client agree.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!userId) return;
    // One-shot sync from localStorage, not a render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(loadCollapsed(userId, COLLAPSE_SCOPE).includes(COLLAPSE_NAME));
  }, [userId]);
  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (userId) {
      saveCollapsed(userId, applyToggle(loadCollapsed(userId, COLLAPSE_SCOPE), COLLAPSE_NAME, next), COLLAPSE_SCOPE);
    }
  };
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // null = everyone, so a member who gets their first pay later is included without a tap.
  const [picked, setPicked] = useState<string[] | null>(null);
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [shown, setShown] = useState(PAGE_SIZE);

  // Members with any pay on record, in the household's member order (their line colour follows that order).
  const options = useMemo(() => {
    const withPay = new Set(payHistory.map((h) => String(h.member_id)));
    const current = householdMembers
      .map((m, index) => ({ id: String(m.id), name: m.name, colour: seriesColour(index) }))
      .filter((o) => withPay.has(o.id));
    // Pays from someone who has since left stay in the history (and in the shares), as "Former member".
    const known = new Set(householdMembers.map((m) => String(m.id)));
    const former = [...withPay]
      .filter((id) => !known.has(id))
      .map((id, i) => ({ id, name: "Former member", colour: seriesColour(householdMembers.length + i) }));
    return [...current, ...former];
  }, [payHistory, householdMembers]);

  const allIds = useMemo(() => options.map((o) => o.id), [options]);
  const selected = useMemo(() => {
    const ticked = picked === null ? allIds : allIds.filter((id) => picked.includes(id));
    // If everyone ticked has gone, show everyone rather than an empty chart.
    return ticked.length > 0 ? ticked : allIds;
  }, [picked, allIds]);
  const names = useMemo(() => Object.fromEntries(options.map((o) => [o.id, o.name])), [options]);
  const colourOf = useMemo(() => Object.fromEntries(options.map((o) => [o.id, o.colour])), [options]);

  const start = periodStart(period, todayYmd);
  const series = useMemo(() => buildSeries(payHistory, selected, start), [payHistory, selected, start]);
  const rows = useMemo(() => listRows(payHistory, selected, start), [payHistory, selected, start]);
  const household = useMemo(() => householdTotal(payHistory, start), [payHistory, start]);
  const pending = pendingInPeriod(payHistory, selected, start);
  const hasLines = series.some((s) => s.points.length > 0);
  const single = series.length === 1 ? series[0] : null;

  const onToggle = (id: string) => {
    setPicked(toggleMember(selected, id, allIds));
    setShown(PAGE_SIZE);
  };
  const onPeriod = (p: Period) => {
    setPeriod(p);
    setShown(PAGE_SIZE);
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        className="group mb-1 flex min-h-11 w-full cursor-pointer items-center gap-3 text-left touch-manipulation [-webkit-tap-highlight-color:transparent] focus:outline-none"
      >
        <span className="shrink-0 text-[15px] font-bold text-foreground transition-colors group-hover:text-primary-ink">
          History
        </span>
        <span
          className="h-0.5 flex-1 rounded-sm"
          style={{ background: "linear-gradient(90deg, var(--color-primary), transparent)" }}
        />
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-subtle transition-transform group-hover:text-foreground motion-reduce:transition-none",
            !collapsed && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {payHistory.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-muted text-sm">No history logged yet.</p>
          <p className="text-subtle text-xs mt-1 font-body">Logged payday transactions will appear here.</p>
        </div>
      ) : !todayYmd ? null : (
        <>
          <Chip onClick={() => setIsFilterOpen(true)} aria-haspopup="dialog">
            {filterLabel(selected, allIds, names, period)}
            <ChevronDown size={14} aria-hidden="true" />
          </Chip>

          {rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted text-sm">No pays in this period.</p>
              <p className="text-subtle text-xs mt-1 font-body">Try a longer period or tick more people.</p>
            </div>
          ) : (
            <>
              {!collapsed && (
              <div className="mt-4 rounded-card border border-border bg-surface p-3">
                {hasLines ? (
                  <PayHistoryChart
                    series={series}
                    colours={series.map((s) => colourOf[s.memberId])}
                    names={series.map((s) => names[s.memberId])}
                    start={start}
                    todayYmd={todayYmd}
                  />
                ) : (
                  <p className="py-6 text-center text-sm text-muted">Nothing confirmed in this period yet.</p>
                )}

                {single ? (
                  <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                    <Stat label="Total" value={money(single.total)} />
                    <Stat label="Pays" value={String(single.points.length)} />
                    <Stat label="Average" value={single.average === null ? "None yet" : money(single.average)} />
                  </dl>
                ) : (
                  <ul className="mt-2 flex flex-col border-t border-border">
                    {series.map((s) => {
                      const share = sharePercent(s.total, household);
                      return (
                        <li key={s.memberId} className="flex items-center gap-2 py-2 text-sm">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: colourOf[s.memberId] }}
                          />
                          <span className="min-w-0 flex-1 truncate font-body font-semibold text-foreground">
                            {names[s.memberId]}
                          </span>
                          <span className="font-bold text-foreground tabular-nums">{money(s.total)}</span>
                          <span className="w-12 text-right text-xs text-muted tabular-nums">
                            {share === null ? "" : `${share}%`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {series.length > 1 && household > 0 && (
                  <p className="mt-1 text-xs text-subtle">Share of the household&apos;s pay in this period.</p>
                )}
                {pending > 0 && (
                  <p className="mt-1 text-xs text-subtle">
                    {pending} pending {pending === 1 ? "pay isn't" : "pays aren't"} on the chart until confirmed.
                  </p>
                )}
              </div>
              )}

              <div className="mt-4 flex flex-col">
                {rows.slice(0, shown).map((history) => (
                  <PayHistoryCard
                    key={history.id}
                    history={history}
                    onConfirmPending={onConfirmPending}
                    hideMemberInfo={allIds.length === 1}
                    dotColour={colourOf[String(history.member_id)]}
                  />
                ))}
              </div>
              {rows.length > shown && (
                <Button variant="ghost" fullWidth className="mt-3" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                  Show more
                </Button>
              )}
            </>
          )}
        </>
      )}

      <Dialog open={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Show" placement="bottom">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">People</p>
            <ul className="flex flex-col" aria-label="People">
              {options.map((o) => {
                const checked = selected.includes(o.id);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => onToggle(o.id)}
                      className="flex min-h-11 w-full cursor-pointer items-center gap-3 border-t border-border py-2 text-left touch-manipulation [-webkit-tap-highlight-color:transparent]"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: o.colour }}
                      />
                      <span className="min-w-0 flex-1 truncate font-body text-[15px] font-semibold text-foreground">
                        {o.name}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
                          checked ? "border-primary bg-primary text-primary-fg" : "border-border-strong",
                        )}
                      >
                        {checked && <Check size={16} strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Period</p>
            <div role="group" aria-label="Period" className="flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <Chip key={p.value} selected={period === p.value} onClick={() => onPeriod(p.value)}>
                  {p.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
