"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Trash2, CheckCircle2, Clock, ChevronDown } from "lucide-react";
import { useApp, useCurrentUser, type PaySchedule, type PayHistory } from "@/context/AppContext";
import AddPayFlow from "@/components/AddPayFlow";
import EnterPayAmountModal from "@/components/EnterPayAmountModal";
import PayHistoryCard from "@/components/PayHistoryCard";
import SurplusSuggestionModal from "@/components/SurplusSuggestionModal";
import PayScheduleDetailSheet from "@/components/PayScheduleDetailSheet";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { hasPaydayLinkParams, resolvePaydayLink, stripPaydayLinkParams } from "@/lib/notifications/paydayLink";
import { hasAddSheetParam, stripAddSheetParam } from "@/lib/finishSetup";
import { useRowHighlight } from "@/hooks/useRowHighlight";
import { payScheduleRowKey } from "@/lib/addPayFlow";
import { savingGoals } from "@/lib/goalPace";

export default function PaydayClient() {
  const { paySchedules, payHistory, householdMembers, deletePaySchedule, logPay, calculateAveragePay, addToGoal, isJointFund, householdContributions, checkAndApplyRules, applyRuleAllocation, funds, autoLogMissedPays, confirmAndUpdatePay } = useApp();
  const currentUser = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const { highlightKey, flash } = useRowHighlight();
  const [activeVariableSchedule, setActiveVariableSchedule] = useState<PaySchedule | null>(null);
  // R11: keep the id and look the schedule up each render, so the sheet follows every save and closes by itself if it is deleted.
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const selectedSchedule = selectedScheduleId === null ? null : (paySchedules.find((s) => String(s.id) === selectedScheduleId) ?? null);
  const [surplusInfo, setSurplusInfo] = useState<{
    memberId: string;
    newPayAmount: number;
    surplusAmount: number;
  } | null>(null);
  const [pendingHistoryToConfirm, setPendingHistoryToConfirm] = useState<PayHistory | null>(null);

  const [minimizedMembers, setMinimizedMembers] = useState<Record<string, boolean>>({});
  const [selectedContributor, setSelectedContributor] = useState<string>("All");

  const toggleMemberHistory = (memberId: string) => {
    setMinimizedMembers(prev => ({ ...prev, [memberId]: !(prev[memberId] ?? true) }));
  };

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-log missed pays on mount / when schedules load.
  // `autoLogSettled` flips once the auto-log (and its refetch) has finished;
  // with no schedules there's nothing to auto-log, so the link handler below
  // is ready straight away (#182). It waits on this so a late tap sees the
  // freshly-created pending pay rather than the pre-auto-log state.
  const hasAutoLogged = useRef(false);
  const [autoLogSettled, setAutoLogSettled] = useState(false);
  useEffect(() => {
    if (paySchedules.length > 0 && !hasAutoLogged.current) {
      hasAutoLogged.current = true;
      autoLogMissedPays().finally(() => setAutoLogSettled(true));
    }
  }, [paySchedules]);
  const isLinkReady = isMounted && (autoLogSettled || paySchedules.length === 0);

  const today = isMounted ? new Date() : new Date("2026-07-05");
  today.setHours(0, 0, 0, 0);

  // Helper to determine if schedule is loggable (next_pay_date <= today)
  const isLoggable = (schedule: PaySchedule) => {
    const nextPay = new Date(schedule.next_pay_date + "T00:00:00");
    nextPay.setHours(0, 0, 0, 0);
    return nextPay.getTime() <= today.getTime();
  };

  // Notification-tap links (#182): open the Log Pay or Confirm box the link
  // points at, once per link. Runs post-mount (after auto-log), so `today`
  // is the real date, not the hydration placeholder above. The link params
  // are stripped as soon as they're used — not on close — so closing the
  // box never re-opens it; a no-match link just lands on plain Payday.
  const handledLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isLinkReady || !searchParams) return;
    if (!hasPaydayLinkParams(searchParams)) {
      // Reset so the same link tapped again later still works.
      handledLinkRef.current = null;
      return;
    }
    const linkKey = searchParams.toString();
    if (handledLinkRef.current === linkKey) return;
    handledLinkRef.current = linkKey;

    // Opening a box from the URL is a one-shot sync with an external input
    // (the tapped link), guarded by handledLinkRef — not a render cascade.
    const resolved = resolvePaydayLink(searchParams, paySchedules, payHistory, isLoggable);
    if (resolved.kind === "log") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveVariableSchedule(resolved.schedule);
    } else if (resolved.kind === "confirm") {
      setPendingHistoryToConfirm(resolved.history);
    }

    const rest = stripPaydayLinkParams(searchParams);
    router.replace(`${pathname}${rest ? `?${rest}` : ""}`, { scroll: false });
    // isLoggable is recreated every render; it only reads `today`, which is
    // stable once mounted, so it's deliberately left out of the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLinkReady, searchParams, paySchedules, payHistory, pathname, router]);

  // Finish setting up card (#333): /payday?add=1 opens the New pay schedule flow
  // once (no data wait needed), then the param is stripped. "add" is not one of
  // the notification link params, so the effect above leaves it alone.
  const handledAddRef = useRef(false);
  useEffect(() => {
    if (!searchParams) return;
    if (!hasAddSheetParam(searchParams)) {
      handledAddRef.current = false;
      return;
    }
    if (handledAddRef.current) return;
    handledAddRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAddScheduleOpen(true);
    const rest = stripAddSheetParam(searchParams);
    router.replace(`${pathname}${rest ? `?${rest}` : ""}`, { scroll: false });
  }, [searchParams, pathname, router]);

  // Helper for countdown
  const getCountdown = (schedule: PaySchedule) => {
    const nextPay = new Date(schedule.next_pay_date + "T00:00:00");
    nextPay.setHours(0, 0, 0, 0);
    const diffTime = nextPay.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return {
        text: "Ready to Log",
        color: "text-primary bg-primary/10 border-primary/20",
        icon: CheckCircle2,
      };
    } else {
      return {
        text: `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`,
        color: "text-muted bg-white/5 border-border-strong",
        icon: Clock,
      };
    }
  };

  // Delete handler
  const handleDeleteSchedule = async (schedule: PaySchedule) => {
    const memberName = householdMembers.find((m) => String(m.id) === String(schedule.member_id))?.name || "Member";
    if (confirm(`Delete payday schedule for ${memberName}? Any logged history will be preserved.`)) {
      try {
        await deletePaySchedule(schedule.id);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        alert("Failed to delete payday schedule: " + errMsg);
      }
    }
  };

  // Unified pay handler — both fixed and variable go through the modal
  const handleConfirmPay = async (amount: number, notes: string | null) => {
    if (activeVariableSchedule) {
      const memberId = activeVariableSchedule.member_id;
      const avg = calculateAveragePay(memberId);

      const logDate = new Date().toISOString().split("T")[0];
      const newHistory = await logPay(activeVariableSchedule.id, amount, logDate, notes || "Pay logged");

      if (newHistory) {
        // Trigger rules checking
        const triggered = checkAndApplyRules(memberId, amount);
        for (const rule of triggered) {
          await applyRuleAllocation(rule, newHistory.id);

          let targetName = "contribution";
          if (rule.action_type === "goal") {
            const goal = funds.find((g) => String(g.id) === String(rule.action_target_id));
            targetName = goal ? goal.name : "goal";
          }
          alert(`Rule triggered: Added $${rule.amount_to_add.toFixed(2)} to ${targetName}`);
        }
      }

      // Skip the surplus popup when the household has no goals to add it to (#215).
      if (avg !== null && amount > avg * 1.10 && savingGoals(funds).length > 0) {
        const surplus = amount - avg;
        setSurplusInfo({
          memberId,
          newPayAmount: amount,
          surplusAmount: surplus,
        });
      }

      setActiveVariableSchedule(null);
    }
  };

  const handleAllocateSurplus = async (goalId: string, amount: number) => {
    try {
      await addToGoal(goalId, amount);
      alert(`Successfully allocated $${amount.toFixed(2)} to your savings goal!`);
    } catch (err) {
      console.error("Failed to allocate surplus to goal:", err);
      // addToGoal now throws: say so, rather than closing as if it worked (proper alerts come with R19+).
      alert("Couldn't add that to your goal: " + (err instanceof Error ? err.message : "Unknown error"));
    }
    setSurplusInfo(null);
  };

  // Handler when user clicks Confirm on a pending PayHistoryCard
  const handleConfirmPendingClick = (history: PayHistory) => {
    setPendingHistoryToConfirm(history);
  };

  // Handler when user submits the confirm-pending modal
  const handleConfirmPendingSubmit = async (amount: number, notes: string | null) => {
    if (!pendingHistoryToConfirm) return;
    await confirmAndUpdatePay(pendingHistoryToConfirm.id, amount, notes);
    setPendingHistoryToConfirm(null);
  };

  // Filter FIRST (by selected contributor), then cap at 10, then group by member.
  const groupedHistory = React.useMemo(() => {
    const source = selectedContributor === "All"
      ? payHistory
      : payHistory.filter((h) => String(h.member_id) === String(selectedContributor));
    const limited = source.slice(0, 10);
    const groups: Record<string, PayHistory[]> = {};
    limited.forEach((history) => {
      const id = String(history.member_id);
      if (!groups[id]) {
        groups[id] = [];
      }
      groups[id].push(history);
    });
    return groups;
  }, [payHistory, selectedContributor]);

  // Dropdown options derived from the FULL payHistory (not the capped/grouped view).
  const contributorOptions = React.useMemo(() => {
    const uniqueIds = Array.from(new Set(payHistory.map((h) => String(h.member_id))));
    return uniqueIds
      .map((id) => householdMembers.find((m) => String(m.id) === id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [payHistory, householdMembers]);

  const visibleGroups = Object.entries(groupedHistory);
  const isEmpty = visibleGroups.length === 0;

  // Explicit, hydration-safe ordering for the unified Upcoming Pays card.
  // Primary: next_pay_date ascending (YYYY-MM-DD string compare = chronological).
  // Tie-break: member name ascending.
  const sortedSchedules = React.useMemo(() => {
    return [...paySchedules].sort((a, b) => {
      const dateCompare = a.next_pay_date.localeCompare(b.next_pay_date);
      if (dateCompare !== 0) return dateCompare;
      const aName = householdMembers.find((m) => String(m.id) === String(a.member_id))?.name || "";
      const bName = householdMembers.find((m) => String(m.id) === String(b.member_id))?.name || "";
      return aName.localeCompare(bName);
    });
  }, [paySchedules, householdMembers]);

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 pt-4 pb-24 sm:px-6 md:pt-6 space-y-8">
      <PageHeader
        title="Payday"
        subtitle="Manage & track incomes"
        onAdd={() => setIsAddScheduleOpen(true)}
        addLabel="New pay schedule"
      />

      {/* Upcoming Pays */}
      <div>
        <SectionHeader title="Upcoming Pays" count={paySchedules.length} />

        {paySchedules.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-muted text-sm">No pay schedules active.</p>
            <p className="text-subtle text-xs mt-1 font-body">
              Tap + beside the page title to add your next payday.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {sortedSchedules.map((schedule) => {
              const member = householdMembers.find((m) => String(m.id) === String(schedule.member_id));
              const memberName = member ? member.name : "Unknown Member";
              const countdown = getCountdown(schedule);
              const isReady = isLoggable(schedule);

              const formattedAmount = schedule.is_fixed_amount && schedule.amount
                ? `$${Number(schedule.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                : "Variable";

              const CountdownIcon = countdown.icon;

              return (
                <div
                  key={schedule.id}
                  id={payScheduleRowKey(schedule.id)}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedScheduleId(String(schedule.id));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedScheduleId(String(schedule.id));
                    }
                  }}
                  className="border-t border-border hover:bg-surface/40 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded-sm"
                >
                  {/* Inner wrapper: the add highlight sits here, the outer div keeps the row id. */}
                  <div className={highlightKey === payScheduleRowKey(schedule.id) ? "row-highlight" : undefined}>
                  {/* Info row: name/amount + freq/countdown · delete */}
                  <div className="flex items-center gap-3 py-3">
                    {/* Middle: name+amount over frequency+countdown */}
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-body font-semibold text-[15px] text-foreground truncate">
                          {memberName}
                        </h3>
                        <span className={`shrink-0 font-bold tracking-tight text-lg ${schedule.is_fixed_amount ? "text-primary" : "text-muted"}`}>
                          {formattedAmount}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="min-w-0 truncate text-[10px] uppercase tracking-wider text-muted">
                          {schedule.frequency}
                        </span>
                        <span className={`flex items-center gap-1 shrink-0 text-[10px] uppercase font-semibold tracking-wider ${isReady ? "text-primary" : "text-muted"}`}>
                          <CountdownIcon size={11} className="shrink-0" />
                          {countdown.text}
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSchedule(schedule);
                      }}
                      className="shrink-0 p-1.5 text-muted hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete Schedule"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Log-Pay CTA — only shown when pay is due */}
                  {isReady && (
                    <div className="pb-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveVariableSchedule(schedule);
                        }}
                        className="w-full py-2.5 rounded-xl text-xs font-bold uppercase bg-primary text-primary-fg hover:brightness-110 active:scale-[0.98] cursor-pointer transition-all"
                      >
                        {schedule.is_fixed_amount ? "Log Pay" : "Enter Pay Amount"}
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Pay History */}
      <div>
        <SectionHeader title="Recent Pay History" />

        {payHistory.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-muted text-sm">No history logged yet.</p>
            <p className="text-subtle text-xs mt-1 font-body">
              Logged payday transactions will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Contributor filter — hairline underline select */}
            <div className="px-1 mb-4 max-w-xs">
              <div className="space-y-1.5">
                <label htmlFor="contributor-filter" className="text-[10px] font-bold text-muted uppercase tracking-wider ml-1">
                  Contributor
                </label>
                <div className="relative">
                  <select
                    id="contributor-filter"
                    value={selectedContributor}
                    onChange={(e) => setSelectedContributor(e.target.value)}
                    className="w-full border-b border-border bg-transparent px-1 py-1.5 text-[11px] font-semibold text-foreground focus:border-primary focus:outline-none appearance-none cursor-pointer pr-5"
                  >
                    <option value="All">All Contributors</option>
                    {contributorOptions.map((m) => (
                      <option key={String(m.id)} value={String(m.id)}>{m.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-muted">
                    <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {isEmpty && selectedContributor !== "All" ? (
              <div className="py-10 text-center">
                <p className="text-muted text-sm">
                  No pays logged for {householdMembers.find((m) => String(m.id) === String(selectedContributor))?.name || "this contributor"} yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {visibleGroups.map(([memberId, histories]) => {
                  const member = householdMembers.find((m) => String(m.id) === String(memberId));
                  const memberName = member ? member.name : "Unknown Member";
                  // True means collapsed (minimized). Defaults to collapsed; force-expanded when filtered to one member.
                  const isMinimized = selectedContributor === "All" ? (minimizedMembers[memberId] ?? true) : false;

                  // Editorial subsection header: 13px label + count + lime fade-rule.
                  const headerInner = (
                    <>
                      <span className="font-bold text-[13px] text-foreground shrink-0 group-hover:text-primary transition-colors">
                        {memberName}&apos;s History
                      </span>
                      <span className="text-[11px] font-semibold text-subtle shrink-0">
                        ({histories.length})
                      </span>
                      <span
                        className="h-0.5 flex-1 rounded-sm"
                        style={{ background: "linear-gradient(90deg, var(--color-primary), transparent)" }}
                      />
                    </>
                  );

                  return (
                    <div key={memberId} className="flex flex-col">
                      {selectedContributor === "All" ? (
                        <button
                          onClick={() => toggleMemberHistory(memberId)}
                          className="group flex items-center gap-3 w-full text-left px-1 focus:outline-none"
                        >
                          {headerInner}
                          <ChevronDown
                            className="h-4 w-4 text-subtle group-hover:text-foreground transition-transform duration-(--duration-structural) ease-(--ease-enter) shrink-0"
                            style={{ transform: isMinimized ? "rotate(0deg)" : "rotate(180deg)" }}
                          />
                        </button>
                      ) : (
                        <div className="group flex items-center gap-3 w-full px-1">
                          {headerInner}
                        </div>
                      )}

                      {/* Content — expand/collapse via grid-template-rows
                          (Slice 99), matching the dashboard's collapsible
                          sections (HealthScoreCard/ActiveGoalsCard) so it
                          grows/shrinks smoothly instead of popping in and
                          out of the layout. */}
                      <div
                        className="grid transition-[grid-template-rows] duration-(--duration-structural) ease-(--ease-enter)"
                        style={{ gridTemplateRows: isMinimized ? "0fr" : "1fr" }}
                      >
                        <div
                          className="overflow-hidden min-h-0"
                          aria-hidden={isMinimized}
                          inert={isMinimized ? true : undefined}
                        >
                          <div className="flex flex-col mt-1">
                            {histories.map((history) => (
                              <PayHistoryCard
                                key={history.id}
                                history={history}
                                onConfirmPending={handleConfirmPendingClick}
                                hideMemberInfo={true}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* New pay schedule flow */}
      <AddPayFlow
        open={isAddScheduleOpen}
        onClose={() => setIsAddScheduleOpen(false)}
        onAdded={(id) => flash(payScheduleRowKey(id))}
      />

      {/* Pay Schedule Detail Sheet (edits one field at a time) */}
      <PayScheduleDetailSheet
        isOpen={selectedSchedule !== null}
        onClose={() => setSelectedScheduleId(null)}
        paySchedule={selectedSchedule}
        householdMembers={householdMembers}
      />

      {/* Unified Pay Log Modal (for both fixed & variable) */}
      <EnterPayAmountModal
        isOpen={activeVariableSchedule !== null}
        onClose={() => setActiveVariableSchedule(null)}
        schedule={activeVariableSchedule}
        onConfirm={handleConfirmPay}
      />

      {/* Surplus Allocation Suggestion Modal */}
      <SurplusSuggestionModal
        isOpen={surplusInfo !== null}
        onClose={() => setSurplusInfo(null)}
        memberId={surplusInfo?.memberId || ""}
        newPayAmount={surplusInfo?.newPayAmount || 0}
        surplusAmount={surplusInfo?.surplusAmount || 0}
        onAllocate={handleAllocateSurplus}
      />

      {/* Confirm Pending Pay Modal */}
      {pendingHistoryToConfirm && (() => {
        // Build a synthetic schedule so the modal can render
        const pendingSchedule = paySchedules.find(
          (s) => s.id === pendingHistoryToConfirm.pay_schedule_id
        ) || {
          id: pendingHistoryToConfirm.pay_schedule_id || "pending",
          household_id: "",
          member_id: pendingHistoryToConfirm.member_id,
          amount: pendingHistoryToConfirm.amount || null,
          frequency: "monthly" as const,
          is_fixed_amount: false,
          next_pay_date: pendingHistoryToConfirm.pay_date,
          created_at: "",
        };
        return (
          <EnterPayAmountModal
            isOpen={true}
            onClose={() => setPendingHistoryToConfirm(null)}
            schedule={pendingSchedule}
            onConfirm={handleConfirmPendingSubmit}
            title="Confirm Pending Pay"
            submitLabel="Confirm & Save"
            initialAmount={pendingHistoryToConfirm.amount || null}
            initialNotes={pendingHistoryToConfirm.notes}
          />
        );
      })()}
    </div>
  );
}
