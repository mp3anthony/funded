"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useApp, type Member, type Bill, type PaySchedule } from "@/context/AppContext";
import { type HouseholdContribution } from "@/types";
import Dialog from "@/components/ui/Dialog";
import { convertAmount } from "@/lib/utils";

interface ContributionSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  householdMembers: Member[];
  contributions: HouseholdContribution[];
}

export default function ContributionSettingsSheet({
  isOpen,
  onClose,
  householdMembers,
  contributions,
}: ContributionSettingsSheetProps) {
  const { setContribution, bills, paySchedules, calculateAveragePay } = useApp();

  if (!isOpen) return null;

  // Calculate total monthly contribution
  const totalMonthly = contributions.reduce((sum, c) => {
    let monthlyAmount = Number(c.amount) || 0;
    if (c.frequency === "weekly") {
      monthlyAmount = monthlyAmount * 4.33;
    } else if (c.frequency === "fortnightly") {
      monthlyAmount = monthlyAmount * 2.16;
    }
    return sum + monthlyAmount;
  }, 0);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Joint Fund Contributions"
      footer={
        <div className="w-full flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-subtle uppercase tracking-wider block font-mono">
              Total Household Budget
            </span>
            <span className="text-xs text-muted font-body">
              Normalized combined contribution
            </span>
          </div>
          <div className="text-right">
            <span className="text-xl font-heading font-extrabold text-primary font-mono block">
              ${totalMonthly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-muted uppercase font-mono">
              per month
            </span>
          </div>
        </div>
      }
    >
      {/* Suggest Split */}
      <SuggestSplitPanel
        householdMembers={householdMembers}
        bills={bills}
        paySchedules={paySchedules}
        calculateAveragePay={calculateAveragePay}
        setContribution={setContribution}
      />

      {/* Members Rows */}
      <div className="divide-y divide-white/5 -my-1">
        {householdMembers.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted">
            No household members added yet.
          </div>
        ) : (
          householdMembers.map((member) => {
            const existing = contributions.find((c) => String(c.member_id) === String(member.id));
            return (
              <MemberContributionRow
                key={member.id}
                member={member}
                existing={existing}
                onSave={async (amount, frequency) => {
                  await setContribution(String(member.id), amount, frequency);
                }}
              />
            );
          })
        )}
      </div>
    </Dialog>
  );
}

interface MemberContributionRowProps {
  member: Member;
  existing?: HouseholdContribution;
  onSave: (amount: number, frequency: "weekly" | "fortnightly" | "monthly") => Promise<void>;
}

