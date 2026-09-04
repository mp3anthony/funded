"use client";

import React from "react";

/**
 * Issue #98 (Slice 2 of 6): the bill-vs-expense choice shown at the top of
 * the add-item form (AddBillSheet / AddExpenseSheet). Same segmented-control
 * shell already used for frequency in ContributionSettingsSheet — reused
 * here rather than inventing a new toggle pattern.
 */
interface ItemTypeToggleProps {
  value: "bill" | "expense";
  onChange: (value: "bill" | "expense") => void;
}

export default function ItemTypeToggle({ value, onChange }: ItemTypeToggleProps) {
  const options: { value: "bill" | "expense"; label: string }[] = [
    { value: "bill", label: "Bill" },
    { value: "expense", label: "Expense" },
  ];

  return (
    <div className="grid grid-cols-2 gap-1 bg-background border border-border rounded-[2px] p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`py-2 px-3 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
            value === opt.value
              ? "bg-primary text-primary-fg shadow"
              : "text-muted hover:text-foreground hover:bg-white/5"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
