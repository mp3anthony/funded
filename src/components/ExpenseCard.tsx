"use client";

import React, { useState } from "react";
import { useApp, type Expense, type Member } from "@/context/AppContext";
import ExpenseDetailSheet from "./ExpenseDetailSheet";
import AddExpenseSheet from "./AddExpenseSheet";

export interface ExpenseCardProps {
  expense: Expense;
  householdMembers: Member[];
}

/**
 * Issue #98 (Slice 2 of 6): expense row — mirrors BillCard's hairline-row
 * layout, minus the due-date/urgency treatment (expenses have no due date).
 */
export default function ExpenseCard({ expense, householdMembers }: ExpenseCardProps) {
  const { deleteExpense } = useApp();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const assignee = householdMembers.find((m) => String(m.id) === String(expense.assignee_id));

  const formattedAmount = Number(expense.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${expense.name}"?`)) {
      try {
        await deleteExpense(expense.id);
        setIsDetailOpen(false);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        alert("Failed to delete expense: " + errMsg);
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setIsDetailOpen(true)}
        className="w-full text-left border-t border-border flex items-center gap-3 py-3 group hover:bg-surface/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded-sm"
      >
        {/* Leading assignee chip — matches BillCard's identity cue */}
        {assignee && (
          <div
            className="shrink-0 flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-surface-elevated text-[11px] font-bold text-foreground border border-primary"
            title={`Assignee: ${assignee.name}`}
          >
            {assignee.avatar_url ? (
              <img
                src={assignee.avatar_url}
                alt={assignee.name}
                className="h-full w-full object-cover"
              />
            ) : (
              assignee.avatar || assignee.name.charAt(0).toUpperCase()
            )}
          </div>
        )}

        {/* Middle: name over category */}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-body font-semibold text-[15px] text-foreground truncate">
            {expense.name}
          </span>
          <span className="font-mono text-[10px] uppercase font-medium tracking-wider mt-0.5 text-muted">
            {expense.category || "Other"}
          </span>
        </div>

        {/* Right: amount over tap-for-more hint */}
        <div className="flex flex-col items-end shrink-0">
          <span className="font-mono font-extrabold text-primary tracking-tight text-lg">
            ${formattedAmount}
          </span>
          <span className="flex items-center gap-1 text-[9px] font-semibold text-muted/60 uppercase tracking-widest group-hover:text-primary transition-colors mt-0.5">
            Tap for more
            <span aria-hidden="true">›</span>
          </span>
        </div>
      </button>

      <ExpenseDetailSheet
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        expense={expense}
        householdMembers={householdMembers}
        onEdit={() => {
          setIsDetailOpen(false);
          setIsEditOpen(true);
        }}
        onDelete={handleDelete}
      />

      <AddExpenseSheet
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        existingExpense={expense}
      />
    </>
  );
}
