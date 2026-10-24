"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useApp, useCurrentUser, type PaySchedule, type PayHistory } from "@/context/AppContext";
import AddPayFlow from "@/components/AddPayFlow";
import Carousel from "@/components/ui/Carousel";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import MemberPayCard from "@/components/MemberPayCard";
import MemberPaySheet from "@/components/MemberPaySheet";
import SuggestSplitPanel from "@/components/SuggestSplitPanel";
import LogPayCard, { type LogTarget } from "@/components/LogPayCard";
import NeedsYouStrip from "@/components/NeedsYouStrip";
import PayHistorySection from "@/components/PayHistorySection";
import SurplusSuggestionModal from "@/components/SurplusSuggestionModal";
import PayScheduleDetailSheet from "@/components/PayScheduleDetailSheet";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import { hasPaydayLinkParams, resolvePaydayLink, stripPaydayLinkParams } from "@/lib/notifications/paydayLink";
import { hasAddSheetParam, stripAddSheetParam } from "@/lib/finishSetup";
import { useRowHighlight } from "@/hooks/useRowHighlight";
import { canPickMember } from "@/lib/addPayFlow";
import { isAcceptedMember } from "@/lib/householdLeave";
import { memberCardKey, memberCards } from "@/lib/paydayCards";
import { savingGoals } from "@/lib/goalPace";
import { todayInZone } from "@/lib/notifications/timezone";
import { buildNeedsYou, isLoggableYmd, type NeedsYouRow } from "@/lib/needsYou";

