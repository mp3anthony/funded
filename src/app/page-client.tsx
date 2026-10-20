"use client";

import { useState } from "react";
import { useApp, useCurrentUser } from "@/context/AppContext";
import BillDetailSheet from "@/components/BillDetailSheet";
import GoalDetailSheet from "@/components/GoalDetailSheet";
import PageHeader from "@/components/PageHeader";

// New premium components
import FinishSetupCard from "@/components/FinishSetupCard";
import HealthScoreCard from "@/components/HealthScoreCard";
import UpcomingBillsCard from "@/components/UpcomingBillsCard";
import ActiveGoalsCard from "@/components/ActiveGoalsCard";
import DashboardTipsTicker from "@/components/DashboardTipsTicker";


export default function HomeClient() {
  const {
    bills,
    funds,
    payHistory,
    billSplits,
    members: householdMembers,
    isUpdatesCardVisible,
  } = useApp();
  const currentUser = useCurrentUser();

  /* ── Local UI States for Sheets ──────────────── */
  // R10: keep the id and look the bill up each render, so the sheet follows every
  // save and closes by itself if the bill is deleted.
  const [selectedBillId, setSelectedBillId] = useState<string | number | null>(null);
  const selectedBill =
    selectedBillId === null ? null : (bills.find((b) => String(b.id) === String(selectedBillId)) ?? null);

  // R11: same for goals.
  const [selectedGoalId, setSelectedGoalId] = useState<string | number | null>(null);
  const selectedGoal =
    selectedGoalId === null ? null : (funds.find((f) => String(f.id) === String(selectedGoalId)) ?? null);

  /* ── Tips ticker trigger (#151) — reappears fixed to the bottom of the
     viewport only once both Upcoming Bills and Savings Goals are minimised.
     Starts `null` ("not yet known") rather than defaulting to minimised, so
     the ticker can't flash visible for a returning user whose stored
     preference turns out to be "expanded" before each card's own
     localStorage read resolves. */
  const [isBillsMinimised, setIsBillsMinimised] = useState<boolean | null>(null);
  const [isGoalsMinimised, setIsGoalsMinimised] = useState<boolean | null>(null);
  const bothCardsMinimised = isBillsMinimised === true && isGoalsMinimised === true;

  return (
    <div className="flex-1 w-full max-w-2xl lg:max-w-4xl mx-auto px-6 pt-4 pb-10">
      <PageHeader title="Dashboard" />

      {/* Editorial sections */}
      <div className="space-y-9 pt-2">
        <FinishSetupCard />

        {/* Health Score — page anchor */}
        <HealthScoreCard />

        {/* Bills & Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-9 lg:gap-8">
          <div className="lg:col-span-2">
            <UpcomingBillsCard
              bills={bills}
              onBillClick={(bill) => setSelectedBillId(bill.id)}
              onMinimisedChange={setIsBillsMinimised}
            />
          </div>
          <div className="lg:col-span-1">
            <ActiveGoalsCard
              funds={funds}
              onGoalClick={(goal) => setSelectedGoalId(goal.id)}
              onMinimisedChange={setIsGoalsMinimised}
            />
          </div>
        </div>


      </div>

      {/* Tips ticker (#151) — fixed to the viewport, only when both cards
          above are minimised. Rendered outside the scrolling content div
          (like BottomNav in AppShell) so its fixed positioning is against
          the viewport, not this page's own layout box. */}
      <DashboardTipsTicker active={bothCardsMinimised && !isUpdatesCardVisible} />

      {/* Bill Detail Sheet */}
      <BillDetailSheet
        isOpen={selectedBill !== null}
        onClose={() => setSelectedBillId(null)}
        bill={selectedBill}
        splits={
          selectedBill
            ? billSplits.filter((s) => String(s.bill_id) === String(selectedBill.id))
            : []
        }
        householdMembers={householdMembers}
      />

      {/* Goal Detail Sheet — keyed so it genuinely remounts per open (the
          component itself is always mounted here; only its internal
          isOpen/goal check hides it), including reopening the same goal. */}
      <GoalDetailSheet
        key={selectedGoal ? `open-${selectedGoal.id}` : "closed"}
        isOpen={selectedGoal !== null}
        onClose={() => setSelectedGoalId(null)}
        goal={selectedGoal}
      />
    </div>
  );
}
