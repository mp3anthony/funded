"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, Calendar, AlertCircle, CheckCircle2, Clock, ChevronDown } from "lucide-react";
import { type Bill } from "@/context/AppContext";
import { parseBillDate } from "@/lib/utils";

interface UpcomingBillsCardProps {
  bills: Bill[];
  onBillClick: (bill: Bill) => void;
  /** Fires with the resolved minimised state on mount and on every toggle
   * (#151) — lets the dashboard know when this card is minimised, e.g. to
   * drive the tips ticker's "both cards minimised" trigger. */
  onMinimisedChange?: (isMinimised: boolean) => void;
}

export const UpcomingBillsCard = React.memo(function UpcomingBillsCard({
  bills,
  onBillClick,
  onMinimisedChange,
}: UpcomingBillsCardProps) {
  const [isMinimised, setIsMinimised] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("dashboard_upcoming_bills_minimised");
    const resolved = stored === "false" ? false : true;
    setIsMinimised(resolved);
    onMinimisedChange?.(resolved);
    // Intentionally mount-only — onMinimisedChange is reported separately
    // from handleToggle below rather than re-run here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = () => {
    setIsMinimised((prev) => {
      const next = !prev;
      localStorage.setItem("dashboard_upcoming_bills_minimised", String(next));
      onMinimisedChange?.(next);
      return next;
    });
  };

  // Get next 5 upcoming or unpaid bills sorted by due date, excluding auto-pay
  const upcomingBillsList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...bills]
      .filter((b) => {
        // Only show manual payment bills
        if (b.payment_type?.toLowerCase() === "auto") return false;

        // Show all unpaid bills (even if overdue)
        if (b.status !== "Paid") return true;
        // Show paid bills only if they are due today or in the future
        const dueDate = parseBillDate(b.due_date || b.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() >= today.getTime();
      })
      .sort((a, b) => {
        const dateA = parseBillDate(a.due_date || a.dueDate);
        const dateB = parseBillDate(b.due_date || b.dueDate);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  }, [bills]);

  return (
    <div className="flex flex-col">
      {/* Header — editorial section with lime rule */}
      <div className={`flex items-center gap-3 ${isMinimised ? "" : "mb-3"}`}>
        <span className="font-heading font-bold text-[15px] text-foreground shrink-0">Upcoming Bills</span>
        <span className="h-0.5 flex-1 rounded-sm" style={{ background: "linear-gradient(90deg, var(--color-primary), transparent)" }} />
        <Link
          href="/bills"
          prefetch={false}
          className="text-[10px] font-heading font-bold uppercase tracking-wider text-primary hover:text-foreground transition-colors flex items-center gap-1 group whitespace-nowrap shrink-0"
        >
          <span>View All</span>
          <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
        <button
          onClick={handleToggle}
          className="text-subtle hover:text-foreground transition-colors flex items-center justify-center focus:outline-none shrink-0"
          aria-label={isMinimised ? "Expand Upcoming Bills" : "Minimize Upcoming Bills"}
        >
          <ChevronDown
            className="h-4 w-4 transition-transform duration-(--duration-slow) ease-(--ease-standard)"
            style={{ transform: isMinimised ? "rotate(0deg)" : "rotate(180deg)" }}
          />
        </button>
      </div>

      {/* Content — expand/collapse via grid-template-rows (Slice 99),
          matching the dashboard's other collapsible sections (e.g.
          HealthScoreCard/ActiveGoalsCard) so it grows/shrinks smoothly
          instead of popping in and out of the layout. */}
      <div
        className="grid transition-[grid-template-rows] duration-(--duration-slow) ease-(--ease-standard)"
        style={{ gridTemplateRows: isMinimised ? "0fr" : "1fr" }}
      >
        <div
          className="overflow-hidden min-h-0"
          aria-hidden={isMinimised}
          inert={isMinimised ? true : undefined}
        >
          {upcomingBillsList.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center space-y-2.5">
              <div className="p-3 bg-foreground/5 rounded-full border border-border">
                <Calendar className="h-6 w-6 text-subtle" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted">No upcoming manual payments</p>
                <p className="text-xs text-subtle font-body max-w-[240px] mx-auto">
                  Start by adding your manual bills to keep track of due dates.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {upcomingBillsList.map((bill) => {
                // Calculate countdown
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = parseBillDate(bill.due_date || bill.dueDate);
                dueDate.setHours(0, 0, 0, 0);

                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let countdownText = "";
                let isOverdue = false;
                const isPaid = bill.status === "Paid";

                if (isPaid) {
                  countdownText = "Paid";
                } else if (diffDays < 0) {
                  const absDays = Math.abs(diffDays);
                  countdownText = `${absDays} day${absDays !== 1 ? "s" : ""} overdue`;
                  isOverdue = true;
                } else if (diffDays === 0) {
                  countdownText = "Due today";
                } else if (diffDays === 1) {
                  countdownText = "Due tomorrow";
                } else {
                  countdownText = `Due in ${diffDays} days`;
                }

                // Badges styling
                let badgeBg = "bg-foreground/10 text-muted";
                let badgeLabel = bill.status;

                if (isPaid) {
                  badgeBg = "bg-[#00e676]/10 text-[#00e676]";
                  badgeLabel = "Paid";
                } else if (isOverdue) {
                  badgeBg = "bg-destructive/10 text-destructive";
                  badgeLabel = "Overdue";
                } else {
                  badgeBg = "bg-accent/10 text-accent";
                  badgeLabel = "Pending";
                }

                return (
                  <div
                    key={bill.id}
                    onClick={() => onBillClick(bill)}
                    className="py-3 flex items-center justify-between border-t border-border cursor-pointer transition-all duration-200 group active:scale-[0.99]"
                  >
                    <div className="flex flex-col min-w-0 pr-4">
                      <span className="font-body font-bold text-sm text-foreground truncate transition-colors">
                        {bill.name}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-semibold mt-0.5 uppercase tracking-wider flex items-center gap-1 ${
                          isOverdue ? "text-destructive" : isPaid ? "text-[#00e676]" : "text-muted"
                        }`}
                      >
                        {isOverdue && <AlertCircle className="h-3 w-3 inline" />}
                        {isPaid && <CheckCircle2 className="h-3 w-3 inline" />}
                        {!isOverdue && !isPaid && <Clock className="h-3 w-3 inline" />}
                        {countdownText}
                      </span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1.5">
                      <span className="font-mono text-sm font-bold text-foreground tracking-tight">
                        ${bill.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span
                        className={`text-[9px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeBg}`}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

UpcomingBillsCard.displayName = "UpcomingBillsCard";
export default UpcomingBillsCard;
