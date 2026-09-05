"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { calculateHealthScore, convertAmount } from "@/lib/utils";

/* ── Slice 13 (#99, Part 5): count-up on the 4 stat tiles ──────────
   Animates a displayed number from its previous value to a new target over
   1150ms on an ease-out-cubic curve, via requestAnimationFrame. Re-triggers
   whenever `target` changes (including on mount, animating up from 0 — the
   simplest, most consistent "value settled in" read rather than special-
   casing the first render to skip the animation). */
function useCountUp(target: number, durationMs = 1150): number {
  const [displayValue, setDisplayValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) return;

    const start = performance.now();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      setDisplayValue(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return displayValue;
}

export const HealthScoreCard = React.memo(function HealthScoreCard() {
  const {
    bills,
    funds,
    payHistory,
    householdContributions,
    paySchedules,
    isJointFund,
    billSplits,
    members,
    isDataLoading,
    expenses,
    expenseSplits,
    contributionRules
  } = useApp();

  const [isHealthExpanded, setIsHealthExpanded] = useState(true);
  const [isContributorsExpanded, setIsContributorsExpanded] = useState(false);

  // 1. Calculate Health Score
  const score = useMemo(
    () => calculateHealthScore(bills, funds, payHistory, householdContributions, paySchedules, isJointFund, billSplits, expenses, expenseSplits, contributionRules),
    [bills, funds, payHistory, householdContributions, paySchedules, isJointFund, billSplits, expenses, expenseSplits, contributionRules]
  );

  // 1b. Steady-state "not set up yet" override (#87).
  // calculateHealthScore returns 85 ("Fully Funded") for a household with no
  // bills, no goals and no contributions — that math is correct for the
  // *loading-race* false positives (#73/#74/#82), which are guarded upstream
  // by AppShell's `!isDataLoading` render gate: this component never mounts
  // until isDataLoading is false, so bills/funds/householdContributions are
  // only read here once data has actually settled. `isDataLoading` is still
  // checked below (not just relied on via the parent gate) so this override
  // fails closed — same posture as the guards documented in AppContext.tsx
  // around isDataLoading — rather than assuming the mount timing always holds.
  // Genuinely empty (steady-state) is what's left once that race is ruled
  // out, and per #87 it should read as "not set up" rather than "funded".
  const isGenuinelyEmpty =
    !isDataLoading &&
    bills.length === 0 &&
    funds.length === 0 &&
    householdContributions.length === 0;

  // 2. Status Label Logic
  let statusText = "Needs Attention";
  let dotColor = "bg-destructive"; // Red
  let glowColor = "#ff3d57";

  if (isGenuinelyEmpty) {
    statusText = "Not Set Up Yet";
    dotColor = "bg-subtle";
    glowColor = "#8a8a8a";
  } else if (score >= 80) {
    statusText = "Fully Funded";
    dotColor = "bg-primary"; // Lime Green
    glowColor = "#c8ff00";
  } else if (score >= 60) {
    statusText = "On Track";
    dotColor = "bg-accent"; // Amber
    glowColor = "#ffab00";
  }

  // 3. Weekly Stats Calculations
  const weeklyIncome = useMemo(() => {
    if (isJointFund) {
      return householdContributions.reduce((sum, contribution) => {
        return sum + convertAmount(contribution.amount, contribution.frequency, 'weekly');
      }, 0);
    } else {
      return paySchedules.reduce((sum, schedule) => {
        let amount = schedule.amount || 0;
        if (!schedule.is_fixed_amount) {
          const historyItems = payHistory.filter(h => h.pay_schedule_id === schedule.id);
          if (historyItems.length > 0) {
            historyItems.sort((a, b) => new Date(b.pay_date).getTime() - new Date(a.pay_date).getTime());
            amount = historyItems[0].amount;
          }
        }
        return sum + convertAmount(amount, schedule.frequency, "weekly");
      }, 0);
    }
  }, [paySchedules, isJointFund, householdContributions, payHistory]);

  const weeklyActualIncome = useMemo(() => {
    return paySchedules.reduce((sum, schedule) => {
      let amount = schedule.amount || 0;
      if (!schedule.is_fixed_amount) {
        const historyItems = payHistory.filter(h => h.pay_schedule_id === schedule.id);
        if (historyItems.length > 0) {
          historyItems.sort((a, b) => new Date(b.pay_date).getTime() - new Date(a.pay_date).getTime());
          amount = historyItems[0].amount;
        }
      }
      return sum + convertAmount(amount, schedule.frequency, "weekly");
    }, 0);
  }, [paySchedules, payHistory]);

  const weeklyBills = useMemo(() => {
    return bills.reduce((sum, bill) => {
      if (bill.is_paused) return sum;
      return sum + convertAmount(bill.amount || 0, bill.frequency || "monthly", "weekly");
    }, 0);
  }, [bills]);

  const weeklySurplus = weeklyIncome - weeklyBills;
  const weeklySurplusActual = weeklyActualIncome - weeklyBills;
  const surplusColor = weeklySurplus >= 0 ? "text-primary" : "text-destructive";

  const sinkingFundsTotal = useMemo(() => {
    return funds.reduce((sum, fund) => sum + (fund.currentAmount || 0), 0);
  }, [funds]);

  // Slice 13 (#99, Part 5): animate each stat tile's displayed number from
  // its prior value to the new target rather than popping instantly.
  const displayWeeklyIncome = useCountUp(weeklyIncome);
  const displayWeeklyBills = useCountUp(weeklyBills);
  const displayWeeklySurplus = useCountUp(weeklySurplus);
  const displaySinkingFundsTotal = useCountUp(sinkingFundsTotal);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);
    const formatted = absoluteAmount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${isNegative ? "-" : ""}$${formatted}`;
  };

  // 4. Calculate Visible Members
  const visibleMembers = useMemo(() => {
    if (!members) return [];
    
    return members.filter(member => {
      if (isJointFund) {
        const contribution = householdContributions.find(c => String(c.member_id) === String(member.id));
        return contribution && contribution.amount > 0;
      } else {
        const hasPaySchedule = paySchedules.some(ps => String(ps.member_id) === String(member.id) && (ps.amount || 0) > 0);
        const hasBillSplit = billSplits.some(bs => String(bs.member_id) === String(member.id) && (bs.amount || 0) > 0);
        return hasPaySchedule || hasBillSplit;
      }
    });
  }, [members, isJointFund, householdContributions, paySchedules, billSplits]);

  return (
    <div className="flex flex-col gap-6">
      {/* Health hero — page anchor, no surface box */}
      <div className="flex flex-col space-y-1.5">
        <button
          onClick={() => setIsHealthExpanded(prev => !prev)}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-subtle font-bold hover:text-foreground transition-colors text-left focus:outline-none w-fit"
        >
          Household Health
          <ChevronDown
            size={12}
            className="transition-transform duration-(--duration-slow) ease-(--ease-standard)"
            style={{ transform: isHealthExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${dotColor} transition-colors duration-(--duration-slow) ease-(--ease-standard)`}
            style={{ boxShadow: `0 0 12px ${glowColor}A6` }}
          />
          <h2 className="font-heading font-extrabold text-[28px] tracking-tight text-foreground">
            {statusText}
          </h2>
        </div>
        {isJointFund && (
          <p className="text-sm text-muted font-body pt-1">
            {weeklySurplusActual >= 0
              ? `$${formatCurrency(weeklySurplusActual).replace('$', '')} surplus after bills this week`
              : `-$${formatCurrency(Math.abs(weeklySurplusActual)).replace('$', '')} deficit after bills this week`}
          </p>
        )}
      </div>

      {/* Stat grid — borderless, hairline top-rule per cell. Height-animated
          via the grid-template-rows 0fr/1fr technique (Slice 13, #99 Part 5)
          so it doesn't need JS content-height measurement; the inner
          overflow-hidden wrapper clips mid-transition, and the content's
          opacity fades in over roughly the back half so it doesn't pop. */}
      <div
        className="grid transition-[grid-template-rows] duration-(--duration-slow) ease-(--ease-standard)"
        style={{ gridTemplateRows: isHealthExpanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className="grid grid-cols-2 gap-x-6 transition-opacity ease-(--ease-standard)"
            style={{
              opacity: isHealthExpanded ? 1 : 0,
              transitionDuration: "260ms",
              transitionDelay: isHealthExpanded ? "260ms" : "0ms",
            }}
          >
            {/* Tile 1 */}
            <div className="border-t border-border py-2.5 flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-subtle font-bold">Weekly Income</span>
              <span className="font-mono font-bold text-[19px] text-primary tracking-tight">{formatCurrency(displayWeeklyIncome)}</span>
            </div>
            {/* Tile 2 */}
            <div className="border-t border-border py-2.5 flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-subtle font-bold">Weekly Bills</span>
              <span className="font-mono font-bold text-[19px] text-foreground tracking-tight">{formatCurrency(displayWeeklyBills)}</span>
            </div>
            {/* Tile 3 */}
            <div className="border-t border-border py-2.5 flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-subtle font-bold">
                {isJointFund ? "Joint Fund Surplus" : "Surplus after bills"}
              </span>
              <span className={`font-mono font-bold text-[19px] ${surplusColor} tracking-tight`}>{formatCurrency(displayWeeklySurplus)}</span>
            </div>
            {/* Tile 4 */}
            <div className="border-t border-border py-2.5 flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-subtle font-bold">Goals Total Added (Weekly)</span>
              <span className="font-mono font-bold text-[19px] text-primary tracking-tight">{formatCurrency(displaySinkingFundsTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contributors — editorial subsection */}
      {visibleMembers.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setIsContributorsExpanded(prev => !prev)}
            className="group flex items-center gap-3 text-left focus:outline-none"
          >
            <span className="font-heading font-bold text-[13px] text-foreground shrink-0">Contributors</span>
            {isContributorsExpanded ? <ChevronUp size={13} className="text-subtle" /> : <ChevronDown size={13} className="text-subtle" />}
            <span className="h-0.5 flex-1 rounded-sm" style={{ background: "linear-gradient(90deg, var(--color-primary), transparent)" }} />
          </button>
          {isContributorsExpanded && (
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {visibleMembers.map(member => {
              let weeklyAmount = 0;

              if (isJointFund) {
                const contribution = householdContributions.find(c => String(c.member_id) === String(member.id));
                if (contribution) {
                  weeklyAmount = convertAmount(contribution.amount, contribution.frequency, 'weekly');
                }
              } else {
                // Direct Pay
                const memberPaySchedules = paySchedules.filter(ps => String(ps.member_id) === String(member.id));
                const memberBillSplits = billSplits.filter(bs => String(bs.member_id) === String(member.id));

                if (memberPaySchedules.length > 0) {
                  weeklyAmount = memberPaySchedules.reduce((sum, schedule) => {
                    let amount = schedule.amount || 0;
                    if (!schedule.is_fixed_amount) {
                      const historyItems = payHistory.filter(h => h.pay_schedule_id === schedule.id);
                      if (historyItems.length > 0) {
                        historyItems.sort((a, b) => new Date(b.pay_date).getTime() - new Date(a.pay_date).getTime());
                        amount = historyItems[0].amount;
                      }
                    }
                    return sum + convertAmount(amount, schedule.frequency, "weekly");
                  }, 0);
                } else if (memberBillSplits.length > 0) {
                  weeklyAmount = memberBillSplits.reduce((sum, split) => {
                    const bill = bills.find(b => b.id === split.bill_id);
                    if (!bill || bill.is_paused) return sum;
                    return sum + convertAmount(split.amount, bill.frequency || "monthly", "weekly");
                  }, 0);
                }
              }

              return (
                <div key={member.id} className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-[10px] overflow-hidden shrink-0 bg-surface-elevated">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] font-bold font-mono text-muted">{member.avatar}</div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-body text-xs font-semibold text-foreground truncate">{member.name}</span>
                    <span className="font-mono text-[11px] font-bold text-primary truncate">
                      {formatCurrency(weeklyAmount)}<span className="text-subtle font-normal">/wk</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}
    </div>
  );
});

HealthScoreCard.displayName = "HealthScoreCard";
export default HealthScoreCard;
