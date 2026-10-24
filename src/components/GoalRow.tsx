"use client";

import type { CSSProperties } from "react";
import { Check, Plus } from "lucide-react";
import { type Fund } from "@/context/AppContext";
import IconCircle from "@/components/ui/IconCircle";
import ProgressRing from "@/components/ui/ProgressRing";
import { useCountUp } from "@/hooks/useCountUp";
import { isReached, type Pace, type PaceKind } from "@/lib/goalPace";

const PACE_TONE: Record<PaceKind, string> = {
  reached: "text-success",
  onTrack: "text-success",
  needs: "text-accent",
  rule: "text-muted",
  past: "text-accent",
  none: "text-muted",
};

const moneyFmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/**
 * Saving goal row (R17, #404): a progress ring around the goal icon, the name,
 * "$saved of $target", a pace line, and a round "+" that adds money. The whole
 * row (everything except the "+") is ONE button that opens the goal sheet. The
 * "+" is a sibling button, not nested, and is gone once the goal is Reached.
 * The saved amount and ring count up when money is added (Slice 99 motion);
 * the row fades in once per category open, with the capped stagger.
 */
export default function GoalRow({
  fund,
  pace,
  staggerIndex,
  isExpanded,
  onOpen,
  onAddAmount,
}: {
  fund: Fund;
  pace: Pace;
  staggerIndex: number;
  isExpanded: boolean;
  onOpen: () => void;
  onAddAmount: () => void;
}) {
  const reached = isReached(fund);
  const percentage = fund.targetAmount > 0 ? Math.min((fund.currentAmount / fund.targetAmount) * 100, 100) : 0;
  const displayPercentage = useCountUp(percentage);
  const displayCurrentAmount = useCountUp(fund.currentAmount);
  const IconComponent = fund.icon;

  // Capped stagger so a long list never makes anyone wait through page-load choreography.
  const delayMs = Math.min(staggerIndex * 30, 150);

  return (
    <div
      className={`flex items-center gap-1 border-t border-border${isExpanded ? " fund-row-in" : ""}`}
      style={isExpanded ? ({ "--row-delay": `${delayMs}ms` } as CSSProperties) : undefined}
    >
      <button
        type="button"
        onClick={onOpen}
        className="press-tint flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
      >
        <ProgressRing percent={displayPercentage} className={reached ? "text-success" : fund.accentText || "text-primary"}>
          {reached ? (
            <Check size={18} className="text-success" aria-hidden="true" />
          ) : (
            <IconComponent className={`h-[18px] w-[18px] ${fund.accentText || "text-primary"}`} aria-hidden="true" />
          )}
        </ProgressRing>

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-body text-[15px] font-semibold text-foreground">{fund.name}</span>
          <span className="text-[13px] tabular-nums text-muted">
            {moneyFmt(displayCurrentAmount)} of {moneyFmt(fund.targetAmount)}
          </span>
          <span className={`mt-0.5 flex items-center gap-1 text-[11px] font-medium ${PACE_TONE[pace.kind]}`}>
            {pace.text}
          </span>
        </span>
      </button>

      {!reached && (
        <IconCircle label={`Add money to ${fund.name}`} onClick={onAddAmount}>
          <Plus size={18} aria-hidden="true" />
        </IconCircle>
      )}
    </div>
  );
}
