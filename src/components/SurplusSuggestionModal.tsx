"use client";

import { TrendingUp, Target, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { savingGoals } from "@/lib/goalPace";
import Dialog, { DialogButton } from "@/components/ui/Dialog";

interface SurplusSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  newPayAmount: number;
  surplusAmount: number;
  onAllocate: (goalId: string, amount: number) => void;
}

export default function SurplusSuggestionModal({
  isOpen,
  onClose,
  memberId,
  newPayAmount,
  surplusAmount,
  onAllocate,
}: SurplusSuggestionModalProps) {
  const { funds, householdMembers } = useApp();

  if (!isOpen) return null;

  const member = householdMembers.find((m) => String(m.id) === String(memberId));
  const memberName = member ? member.name : "Member";

  // Calculate top 3 goals by progress percentage descending
  // R17: only Saving goals are suggested (never Just tracking ones).
  const topGoals = savingGoals(funds)
    .map((f) => {
      const progress = f.targetAmount > 0 ? (f.currentAmount / f.targetAmount) * 100 : 0;
      return { ...f, progress };
    })
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);

  const formattedSurplus = surplusAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Surplus Detected!"
      icon={<TrendingUp size={20} className="text-primary-ink" />}
      maxWidthClass="max-w-sm"
      footer={
        <DialogButton variant="ghost" onClick={onClose}>
          Skip Allocation
        </DialogButton>
      }
    >
      <div className="space-y-5">
          {/* Title details */}
          <div className="space-y-1">
            <h4 className="font-bold text-lg text-foreground leading-tight">
              {memberName} earned <span className="text-primary-ink">${formattedSurplus}</span> over average!
            </h4>
            <p className="text-xs text-muted font-body">
              Would you like to add this extra income to one of your goals?
            </p>
          </div>

          {/* Allocations Options list */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block">
              Add Surplus To A Goal:
            </span>

            {/* Goals */}
            <div className="space-y-2">
              {topGoals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => onAllocate(String(goal.id), surplusAmount)}
                  className="w-full bg-background border border-border rounded-[2px] p-3 flex items-center justify-between text-left hover:border-primary/30 transition-all active:scale-[0.99] group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-[2px] bg-secondary/15 text-secondary shrink-0`}>
                      <Target size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-foreground block truncate">
                        {goal.name}
                      </span>
                      <span className="text-[10px] text-muted block">
                        Progress: {goal.progress.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-primary-ink whitespace-nowrap bg-primary/10 px-2.5 py-1 rounded-[2px] group-active:bg-primary group-active:text-primary-fg transition-all">
                    <span>+${formattedSurplus}</span>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          </div>
      </div>
    </Dialog>
  );
}
