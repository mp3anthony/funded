"use client";

import type { CSSProperties } from "react";
import { Target, Plus } from "lucide-react";
import { type Fund } from "@/context/AppContext";
import { useCountUp } from "@/hooks/useCountUp";

/* ── Goal row (Slice 99: motion overhaul) ───────────────────────────
   Split out of the Funds page list so its progress % and saved amount can
   each run through useCountUp — they transition smoothly when an "Add
   Amount" changes the goal's currentAmount instead of popping to the new
   figure. The row itself gets a capped, restrained fade/slide-in on first
   appearance (mount or category re-expand), never on every re-render —
   the staggerIndex delay only applies while isExpanded is true. */
export default function GoalRow({
  fund,
  IconComponent,
  percentage,
  isComplete,
  staggerIndex,
  isExpanded,
  onOpen,
  onAddAmount,
}: {
  fund: Fund;
  IconComponent: Fund["icon"];
  percentage: number;
  isComplete: boolean;
  staggerIndex: number;
  isExpanded: boolean;
  onOpen: () => void;
  onAddAmount: () => void;
}) {
  const displayPercentage = useCountUp(percentage);
  const displayCurrentAmount = useCountUp(fund.currentAmount);

  // Cap the stagger so a long list doesn't make users wait through
  // page-load choreography — only the first handful of rows get a
  // noticeable delay, everything after settles at a flat 150ms.
  const delayMs = Math.min(staggerIndex * 30, 150);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`border-t border-border py-3 cursor-pointer hover:bg-surface/40 active:scale-[0.995] transition-[background-color,transform] duration-(--duration-base) ease-(--ease-standard) focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded-sm${
        isExpanded ? " fund-row-in" : ""
      }`}
      style={isExpanded ? ({ "--row-delay": `${delayMs}ms` } as CSSProperties) : undefined}
    >
      {/* Header: icon · name/category · percent */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`flex h-8 w-8 rounded-lg items-center justify-center shrink-0 ${fund.bgLight || "bg-white/5 text-foreground"}`}>
            <IconComponent className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-body font-semibold text-[15px] text-foreground truncate leading-tight">
              {fund.name}
            </h4>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-subtle block mt-0.5">
              {fund.category}
            </span>
          </div>
        </div>
        <span className={`font-mono font-bold text-sm shrink-0 ${fund.accentText || "text-primary"}`}>
          {displayPercentage.toFixed(1)}%
        </span>
      </div>

      {/* Progress bar — driven by live state */}
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2.5">
        <div
          className={`h-full rounded-full transition-all duration-(--duration-slow) ease-(--ease-standard) ${fund.barColor || "bg-primary"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Amounts */}
      <div className="flex items-center justify-between font-mono text-[11px] mt-1.5">
        <span className="font-semibold text-foreground">
          ${displayCurrentAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="text-subtle">
          target: ${fund.targetAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}
        </span>
      </div>

      {/* Add Money / Completed action */}
      {isComplete ? (
        <div className="flex items-center gap-1.5 mt-2.5 text-primary text-[11px] font-mono font-bold uppercase tracking-wider">
          <Target className="h-3.5 w-3.5" />
          <span>Goal Reached! 🎉</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddAmount();
          }}
          className="mt-2.5 inline-flex items-center gap-1.5 py-1 text-[11px] font-heading font-bold uppercase tracking-wider text-muted hover:text-primary active:scale-95 transition-[color,transform] duration-(--duration-fast) ease-(--ease-standard)"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Amount
        </button>
      )}
    </div>
  );
}
