"use client";

export interface RowPillProps {
  label: string;
  /** Emphasized styling (primary accent) vs. the default neutral/muted look. */
  emphasized?: boolean;
}

/**
 * Small inline badge used on bill/expense list rows (BillCard, ExpenseCard)
 * to show payment type (Auto-Pay / Manual) on bill rows, or item type
 * (Expense) on expense rows — the two kinds sit in the same interleaved
 * list on /bills, so this is the at-a-glance cue distinguishing them
 * (Issue #98, Slice 2 fix-round: unify bills/expenses into one list).
 */
export default function RowPill({ label, emphasized = false }: RowPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-heading font-bold uppercase tracking-wider shrink-0 ${
        emphasized
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-surface-elevated text-muted border border-border"
      }`}
    >
      {label}
    </span>
  );
}
