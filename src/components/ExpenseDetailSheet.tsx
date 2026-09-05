"use client";

import { useApp, type Expense, type Member } from "@/context/AppContext";
import Dialog from "@/components/ui/Dialog";

interface ExpenseDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  householdMembers: Member[];
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Issue #98 (Slice 2 of 6, split breakdown added Slice 3 of 6): expense
 * detail view — mirrors BillDetailSheet's shell (same Dialog, same footer
 * button layout) but deliberately much simpler: no paid/unpaid toggle, no
 * pause. Shows a percentage-split breakdown in place of the single
 * Assignee row when split_mode === "percentage".
 */
export default function ExpenseDetailSheet({
  isOpen,
  onClose,
  expense,
  householdMembers,
  onEdit,
  onDelete,
}: ExpenseDetailSheetProps) {
  const { expenseSplits } = useApp();

  if (!isOpen || !expense) return null;

  const isPercentageSplit = expense.split_mode === "percentage";
  const assignee = householdMembers.find((m) => String(m.id) === String(expense.assignee_id));
  const splits = isPercentageSplit
    ? expenseSplits.filter((s) => String(s.expense_id) === String(expense.id))
    : [];

  const formattedAmount = Number(expense.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Expense Details"
      footer={
        <div className="flex space-x-2 w-full">
          <button
            onClick={onDelete}
            className="flex-1 rounded-[2px] py-3 bg-destructive/15 text-destructive border border-destructive/20 font-heading font-bold uppercase tracking-wider text-[10px] hover:bg-destructive hover:text-foreground transition-all active:scale-[0.98] cursor-pointer"
          >
            Delete
          </button>
          <button
            onClick={onEdit}
            className="flex-1 rounded-[2px] py-3 bg-primary text-primary-fg font-heading font-bold uppercase tracking-wider text-[10px] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            Edit
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Title, Badge & Amount */}
        <div className="flex flex-col space-y-4">
          <h3 className="font-heading font-bold text-3xl text-foreground tracking-wide break-words">
            {expense.name}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-3 py-1 text-[10px] font-heading font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {expense.category || "Other"}
            </span>
          </div>

          <div className="flex flex-col items-start pt-2">
            <span className="text-4xl font-heading font-extrabold text-foreground tracking-tight">
              ${formattedAmount}
            </span>
          </div>
        </div>

        {/* Assignee — or a percentage-split breakdown (Issue #98 Slice 3 of 6) */}
        <div className="border-t border-b border-border py-4 font-mono text-xs">
          {isPercentageSplit ? (
            <div className="space-y-2">
              <span className="text-subtle uppercase font-semibold">Split</span>
              <div className="space-y-2 pt-1">
                {splits.length === 0 ? (
                  <span className="text-sm font-semibold text-foreground">No split set</span>
                ) : (
                  splits.map((s) => {
                    const member = householdMembers.find((m) => String(m.id) === String(s.member_id));
                    return (
                      <div key={s.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-foreground">
                          <div className="h-6 w-6 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-bold text-[10px] overflow-hidden">
                            {member?.avatar_url ? (
                              <img src={member.avatar_url} alt={member.name} className="h-full w-full object-cover" />
                            ) : (
                              member?.avatar || member?.name.charAt(0).toUpperCase() || "?"
                            )}
                          </div>
                          <span className="text-sm font-semibold">{member?.name || "Unknown"}</span>
                        </div>
                        <span className="text-sm font-bold text-primary">{s.percentage}%</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-subtle uppercase font-semibold">Assignee</span>
              <div className="flex items-center space-x-2 text-foreground pt-1">
                <div className="h-6 w-6 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-bold text-[10px]">
                  {assignee?.avatar || "P"}
                </div>
                <span className="text-sm font-semibold">{assignee?.name || "Unassigned"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {expense.notes && (
          <div className="space-y-2 pt-2">
            <p className="text-sm text-muted bg-surface p-3 rounded-[2px] border border-border-strong font-mono leading-relaxed whitespace-pre-wrap">
              {expense.notes}
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
