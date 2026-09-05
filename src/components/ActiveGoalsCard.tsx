"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, Target, ChevronDown } from "lucide-react";
import { type Fund } from "@/context/AppContext";
import ActiveGoalRow from "@/components/ActiveGoalRow";

interface ActiveGoalsCardProps {
  funds: Fund[];
  onGoalClick: (goal: Fund) => void;
}

export const ActiveGoalsCard = React.memo(function ActiveGoalsCard({
  funds,
  onGoalClick,
}: ActiveGoalsCardProps) {
  const [isMinimised, setIsMinimised] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("dashboard_active_goals_minimised");
    if (stored === "false") {
      setIsMinimised(false);
    } else if (stored === "true") {
      setIsMinimised(true);
    }
  }, []);

  const handleToggle = () => {
    setIsMinimised((prev) => {
      const next = !prev;
      localStorage.setItem("dashboard_active_goals_minimised", String(next));
      return next;
    });
  };

  // Get top 3 active goals sorted by progress percentage (highest progress first)
  const activeGoalsList = useMemo(() => {
    return [...funds]
      .filter((f) => f.status !== "completed")
      .map((f) => {
        const progress = f.targetAmount > 0 ? (f.currentAmount / f.targetAmount) * 100 : 0;
        return { ...f, progress };
      })
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);
  }, [funds]);

  return (
    <div className="flex flex-col">
      {/* Header — editorial section with lime rule */}
      <div className={`flex items-center gap-3 ${isMinimised ? "" : "mb-4"}`}>
        <span className="font-heading font-bold text-[15px] text-foreground shrink-0">Savings Goals</span>
        <span className="h-0.5 flex-1 rounded-sm" style={{ background: "linear-gradient(90deg, var(--color-primary), transparent)" }} />
        <Link
          href="/funds"
          prefetch={false}
          className="text-[10px] font-heading font-bold uppercase tracking-wider text-primary hover:text-foreground transition-colors flex items-center gap-1 group whitespace-nowrap shrink-0"
        >
          <span>View All</span>
          <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
        <button
          onClick={handleToggle}
          className="text-subtle hover:text-foreground transition-colors flex items-center justify-center focus:outline-none shrink-0"
          aria-label={isMinimised ? "Expand Savings Goals" : "Minimize Savings Goals"}
        >
          <ChevronDown
            className="h-4 w-4 transition-transform duration-(--duration-slow) ease-(--ease-standard)"
            style={{ transform: isMinimised ? "rotate(0deg)" : "rotate(180deg)" }}
          />
        </button>
      </div>

      {/* Content — expand/collapse via grid-template-rows (Slice 99),
          matching the dashboard's other collapsible sections (e.g.
          HealthScoreCard) so it grows/shrinks smoothly instead of
          popping in and out of the layout. */}
      <div
        className="grid transition-[grid-template-rows] duration-(--duration-slow) ease-(--ease-standard)"
        style={{ gridTemplateRows: isMinimised ? "0fr" : "1fr" }}
      >
        <div className="overflow-hidden min-h-0">
          {activeGoalsList.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center space-y-2.5">
              <div className="p-3 bg-foreground/5 rounded-full border border-border-strong">
                <Target className="h-6 w-6 text-subtle" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted">No active goals</p>
                <p className="text-xs text-subtle font-body max-w-[200px] mx-auto">
                  Set up your savings goals to track progress here.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 flex flex-col">
              {activeGoalsList.map((goal, index) => (
                <ActiveGoalRow
                  key={goal.id}
                  goal={goal}
                  index={index}
                  isVisible={!isMinimised}
                  onClick={() => onGoalClick(goal)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ActiveGoalsCard.displayName = "ActiveGoalsCard";
export default ActiveGoalsCard;
