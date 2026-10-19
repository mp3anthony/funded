"use client";

import Link from "next/link";
import { Calendar, ChevronRight, Receipt, Target, X, type LucideIcon } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { finishSetupHref, missingSetupItems, shouldShowFinishSetup, type SetupItem } from "@/lib/finishSetup";

const ROWS: Record<SetupItem, { label: string; Icon: LucideIcon }> = {
  payday: { label: "Add your payday", Icon: Calendar },
  bill: { label: "Add your first bill", Icon: Receipt },
  goal: { label: "Add your first goal", Icon: Target },
};

/**
 * Dashboard "Finish setting up" card (#333). Owners only: lists whichever of
 * payday, bill and goal the household has none of; each row opens that page's
 * add form. Leaves by itself when all three exist, or for good when the owner
 * taps X (stored per user, so it holds on every device).
 */
export default function FinishSetupCard() {
  const { bills, funds, paySchedules, members, session, isFinishSetupDismissed, dismissFinishSetup } = useApp();

  // Owner check matches settings-client (email match against the member list).
  const currentMember = members.find(
    (m) => String(m.email).toLowerCase() === String(session?.user?.email).toLowerCase()
  );
  const isOwner = currentMember?.role === "owner";
  const missing = missingSetupItems({
    payScheduleCount: paySchedules.length,
    billCount: bills.length,
    goalCount: funds.length,
  });

  if (!shouldShowFinishSetup({ isOwner, dismissed: isFinishSetupDismissed, missing })) return null;

  return (
    <section
      aria-label="Finish setting up"
      className="rounded-[2px] border border-border-strong bg-surface-elevated"
    >
      <div className="flex items-start gap-2 pl-4 pr-1 pt-1">
        <div className="flex-1 min-w-0 py-2.5">
          <h2 className="text-sm font-bold text-foreground">Finish setting up</h2>
          <p className="text-[13px] font-body text-muted leading-snug">
            Add these to get the most out of Funded.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void dismissFinishSetup()}
          aria-label="Hide Finish setting up"
          className="shrink-0 flex h-11 w-11 items-center justify-center text-muted hover:text-foreground cursor-pointer touch-manipulation"
        >
          <X size={18} />
        </button>
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
