"use client";

import React from "react";
import { Target } from "lucide-react";
import { type Fund } from "@/context/AppContext";
import { useCountUp } from "@/hooks/useCountUp";

/* ── Goal row (Slice 99: motion overhaul) ───────────────────────────
   Split out of ActiveGoalsCard so its percent and saved amount can each
   run through useCountUp — they transition smoothly when a goal's amount
   changes rather than popping to the new figure. Rows also get a capped,
   restrained fade/slide-in the first time the card is expanded (never a
   repeating page-load flourish). */
export default function ActiveGoalRow({
  goal,
  index,
  isVisible,
  onClick,
}: {
  goal: Fund & { progress: number };
  index: number;
  isVisible: boolean;
  onClick: () => void;
}) {
  const GoalIcon = goal.icon || Target;
  const roundedPercent = Math.min(100, Math.round(goal.progress));
  const displayPercent = useCountUp(roundedPercent);
  const displayCurrentAmount = useCountUp(goal.currentAmount);
  const delayMs = Math.min(index * 40, 120);

  return (
    <div
      onClick={onClick}
      className={`space-y-2 cursor-pointer group active:scale-[0.99] transition-transform duration-(--duration-base) ease-(--ease-standard)${
        isVisible ? " fund-row-in" : ""
      }`}
      style={isVisible ? ({ "--row-delay": `${delayMs}ms` } as React.CSSProperties) : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div
            className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
              goal.bgLight || "bg-white/5 text-foreground"
            }`}
          >
            <GoalIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-body font-bold text-xs text-foreground truncate group-hover:text-foreground transition-colors leading-none">
              {goal.name}
            </h4>
            <span className="text-[8px] font-bold font-mono text-subtle uppercase tracking-wider block mt-0.5">
              {goal.category}
            </span>
          </div>
        </div>
        <span className={`text-xs font-bold font-mono leading-none ${goal.accentText || "text-primary"}`}>
          {Math.round(displayPercent)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-(--duration-slow) ease-(--ease-standard) ${
            goal.barColor || "bg-primary"
          }`}
          style={{ width: `${roundedPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between font-mono text-[9px] text-subtle">
        <span className="font-mono">
          ${displayCurrentAmount.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </span>
        <span className="font-mono text-neutral-600">
          target: ${goal.targetAmount.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
    </div>
  );
}
