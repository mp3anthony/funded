"use client";

export type RowPillVariant = "primary" | "accent" | "neutral";

export interface RowPillProps {
  label: string;
  /**
   * Visual style:
   * - "primary" — lime accent (used for Auto-Pay on bill rows)
   * - "accent" — amber (used for Expense on expense rows)
   * - "neutral" — muted/gray (used for Manual on bill rows)
   */
  variant?: RowPillVariant;
}

const VARIANT_CLASSES: Record<RowPillVariant, string> = {
  primary: "bg-primary/10 text-primary border border-primary/20",
  accent: "bg-accent/10 text-accent border border-accent/20",
  neutral: "bg-surface-elevated text-muted border border-border",
};

/**
 * Small inline badge used on bill/expense list rows (BillCard, ExpenseCard)
 * to show payment type (Auto-Pay / Manual) on bill rows, or item type
 * (Expense) on expense rows — the two kinds sit in the same interleaved
 * list on /bills, so this is the at-a-glance cue distinguishing them
 * (Issue #98, Slice 2 fix-round: unify bills/expenses into one list).
 */
export default function RowPill({ label, variant = "neutral" }: RowPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-heading font-bold uppercase tracking-wider shrink-0 ${VARIANT_CLASSES[variant]}`}
    >
      {label}
    </span>
  );
}
