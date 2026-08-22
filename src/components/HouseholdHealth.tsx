"use client";

import { useApp } from "@/context/AppContext";

export default function HouseholdHealth() {
  const { paySchedules, payHistory, bills, funds } = useApp();

  // 1. Calculate Total Income
  // #95: the `paydays` table is orphaned — PR #86 (#82) redirected onboarding
  // to write pay_schedules instead, so `paydays` never gets new rows and this
  // card's income figure silently drifted from the real Payday tab. Read from
  // paySchedules/payHistory instead, the same source HealthScoreCard already
  // uses for its own income figures: a fixed-amount schedule contributes its
  // set amount, a variable one contributes its most recently logged pay (or 0
  // if none has been logged yet).
  const totalIncome = paySchedules.reduce((sum, schedule) => {
    let amount = schedule.amount || 0;
    if (!schedule.is_fixed_amount) {
      const historyItems = payHistory.filter((h) => h.pay_schedule_id === schedule.id);
      if (historyItems.length > 0) {
        historyItems.sort((a, b) => new Date(b.pay_date).getTime() - new Date(a.pay_date).getTime());
        amount = historyItems[0].amount;
      } else {
        amount = 0;
      }
    }
    return sum + amount;
  }, 0);

  if (totalIncome === 0 || paySchedules.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
        <p className="text-xs font-semibold text-muted tracking-wider uppercase font-mono">
          household combined income incomplete
        </p>
      </div>
    );
  }

  // 2. Calculate Total Expenses (all bills + sum of all funds)
  const totalBills = bills.reduce((sum, b) => sum + b.amount, 0);
  const totalFunds = funds.reduce((sum, f) => sum + f.currentAmount, 0);
  const totalExpenses = totalBills + totalFunds;

  // 3. Calculate Surplus
  const surplus = totalIncome - totalExpenses;

  // 4. Calculate Health Percentage
  const healthPercent = (surplus / totalIncome) * 100;

  // 5. Grading logic & colors
  let grade = "Healthy";
  let gradeColorClass = "text-primary"; // Lime Green

  if (healthPercent > 20) {
    grade = "Healthy";
    gradeColorClass = "text-primary";
  } else if (healthPercent >= 10 && healthPercent <= 20) {
    grade = "Stable";
    gradeColorClass = "text-[#38bdf8]"; // Sky Blue
  } else if (healthPercent >= 0 && healthPercent < 10) {
    grade = "Stressed";
    gradeColorClass = "text-[#a855f7]"; // Rich Purple
  } else {
    grade = "Running Under";
    gradeColorClass = "text-[#ff4500]"; // Lava Orange
  }

  const formatCurrency = (amount: number) => {
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);
    const formatted = absoluteAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${isNegative ? "-" : ""}$${formatted}`;
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-subtle font-mono">
          Household Health
        </span>
        <span className={`text-xl font-extrabold tracking-tight font-heading ${gradeColorClass}`}>
          {grade}
        </span>
      </div>
      <div className="text-xs font-semibold text-muted tracking-wider uppercase font-mono">
        household surplus after bills:{" "}
        <span className="text-foreground font-bold font-mono">
          {formatCurrency(surplus)}
        </span>
      </div>
    </div>
  );
}
