"use client";

import React from "react";

/**
 * Issue #98 (Slice 2 of 6, cosmetic fix-round): the bill-vs-expense choice
 * shown at the top of the add-item form (AddBillSheet / AddExpenseSheet).
 * Rounded sliding-thumb switch pattern used for boolean settings in
 * NotificationCenter.tsx (checkbox + peer-checked track/thumb). Left-aligned,
 * switch under a static field-label naming the control (matches the
 * font-heading/text-subtle field-label convention used elsewhere in these
 * sheets, e.g. "Bill Name" / "Category"), with a small action-framed caption
 * underneath naming the OTHER state — what flipping the switch does, not
 * what it currently is — per client feedback that the control's purpose
 * wasn't obvious.
 */
interface ItemTypeToggleProps {
  value: "bill" | "expense";
  onChange: (value: "bill" | "expense") => void;
}

export default function ItemTypeToggle({ value, onChange }: ItemTypeToggleProps) {
  const isExpense = value === "expense";
  const otherLabel = isExpense ? "Bill" : "Expense";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="font-heading text-sm font-semibold text-subtle uppercase tracking-wider">
        Item Type
      </span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isExpense}
          onChange={() => onChange(isExpense ? "bill" : "expense")}
          aria-label={`Switch to ${otherLabel}`}
        />
        <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
      <span className="text-[10px] text-muted uppercase tracking-wider font-bold">
        Switch to {otherLabel}
      </span>
    </div>
  );
}
