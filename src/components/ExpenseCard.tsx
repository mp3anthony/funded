"use client";

import React from "react";
import { useApp, type Expense, type Member } from "@/context/AppContext";
import RowPill from "./RowPill";
import { convertAmount } from "@/lib/utils";

export interface ExpenseCardProps {
  expense: Expense;
  householdMembers: Member[];
  /** R15: amounts follow the Bills frequency pills so rows add up to the totals. */
  displayFrequency?: "weekly" | "fortnightly" | "monthly" | "yearly";
  /** Opens the detail sheet, which the Bills page owns (F10, #438). */
  onOpen: () => void;
}

/**
 * Issue #98 (Slice 2 of 6): expense row — mirrors BillCard's hairline-row
 * layout, minus the due-date/urgency treatment (expenses have no due date).
 * Renders inline in the same category-grouped, A-to-Z list as bill
 * rows on /bills; the "Expense" pill is the only visual cue distinguishing
 * it from a bill row (fix-round: unify bills/expenses into one list).
 */
export default function ExpenseCard({
  expense,
  householdMembers,
  displayFrequency = "weekly",
  onOpen,
}: ExpenseCardProps) {
  const { expenseSplits } = useApp();

  const assignee = householdMembers.find((m) => String(m.id) === String(expense.assignee_id));

  // Issue #98 (Slice 3 of 6): percentage-split summary, e.g. "Alice 60% / Bob 40%".
  const isPercentageSplit = expense.split_mode === "percentage";
  const splits = isPercentageSplit
    ? expenseSplits.filter((s) => String(s.expense_id) === String(expense.id))
    : [];
  const splitSummary = splits
    .map((s) => {
      const member = householdMembers.find((m) => String(m.id) === String(s.member_id));
      return `${member?.name || "Unknown"} ${s.percentage}%`;
    })
    .join(" / ");

  // Expenses have no frequency column: the stored amount is weekly (R15, same as the totals).
  const formattedAmount = convertAmount(Number(expense.amount), "weekly", displayFrequency).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <>
      <div className="flex items-center gap-1 border-t border-border">
        <button
          type="button"
          onClick={onOpen}
          className="press-tint flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
        >
          {/* Leading identity cue: single assignee chip for whole-item
              assignment (matches BillCard), or a small overlapping avatar
              stack for a percentage split — no single member "is" the
              assignee, so a single chip would misrepresent it. */}
          {!isPercentageSplit && assignee && (
            <div
              className="shrink-0 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-elevated text-[11px] font-bold text-foreground border border-primary"
              aria-hidden="true"
            >
              {assignee.avatar_url ? (
                <img
                  src={assignee.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                assignee.avatar || assignee.name.charAt(0).toUpperCase()
              )}
            </div>
          )}
          {isPercentageSplit && splits.length > 0 && (
            <div className="shrink-0 flex items-center" aria-hidden="true">
              {splits.map((s, i) => {
                const member = householdMembers.find((m) => String(m.id) === String(s.member_id));
                return (
                  <div
                    key={s.id}
                    className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-elevated text-[11px] font-bold text-foreground border border-primary"
                    style={i > 0 ? { marginLeft: "-8px" } : undefined}
                  >
                    {member?.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      member?.avatar || member?.name.charAt(0).toUpperCase() || "?"
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Middle: name over category, or the split summary in place of
              category when split_mode is "percentage" (Issue #98 Slice 3 of 6) */}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-body font-semibold text-[15px] text-foreground truncate">
              {expense.name}
            </span>
            <span className="flex items-center gap-1.5 mt-0.5">
              <RowPill label="Expense" variant="accent" />
              <span className="text-[10px] uppercase font-medium tracking-wider text-muted truncate">
                {isPercentageSplit && splitSummary ? splitSummary : (expense.category || "Other")}
              </span>
            </span>
          </div>

          {/* Read once: the visible amount below is a decorative tap target. */}
          <span className="sr-only">${formattedAmount}</span>
        </button>

        {/* Empty 44px slot where bills keep their tick, so amounts line up with bill rows. */}
        <span className="h-11 w-11 shrink-0" aria-hidden="true" />

        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={onOpen}
          className="press-tint inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-end rounded-sm pl-1 text-lg font-semibold tracking-tight tabular-nums whitespace-nowrap text-foreground"
        >
          ${formattedAmount}
        </button>
      </div>
    </>
  );
}