export default function PaydayClient() {
  const { paySchedules, payHistory, householdMembers, logPay, calculateAveragePay, addToGoal, isJointFund, bills, expenses, contributionRules, setContribution, checkAndApplyRules, applyRuleAllocation, funds, autoLogMissedPays, confirmAndUpdatePay, skipDuePay, skipPendingPay, householdTimezone, showToast } = useApp();
  const currentUser = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  // Whose pay the New pay schedule flow starts on ("" = ask). Kept after the flow closes so it never flips mid-animation.
  const [addForMember, setAddForMember] = useState("");
  const { highlightKey, flash } = useRowHighlight();
  // The member whose sheet is open, and the schedule that was just added (its card switches to that tab).
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const [newScheduleId, setNewScheduleId] = useState<string | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  // The one Log / Confirm Pay card: a due pay to log or a Pending pay to confirm (R20, #407).
  const [logTarget, setLogTarget] = useState<LogTarget | null>(null);
  // R11: keep the id and look the schedule up each render, so the sheet follows every save and closes by itself if it is deleted.
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const selectedSchedule = selectedScheduleId === null ? null : (paySchedules.find((s) => String(s.id) === selectedScheduleId) ?? null);
  const [surplusInfo, setSurplusInfo] = useState<{
    memberId: string;
    newPayAmount: number;
    surplusAmount: number;
  } | null>(null);

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

  // Household-local day, the same one the reminders and auto-log use. Blank until mounted, so nothing flashes at hydration.
  const todayYmd = isMounted ? todayInZone(householdTimezone || "Australia/Sydney") : "";

  // A schedule is loggable once its pay date has come (next_pay_date <= today).
  const isLoggable = (schedule: PaySchedule) => isLoggableYmd(schedule.next_pay_date, todayYmd);

  const openAddSchedule = (memberId = "") => {
    setAddForMember(memberId);
    setIsAddScheduleOpen(true);
  };

  const memberNameOf = (memberId: string) =>
    householdMembers.find((m) => String(m.id) === String(memberId))?.name ?? "Unknown Member";

  const needsYouRows = React.useMemo(
    () =>
      buildNeedsYou({
        schedules: paySchedules,
        history: payHistory,
        todayYmd,
        memberName: (id) => householdMembers.find((m) => String(m.id) === String(id))?.name ?? "",
      }),
    [paySchedules, payHistory, todayYmd, householdMembers],
  );

  const openNeedsYou = (row: NeedsYouRow) => {
    if (row.kind === "confirm") {
      const history = payHistory.find((h) => String(h.id) === row.historyId);
      if (history) setLogTarget({ kind: "confirm", history });
    } else {
      const schedule = paySchedules.find((s) => String(s.id) === row.scheduleId);
      if (schedule) setLogTarget({ kind: "log", schedule });
    }
  };

  // Notification-tap links (#182): open the Log Pay or Confirm box the link
  // points at, once per link. Runs post-mount (after auto-log), so `todayYmd`
  // is the real household day, not the blank pre-mount value above. The link params
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
      setLogTarget({ kind: "log", schedule: resolved.schedule });
    } else if (resolved.kind === "confirm") {
      setLogTarget({ kind: "confirm", history: resolved.history });
    }

    const rest = stripPaydayLinkParams(searchParams);
    router.replace(`${pathname}${rest ? `?${rest}` : ""}`, { scroll: false });
    // isLoggable is recreated every render; it only reads `todayYmd`, which is
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
    openAddSchedule();
    const rest = stripAddSheetParam(searchParams);
    router.replace(`${pathname}${rest ? `?${rest}` : ""}`, { scroll: false });
  }, [searchParams, pathname, router]);

  // Save from the Log / Confirm Pay card. Returns false (the card shows its red line) when the save fails.
  const handleSavePay = async (amount: number, notes: string | null): Promise<boolean> => {
    if (!logTarget) return false;

    if (logTarget.kind === "confirm") {
      // Throws on failure; the card shows the red line. Confirming a Pending pay does not run rules (see money.md).
      await confirmAndUpdatePay(logTarget.history.id, amount, notes);
      return true;
    }

    const schedule = logTarget.schedule;
    const memberId = schedule.member_id;
    // Average of this schedule's last confirmed pays, taken BEFORE this pay is logged (R19, #406).
    const avg = calculateAveragePay(String(schedule.id));

    // Household-local day, not UTC (an evening log in NZ used to get yesterday's date, #315).
    const logDate = todayInZone(householdTimezone || "Australia/Sydney");
    const newHistory = await logPay(schedule.id, amount, logDate, notes || "Pay logged");
    if (!newHistory) return false;

    // Rules run after the pay is saved; a rule failing must not make the card offer a second log.
    try {
      const triggered = checkAndApplyRules(memberId, amount);
      const parts: string[] = [];
      for (const rule of triggered) {
        await applyRuleAllocation(rule, newHistory.id);

        let targetName = "contribution";
        if (rule.action_type === "goal") {
          const goal = funds.find((g) => String(g.id) === String(rule.action_target_id));
          targetName = goal ? goal.name : "goal";
        }
        parts.push(`$${rule.amount_to_add.toFixed(2)} to ${targetName}`);
      }
      if (parts.length > 0) showToast({ message: `Rule triggered: Added ${parts.join(", ")}` });
    } catch (err) {
      console.error("Failed to apply rules after logging pay:", err);
      showToast({ message: "Pay logged, but a rule couldn't be applied." });
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
    return true;
  };

  // "Didn't get paid": a due pay moves on to its next date; a Pending pay is deleted (R20, #407).
  const handleSkipPay = async () => {
    if (!logTarget) return;
    if (logTarget.kind === "log") await skipDuePay(String(logTarget.schedule.id));
    else await skipPendingPay(String(logTarget.history.id));
  };

  const handleAllocateSurplus = async (goalId: string, amount: number) => {
    try {
      await addToGoal(goalId, amount);
      showToast({ message: `Added $${amount.toFixed(2)} to your goal` });
    } catch (err) {
      console.error("Failed to allocate surplus to goal:", err);
      showToast({ message: "Couldn't add that to your goal: " + (err instanceof Error ? err.message : "Unknown error") });
    }
    setSurplusInfo(null);
  };

  // The tick on a Pending history row opens the same card.
  const handleConfirmPendingClick = (history: PayHistory) => {
    setLogTarget({ kind: "confirm", history });
  };

  // One card per member (R21, #408). Accepted members, plus anyone who already has pay.
  const cards = React.useMemo(() => memberCards(householdMembers, paySchedules), [householdMembers, paySchedules]);
  const acceptedCount = householdMembers.filter(isAcceptedMember).length;
  const viewerCanPickMember = canPickMember(currentUser.isOwner, acceptedCount);

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 pt-4 pb-24 sm:px-6 md:pt-6 space-y-8">
      <PageHeader
        title="Payday"
        subtitle="Manage & track incomes"
        extra={
          // Joint Fund only until R23 makes the split work in Direct Pay.
          isJointFund ? (
            <Button variant="ghost" className="min-h-9 px-4 text-[15px]" onClick={() => setIsCompareOpen(true)}>
              Compare split
            </Button>
          ) : undefined
        }
        onAdd={() => openAddSchedule()}
        addLabel="New pay schedule"
      />

      {/* Needs you: pays due to log and Pending pays to confirm (R20, #407) */}
      <NeedsYouStrip rows={needsYouRows} memberName={memberNameOf} onOpen={openNeedsYou} />

      {/* One card per member: tap for their sheet (R21, #408) */}
      <div>
        <SectionHeader title="Upcoming pays" />

        {cards.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-muted text-sm">No pay schedules active.</p>
            <p className="text-subtle text-xs mt-1 font-body">
              Tap + beside the page title to add your next payday.
            </p>
          </div>
        ) : (
          <Carousel label="Pay by member" autoRotate peek={cards.length > 1} className="mt-2">
            {cards.map(({ member, schedules }) => (
              <MemberPayCard
                key={String(member.id)}
                member={member}
                schedules={schedules}
                todayYmd={todayYmd}
                averageOf={calculateAveragePay}
                highlighted={highlightKey === memberCardKey(member.id)}
                focusScheduleId={newScheduleId}
                canSetUp={viewerCanPickMember || String(member.id) === String(currentUser.id)}
                onOpen={() => setOpenMemberId(String(member.id))}
                onSetUp={() => openAddSchedule(String(member.id))}
              />
            ))}
          </Carousel>
        )}
      </div>

      {/* History: chart and list (R22, #409) */}
      <PayHistorySection todayYmd={todayYmd} onConfirmPending={handleConfirmPendingClick} />

      {/* A member's sheet (pay schedules, contribution, rules) */}
      <MemberPaySheet
        memberId={openMemberId}
        onClose={() => setOpenMemberId(null)}
        onOpenSchedule={(id) => setSelectedScheduleId(id)}
        onAddSchedule={(memberId) => openAddSchedule(memberId)}
        stackedOpen={selectedSchedule !== null || isAddScheduleOpen}
      />

      {/* New pay schedule flow */}
      <AddPayFlow
        open={isAddScheduleOpen}
        onClose={() => setIsAddScheduleOpen(false)}
        memberId={addForMember}
        onAdded={(id, memberId) => {
          setNewScheduleId(id);
          flash(memberCardKey(memberId));
        }}
      />

      {/* Pay Schedule Detail Sheet (edits one field at a time) */}
      <PayScheduleDetailSheet
        isOpen={selectedSchedule !== null}
        onClose={() => setSelectedScheduleId(null)}
        paySchedule={selectedSchedule}
        householdMembers={householdMembers}
      />

      {/* Compare split: the existing Suggest Split panel until R23 redesigns it */}
      <Dialog open={isCompareOpen} onClose={() => setIsCompareOpen(false)} title="Compare split" placement="bottom">
        <SuggestSplitPanel
          startExpanded
          householdMembers={householdMembers}
          bills={bills}
          expenses={expenses}
          contributionRules={contributionRules}
          paySchedules={paySchedules}
          calculateAveragePay={calculateAveragePay}
          setContribution={setContribution}
        />
      </Dialog>

      {/* Log / Confirm Pay card (due pays and Pending pays) */}
      <LogPayCard
        target={logTarget}
        onClose={() => setLogTarget(null)}
        onSave={handleSavePay}
        onSkip={handleSkipPay}
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
    </div>
  );
}
