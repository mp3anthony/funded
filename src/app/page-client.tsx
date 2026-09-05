"use client";

import { useState } from "react";
import { useApp, useCurrentUser, type Bill, type Fund } from "@/context/AppContext";
import BillDetailSheet from "@/components/BillDetailSheet";
import AddBillSheet from "@/components/AddBillSheet";
import GoalDetailSheet from "@/components/GoalDetailSheet";
import EditGoalSheet from "@/components/EditGoalSheet";
import PageHeader from "@/components/PageHeader";

// New premium components
import HealthScoreCard from "@/components/HealthScoreCard";
import UpcomingBillsCard from "@/components/UpcomingBillsCard";
import ActiveGoalsCard from "@/components/ActiveGoalsCard";


export default function HomeClient() {
  const {
    bills,
    funds,
    payHistory,
    billSplits,
    members: householdMembers,
    deleteBill,
    deleteGoal,
  } = useApp();
  const currentUser = useCurrentUser();

  /* ── Local UI States for Sheets ──────────────── */
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [selectedGoal, setSelectedGoal] = useState<Fund | null>(null);
  const [isGoalDetailOpen, setIsGoalDetailOpen] = useState(false);
  const [isGoalEditOpen, setIsGoalEditOpen] = useState(false);

  /* ── Sheet Deletion Handlers ─────────────────── */
  const handleDeleteBill = async () => {
    if (selectedBill && confirm(`Are you sure you want to delete "${selectedBill.name}"?`)) {
      try {
        await deleteBill(selectedBill.id);
        setIsDetailOpen(false);
        setSelectedBill(null);
      } catch (err: any) {
        alert("Failed to delete bill: " + (err?.message || "Unknown error"));
      }
    }
  };

  const handleDeleteGoal = async () => {
    if (selectedGoal && confirm(`Are you sure you want to delete "${selectedGoal.name}"?`)) {
      try {
        await deleteGoal(selectedGoal.id);
        setIsGoalDetailOpen(false);
        setSelectedGoal(null);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        alert("Failed to delete goal: " + errMsg);
      }
    }
  };

  return (
    <div className="flex-1 w-full max-w-2xl lg:max-w-4xl mx-auto px-6 pt-4 pb-10">
      <PageHeader title="Dashboard" />

      {/* Editorial sections */}
      <div className="space-y-9 pt-2">
        {/* Health Score — page anchor */}
        <HealthScoreCard />

        {/* Bills & Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-9 lg:gap-8">
          <div className="lg:col-span-2">
            <UpcomingBillsCard
              bills={bills}
              onBillClick={(bill) => {
                setSelectedBill(bill);
                setIsDetailOpen(true);
              }}
            />
          </div>
          <div className="lg:col-span-1">
            <ActiveGoalsCard
              funds={funds}
              onGoalClick={(goal) => {
                setSelectedGoal(goal);
                setIsGoalDetailOpen(true);
              }}
            />
          </div>
        </div>


      </div>

      {/* Bill Detail Sheet */}
      <BillDetailSheet
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedBill(null);
        }}
        bill={selectedBill}
        splits={
          selectedBill
            ? billSplits.filter((s) => String(s.bill_id) === String(selectedBill.id))
            : []
        }
        householdMembers={householdMembers}
        onEdit={() => {
          setIsDetailOpen(false);
          setIsEditOpen(true);
        }}
        onDelete={handleDeleteBill}
      />

      {/* Edit Bill Sheet */}
      <AddBillSheet
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedBill(null);
        }}
        existingBill={selectedBill || undefined}
        existingSplits={
          selectedBill
            ? billSplits.filter((s) => String(s.bill_id) === String(selectedBill.id))
            : []
        }
      />

      {/* Goal Detail Sheet — keyed so it genuinely remounts per open (the
          component itself is always mounted here; only its internal
          isOpen/goal check hides it), including reopening the same goal. */}
      <GoalDetailSheet
        key={isGoalDetailOpen ? `open-${selectedGoal?.id ?? "none"}` : "closed"}
        isOpen={isGoalDetailOpen}
        onClose={() => {
          setIsGoalDetailOpen(false);
          setSelectedGoal(null);
        }}
        goal={selectedGoal}
        onEdit={() => {
          setIsGoalDetailOpen(false);
          setIsGoalEditOpen(true);
        }}
        onDelete={handleDeleteGoal}
      />

      {/* Edit Goal Sheet */}
      <EditGoalSheet
        isOpen={isGoalEditOpen}
        onClose={() => {
          setIsGoalEditOpen(false);
          setSelectedGoal(null);
        }}
        existingGoal={selectedGoal}
      />
    </div>
  );
}
