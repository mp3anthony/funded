"use client";

import { useEffect, useMemo, useState } from "react";
import { Target } from "lucide-react";
import { useApp, type Fund } from "@/context/AppContext";
import Card from "@/components/ui/Card";
import Carousel from "@/components/ui/Carousel";
import ProgressRing from "@/components/ui/ProgressRing";
import SectionHeader from "@/components/ui/SectionHeader";
import { ViewAllLink } from "@/components/DashboardBills";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { dashboardGoals, type DashboardGoal } from "@/lib/dashboardCarousels";
import { isReached, savingGoals, sortByProgress, weeklyFromRules } from "@/lib/goalPace";

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function GoalSlide({ item, onOpen }: { item: DashboardGoal<Fund>; onOpen: () => void }) {
  const { goal, percent, weeklyText, hasContribution } = item;
  const reducedMotion = useReducedMotion();
  const Icon = goal.icon || Target;

  // The ring grows from empty on first show; a later change just slides to the new value.
  // With Reduce Motion it is drawn at its value at once.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const shown = reducedMotion || armed ? percent : 0;

  const sentence = `${goal.name}. ${money(goal.currentAmount)} of ${money(goal.targetAmount)}, ${percent} percent. ${weeklyText}.`;

  return (
    <Card onClick={onOpen} aria-label={sentence} className="h-full p-4">
      <span aria-hidden="true" className="flex items-center gap-3">
        <span className="motion-reduce:[&_circle]:transition-none">
          <ProgressRing percent={shown} size={52} stroke={4} className={goal.accentText || "text-primary-ink"}>
            <Icon className={`h-5 w-5 ${goal.accentText || "text-primary-ink"}`} />
          </ProgressRing>
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-body text-[15px] font-semibold text-foreground">{goal.name}</span>
          <span className="mt-0.5 text-[13px] font-body text-muted tabular-nums">
            {money(goal.currentAmount)} of {money(goal.targetAmount)}
          </span>
          <span
            className={`mt-0.5 text-[13px] font-medium tabular-nums ${hasContribution ? "text-foreground" : "text-muted"}`}
          >
            {weeklyText}
          </span>
        </span>
      </span>
    </Card>
  );
}

/**
 * Dashboard Goals carousel (R27, #414): up to 3 Active goals still to reach, most progress
 * first, each with a ring and its weekly contribution. Swipe-only. Each card opens the goal's sheet.
 */
export default function DashboardGoals({ onGoalClick }: { onGoalClick: (goal: Fund) => void }) {
  const { funds, contributionRules, paySchedules } = useApp();
  const list = useMemo(
    () =>
      dashboardGoals(funds, contributionRules, paySchedules, {
        savingGoals,
        isReached,
        sortByProgress,
        weeklyFromRules,
      }),
    [funds, contributionRules, paySchedules]
  );

  return (
    <section aria-label="Active goals">
      <SectionHeader title="Goals" className="mb-3" trailing={<ViewAllLink href="/funds" label="View all goals" />} />
      {list.length === 0 ? (
        <Card className="p-4">
          <p className="font-body text-[15px] font-semibold text-foreground">No active goals yet</p>
          <p className="mt-0.5 text-[13px] font-body text-muted">Goals you are saving towards show up here.</p>
        </Card>
      ) : (
        <Carousel label="Active goals">
          {list.map((item) => (
            <GoalSlide key={item.goal.id} item={item} onOpen={() => onGoalClick(item.goal)} />
          ))}
        </Carousel>
      )}
    </section>
  );
}