function MemberContributionRow({
  member,
  existing,
  onSave,
}: MemberContributionRowProps) {
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "fortnightly" | "monthly">("monthly");
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setAmount(String(existing.amount));
      setFrequency(existing.frequency);
      setIsSaved(true);
    } else {
      setAmount("");
      setFrequency("monthly");
      setIsSaved(false);
    }
  }, [existing]);

  const isValid = amount !== "" && !isNaN(Number(amount)) && Number(amount) > 0;

  const getConversions = () => {
    const val = Number(amount) || 0;
    let w = 0;
    let f = 0;
    let m = 0;

    if (frequency === "weekly") {
      w = val;
      f = val * 2;
      m = val * 4.33;
    } else if (frequency === "fortnightly") {
      w = val / 2;
      f = val;
      m = val * 2.16;
    } else if (frequency === "monthly") {
      w = val / 4.33;
      f = val / 2.16;
      m = val;
    }

    return {
      weekly: w,
      "fortnightly": f,
      monthly: m,
    };
  };

  const conversions = getConversions();

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    try {
      await onSave(Number(amount), frequency);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="py-5 flex flex-col space-y-3">
      {/* Member Name */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name} className="h-6 w-6 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-primary to-emerald-500 flex items-center justify-center text-foreground font-bold text-[10px] shrink-0">
              {member.avatar || member.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold text-foreground truncate pr-2">
            {member.name}
          </span>
        </div>
        {existing && (
          <span className="text-[10px] font-mono text-muted uppercase">
            Active: ${Number(existing.amount).toFixed(2)} / {existing.frequency}
          </span>
        )}
      </div>

      {/* Inputs row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Frequency Segmented Control */}
        <div className="grid grid-cols-3 gap-1 bg-background border border-border rounded-[2px] p-1 shrink-0">
          {(["weekly", "fortnightly", "monthly"] as const).map((freq) => (
            <button
              key={freq}
              type="button"
              onClick={() => {
                setFrequency(freq);
                setIsSaved(false);
              }}
              className={`py-1.5 px-3 rounded-[2px] text-[10px] font-bold uppercase tracking-wider transition-all ${
                frequency === freq
                  ? "bg-primary text-primary-fg shadow"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              {freq === "fortnightly" ? "Fortnight" : freq === "weekly" ? "Week" : "Month"}
            </button>
          ))}
        </div>

        {/* Amount Input */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono text-xs">$</span>
          <input
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setIsSaved(false);
            }}
            className="w-full bg-background border border-border rounded-[2px] pl-6 pr-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            required
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isValid || isSaving}
          className={`py-2 px-4 rounded-[2px] font-heading text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 shrink-0 ${
            isSaved
              ? "bg-primary/25 text-primary border border-primary/30"
              : isValid
              ? "bg-primary text-primary-fg hover:brightness-110 active:scale-95 cursor-pointer"
              : "bg-surface-raised text-zinc-500 cursor-not-allowed"
          }`}
        >
          {isSaving ? (
            <span>Saving...</span>
          ) : isSaved ? (
            <>
              <Check size={12} />
              <span>Saved</span>
            </>
          ) : (
            <span>Save</span>
          )}
        </button>
      </div>

      {/* Frequency Equivalents Display */}
      {isValid && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 px-1 font-mono text-[10px]">
          <span className={frequency === "weekly" ? "text-primary font-bold animate-pulse" : "text-muted"}>
            Weekly: ${conversions.weekly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={frequency === "fortnightly" ? "text-primary font-bold animate-pulse" : "text-muted"}>
            Fortnightly: ${conversions["fortnightly"].toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={frequency === "monthly" ? "text-primary font-bold animate-pulse" : "text-muted"}>
            Monthly: ${conversions.monthly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Suggest Split — income-proportional contribution calculator
   ═══════════════════════════════════════════════ */

type PayFrequency = "weekly" | "fortnightly" | "monthly";

// A member with at least one pay schedule and no history gaps: their income
// resolved to a monthly figure, plus the frequency their own contribution
// should be applied at.
interface MemberIncomeResult {
  member: Member;
  blocked: false;
  monthlyIncome: number;
  ownFrequency: PayFrequency;
}

// A member the split cannot be computed for yet, and why.
interface MemberBlockedResult {
  member: Member;
  blocked: true;
  reason: "missing pay schedule" | "not enough pay history yet";
}

type MemberSplitInput = MemberIncomeResult | MemberBlockedResult;

/**
 * Resolves each household member's monthly-normalized income from their pay
 * schedules, per the agreed #106 algorithm:
 * - No pay schedules at all → blocked ("missing pay schedule").
 * - Each fixed-amount schedule contributes its own amount, converted to
 *   monthly, summed individually.
 * - All of a member's variable schedules are pooled rather than converted
 *   one-by-one: calculateAveragePay(member) is scoped to the member, not to
 *   any single schedule, so it returns the same blended average no matter
 *   which schedule asks for it. Calling it once per variable schedule would
 *   count that same average multiple times. Instead it's called exactly
 *   once per member (if the member has any variable schedules at all). No
 *   average yet (fewer than 3 logged pays) → blocked ("not enough pay
 *   history yet"). Otherwise the average is converted to monthly exactly
 *   once, using the frequency of whichever variable schedule was created
 *   most recently, and added to the member's income once.
 * - A member's "own pay frequency" (used later to apply a recommendation at
 *   their own cadence) is their single schedule's frequency, or — for a
 *   member with more than one schedule (e.g. two jobs) — the frequency of
 *   whichever schedule was created most recently, across ALL of their
 *   schedules (fixed and variable alike). The issue doesn't specify a
 *   tie-break for the multi-schedule case beyond "reasonable", so recency
 *   of created_at is the chosen rule.
 */
function computeMemberIncomes(
  members: Member[],
  paySchedules: PaySchedule[],
  calculateAveragePay: (memberId: string) => number | null
): MemberSplitInput[] {
  return members.map((member) => {
    const schedules = paySchedules.filter((s) => String(s.member_id) === String(member.id));

    if (schedules.length === 0) {
      return { member, blocked: true, reason: "missing pay schedule" };
    }

    const fixedSchedules = schedules.filter((s) => s.is_fixed_amount);
    const variableSchedules = schedules.filter((s) => !s.is_fixed_amount);

    let monthlyIncome = 0;
    for (const schedule of fixedSchedules) {
      monthlyIncome += convertAmount(schedule.amount ?? 0, schedule.frequency, "monthly");
    }

    // calculateAveragePay is scoped to the member (not per-schedule) — it
    // returns the same blended average regardless of which variable schedule
    // asks for it. Call it once per member, not once per variable schedule,
    // or a member with 2+ variable schedules gets the same average counted
    // multiple times and their income (and split %) is silently inflated.
    if (variableSchedules.length > 0) {
      const avg = calculateAveragePay(String(member.id));
      if (avg === null) {
        return { member, blocked: true, reason: "not enough pay history yet" };
      }
      const mostRecentVariable = [...variableSchedules].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      monthlyIncome += convertAmount(avg, mostRecentVariable.frequency, "monthly");
    }

    let ownFrequency: PayFrequency;
    if (schedules.length === 1) {
      ownFrequency = schedules[0].frequency;
    } else {
      const mostRecent = [...schedules].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      ownFrequency = mostRecent.frequency;
    }

    return { member, blocked: false, monthlyIncome, ownFrequency };
  });
}

interface SuggestSplitPanelProps {
  householdMembers: Member[];
  bills: Bill[];
  paySchedules: PaySchedule[];
  calculateAveragePay: (memberId: string) => number | null;
  setContribution: (memberId: string, amount: number, frequency: PayFrequency) => Promise<void>;
}

function SuggestSplitPanel({
  householdMembers,
  bills,
  paySchedules,
  calculateAveragePay,
  setContribution,
}: SuggestSplitPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const memberIncomes = useMemo(
    () => computeMemberIncomes(householdMembers, paySchedules, calculateAveragePay),
    [householdMembers, paySchedules, calculateAveragePay]
  );

  const blockedMembers = memberIncomes.filter((r): r is MemberBlockedResult => r.blocked);
  const unblockedMembers = memberIncomes.filter((r): r is MemberIncomeResult => !r.blocked);

  // Mirrors calculateHealthScore's totalMonthlyExpenses calc exactly (active
  // bills only, converted to monthly) so this split's total never silently
  // drifts from the health score's number.
  const totalMonthlyBills = useMemo(() => {
    return bills
      .filter((b) => !b.is_paused)
      .reduce((sum, bill) => sum + convertAmount(bill.amount || 0, bill.frequency || "monthly", "monthly"), 0);
  }, [bills]);

  const totalHouseholdMonthlyIncome =
    blockedMembers.length === 0 ? unblockedMembers.reduce((sum, r) => sum + r.monthlyIncome, 0) : 0;

  const splitResults = useMemo(() => {
    if (blockedMembers.length > 0) return [];
    return unblockedMembers.map((r) => {
      const splitPct = totalHouseholdMonthlyIncome > 0 ? r.monthlyIncome / totalHouseholdMonthlyIncome : 0;
      const recommendedMonthly = splitPct * totalMonthlyBills;
      return { ...r, splitPct, recommendedMonthly };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberIncomes, totalHouseholdMonthlyIncome, totalMonthlyBills]);

  if (householdMembers.length === 0) return null;

  return (
    <div className="mb-4 pb-5 border-b border-white/5">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between py-2 px-3 rounded-[2px] border border-border bg-background hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
          <Sparkles size={12} className="text-primary" />
          Suggest Split
        </span>
        {isExpanded ? (
          <ChevronUp size={14} className="text-muted" />
        ) : (
          <ChevronDown size={14} className="text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {blockedMembers.length > 0 ? (
            <div className="rounded-[2px] border border-border bg-background px-3 py-3 space-y-1.5">
              <p className="text-xs text-muted font-body">
                Can&apos;t suggest a split yet — set these up first:
              </p>
              <ul className="space-y-1">
                {blockedMembers.map((b) => (
                  <li key={b.member.id} className="text-xs font-body text-foreground">
                    <span className="font-semibold">{b.member.name}</span>{" "}
                    {b.reason === "missing pay schedule"
                      ? "hasn't set up a pay schedule yet."
                      : "doesn't have enough pay history yet (needs at least 3 logged pays)."}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              {splitResults.map((r) => (
                <SuggestedSplitRow
                  key={r.member.id}
                  result={r}
                  onApply={(amount, frequency) => setContribution(String(r.member.id), amount, frequency)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SuggestedSplitRowProps {
  result: MemberIncomeResult & { splitPct: number; recommendedMonthly: number };
  onApply: (amount: number, frequency: PayFrequency) => Promise<void>;
}

function SuggestedSplitRow({ result, onApply }: SuggestedSplitRowProps) {
  const { member, splitPct, recommendedMonthly, ownFrequency } = result;
  const [isApplying, setIsApplying] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const weekly = convertAmount(recommendedMonthly, "monthly", "weekly");
  const fortnightly = convertAmount(recommendedMonthly, "monthly", "fortnightly");
  const monthly = recommendedMonthly;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const amountAtOwnFrequency = convertAmount(recommendedMonthly, "monthly", ownFrequency);
      await onApply(amountAtOwnFrequency, ownFrequency);
      setIsApplied(true);
      setTimeout(() => setIsApplied(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="rounded-[2px] border border-border bg-background px-3 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.name} className="h-6 w-6 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-primary to-emerald-500 flex items-center justify-center text-foreground font-bold text-[10px] shrink-0">
              {member.avatar || member.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold text-foreground truncate pr-2">{member.name}</span>
        </div>
        <span className="text-[10px] font-mono text-primary font-bold uppercase">
          {(splitPct * 100).toFixed(1)}%
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 font-mono text-[10px] text-muted">
        <span>Weekly: ${weekly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span>
          Fortnightly: ${fortnightly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span>Monthly: ${monthly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      <button
        onClick={handleApply}
        disabled={isApplying}
        className={`self-start py-1.5 px-4 rounded-[2px] font-heading text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
          isApplied
            ? "bg-primary/25 text-primary border border-primary/30"
            : "bg-primary text-primary-fg hover:brightness-110 active:scale-95 cursor-pointer"
        }`}
      >
        {isApplying ? (
          <span>Applying...</span>
        ) : isApplied ? (
          <>
            <Check size={12} />
            <span>Applied</span>
          </>
        ) : (
          <span>Apply &mdash; {ownFrequency}</span>
        )}
      </button>
    </div>
  );
}
