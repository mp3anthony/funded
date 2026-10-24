"use client";

import Link from "next/link";
import { Calendar, ChevronRight, Receipt, Target, X, type LucideIcon } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useFinishSetup } from "@/hooks/useFinishSetup";
import { finishSetupHref, type SetupItem } from "@/lib/finishSetup";
import IconCircle from "@/components/ui/IconCircle";

const ROWS: Record<SetupItem, { label: string; Icon: LucideIcon }> = {
  payday: { label: "Add your payday", Icon: Calendar },
  bill: { label: "Add your first bill", Icon: Receipt },
  goal: { label: "Add your first goal", Icon: Target },
};

/**
 * Dashboard "Finish setting up" card (#333). Owners only: lists whichever of
 * payday, bill and goal the household has none of; each row opens that page's
 * add form. Leaves by itself when all three exist, or for good when the owner
 * taps X (stored per user, so it holds on every device). Takes the stats
 * carousel's slot on the Dashboard while it shows (R26).
 */
export default function FinishSetupCard() {
  const { dismissFinishSetup } = useApp();
  const { state, missing } = useFinishSetup();

  if (state !== "card") return null;

  return (
    <section
      aria-label="Finish setting up"
      className="overflow-hidden rounded-card border border-border bg-surface"
    >
      <div className="flex items-start gap-2 pl-4 pr-1 pt-1">
        <div className="flex-1 min-w-0 py-2.5">
          <h2 className="text-sm font-bold text-foreground">Finish setting up</h2>
          <p className="text-[13px] font-body text-muted leading-snug">
            Add these to get the most out of Funded.
          </p>
        </div>
        <IconCircle label="Hide Finish setting up" onClick={() => void dismissFinishSetup()}>
          <X size={18} aria-hidden="true" />
        </IconCircle>
      </div>
      <ul className="border-t border-border">
        {missing.map((item) => {
          const { label, Icon } = ROWS[item];
          return (
            <li key={item} className="border-b border-border last:border-b-0">
              <Link
                href={finishSetupHref(item)}
                className="flex min-h-[44px] items-center gap-3 px-4 py-2 text-sm font-semibold text-foreground hover:bg-foreground/5 touch-manipulation"
              >
                <Icon size={18} className="text-primary shrink-0" />
                <span className="flex-1 min-w-0">{label}</span>
                <ChevronRight size={16} className="text-muted shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
