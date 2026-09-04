"use client";

import React from "react";

/**
 * Issue #98 (Slice 2 of 6, cosmetic fix-round): the bill-vs-expense choice
 * shown at the top of the add-item form (AddBillSheet / AddExpenseSheet).
 * Previously a two-button segmented control; replaced with the same
 * rounded sliding-thumb switch pattern used for boolean settings in
 * NotificationCenter.tsx (checkbox + peer-checked track/thumb), with both
 * state labels shown so "on" vs "off" is never ambiguous.
 */
interface ItemTypeToggleProps {
  value: "bill" | "expense";
  onChange: (value: "bill" | "expense") => void;
}

export default function ItemTypeToggle({ value, onChange }: ItemTypeToggleProps) {
  const isExpense = value === "expense";

  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className={`text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
          isExpense ? "text-muted" : "text-foreground"
        }`}
        onClick={() => onChange("bill")}
      >
        Bill
      </span>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={isExpense}
          onChange={() => onChange(isExpense ? "bill" : "expense")}
          aria-label="Toggle between Bill and Expense"
        />
        <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
      <span
        className={`text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
          isExpense ? "text-foreground" : "text-muted"
        }`}
        onClick={() => onChange("expense")}
      >
        Expense
      </span>
    </div>
  );
}
