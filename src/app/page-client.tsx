"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import BillDetailSheet from "@/components/BillDetailSheet";
import GoalDetailSheet from "@/components/GoalDetailSheet";
import PageHeader from "@/components/PageHeader";
import { useVerdict } from "@/hooks/useVerdict";
import { useFinishSetup } from "@/hooks/useFinishSetup";

// New premium components
import FinishSetupCard from "@/components/FinishSetupCard";
import DashboardBills from "@/components/DashboardBills";
import DashboardGoals from "@/components/DashboardGoals";
import DashboardTipStrip from "@/components/DashboardTipStrip";
import DashboardStats from "@/components/DashboardStats";


// R25: the verdict's status dot. Lime = covered, red = short, grey = nothing to compare yet.
const DOT = {
  ok: { className: "bg-primary", glow: "#c8ff00" },
  bad: { className: "bg-destructive", glow: "#ff3d57" },
  neutral: { className: "bg-subtle", glow: "#8a8a8a" },
} as const;

export default function HomeClient() {
  const {
    bills,
    funds,
    billSplits,
    members: householdMembers,
  } = useApp();
  const verdict = useVerdict();
  const dot = DOT[verdict.tone];
  // R26: the stats slot shows the Finish setting up card while setup is unfinished.
  const finishSetup = useFinishSetup().state;

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

  return (
    <div className="flex-1 w-full max-w-2xl lg:max-w-4xl mx-auto px-6 pt-4 pb-10">
      <DashboardTipStrip />

      <PageHeader
        title={verdict.headline}
        srTitle="Dashboard"
        subtitle={verdict.detail}
        leading={
          <span
            aria-hidden="true"
            className={`h-3 w-3 shrink-0 rounded-full ${dot.className} transition-colors duration-(--duration-structural) ease-(--ease-enter)`}
            style={{ boxShadow: `0 0 12px ${dot.glow}A6` }}
          />
        }
      />

      {/* Editorial sections */}
      <div className="space-y-9 pt-2">
        {/* One slot: the card while an owner has setup left, else the stats.
            Renders nothing until the dismissed flag loads, so stats never flash first. */}
        {finishSetup === "card" ? <FinishSetupCard /> : finishSetup === "none" ? <DashboardStats /> : null}

        {/* Bills and Goals: swipe-only carousels (R27, #414) */}
        <div className="space-y-6">
          <DashboardBills onBillClick={(bill) => setSelectedBillId(bill.id)} />
          <DashboardGoals onGoalClick={(goal) => setSelectedGoalId(goal.id)} />
        </div>
      </div>

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
