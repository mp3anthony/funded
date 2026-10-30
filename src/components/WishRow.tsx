"use client";

import type { CSSProperties } from "react";
import { type Fund } from "@/context/AppContext";
import ProgressRing from "@/components/ui/ProgressRing";

const moneyFmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/**
 * Wish list row (R17, #404) for a Just tracking goal: icon in an empty ring, name and cost. No pace,
 * no "+", never Reached styling. The whole row is one button that opens the goal
 * sheet, which holds Check impact (F04).
 */
export default function WishRow({
  fund,
  staggerIndex,
  isExpanded,
  onOpen,
}: {
  fund: Fund;
  staggerIndex: number;
  isExpanded: boolean;
  onOpen: () => void;
}) {
  const IconComponent = fund.icon;
  const delayMs = Math.min(staggerIndex * 30, 150);

  return (
    <div
      className={`flex items-center gap-2 border-t border-border${isExpanded ? " fund-row-in" : ""}`}
      style={isExpanded ? ({ "--row-delay": `${delayMs}ms` } as CSSProperties) : undefined}
    >
      <button
        type="button"
        onClick={onOpen}
        className="press-tint flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
      >
        <ProgressRing percent={0} className={fund.accentText || "text-primary-ink"}>
          <IconComponent className={`h-[18px] w-[18px] ${fund.accentText || "text-primary-ink"}`} aria-hidden="true" />
        </ProgressRing>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-body text-[15px] font-semibold text-foreground">{fund.name}</span>
          <span className="text-[13px] tabular-nums text-muted">{moneyFmt(fund.targetAmount)}</span>
        </span>
      </button>
    </div>
  );
}
