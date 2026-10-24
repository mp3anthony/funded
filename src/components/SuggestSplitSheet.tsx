"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useApp, type Member } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Dialog from "@/components/ui/Dialog";
import { useCountUp } from "@/hooks/useCountUp";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { convertAmount, sumActiveFixedContributionRules } from "@/lib/utils";
import { countsTowardTotals } from "@/lib/billCycle";
import { SAVE_ERROR_MESSAGE, settleSave } from "@/lib/sheetSave";
import {
  computeMemberIncomes,
  computeSplit,
  defaultSplitBills,
  percentLabel,
  percentFigure,
  type MemberBlockedResult,
  type SplitRow,
} from "@/lib/suggestSplit";

/* Compare split (R23, #410): an animated pop-up that walks through the
   income-proportional split in three steps (Income, Share, then Contribute in
   Joint Fund or Cover in Direct Pay). Rules live in lib/suggestSplit.ts. */

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Matches --duration-structural.
const GROW_MS = 550;

function Avatar({ member }: { member: Member }) {
  return member.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={member.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
  ) : (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-emerald-500 text-[13px] font-bold text-primary-fg">
      {member.avatar || member.name.charAt(0).toUpperCase()}
    </div>
  );
}

/** A number that counts up to its value (instant with Reduce Motion). */
function Figure({
  value,
  format,
  reduced,
}: {
  value: number;
  format: (n: number) => string;
  reduced: boolean;
}) {
  const live = useCountUp(value, GROW_MS, true);
  return <>{format(reduced ? value : live)}</>;
}

/** A bar that grows from nothing to its width (fixed width with Reduce Motion). */
function Bar({ fraction, reduced }: { fraction: number; reduced: boolean }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  const shown = reduced || grown ? pct : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated" aria-hidden="true">
      <div
        className="h-full rounded-full bg-primary"
        style={{
          width: `${shown}%`,
          transition: reduced ? "none" : `width var(--duration-structural) var(--ease-enter)`,
        }}
      />
    </div>
  );
}

const STEPS_JOINT = ["Income", "Share", "Contribute"] as const;
const STEPS_DIRECT = ["Income", "Share", "Cover"] as const;

interface SuggestSplitSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function SuggestSplitSheet({ open, onClose }: SuggestSplitSheetProps) {
  const {
    householdMembers,
    bills,
    billSplits,
    expenses,
    contributionRules,
    paySchedules,
    calculateAveragePay,
    setContribution,
    applyDirectPaySplits,
    isJointFund,
    showToast,
  } = useApp();
  const reduced = useReducedMotion();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedMembers, setAppliedMembers] = useState<string[]>([]);
  const [appliedBills, setAppliedBills] = useState(0);

  // Fresh each time the pop-up opens (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStep(0);
      setError(null);
      setAppliedMembers([]);
      setAppliedBills(0);
    }
  }

  const results = useMemo(
    () => computeMemberIncomes(householdMembers, paySchedules, calculateAveragePay, convertAmount),
    [householdMembers, paySchedules, calculateAveragePay]
  );
  const blocked = results.filter((r): r is MemberBlockedResult<Member> => r.blocked);

  // Total monthly spend the split covers: active bills, expenses (a flat weekly
  // figure) and active fixed-$ rules. Same maths as before R23 (issue #98).
  const totalMonthlyBills = useMemo(() => {
    const billsTotal = bills
      .filter(countsTowardTotals)
      .reduce((sum, bill) => sum + convertAmount(bill.amount || 0, bill.frequency || "monthly", "monthly"), 0);
    const expensesTotal = expenses.reduce((sum, e) => sum + convertAmount(e.amount, "weekly", "monthly"), 0);
    const rulesTotal = sumActiveFixedContributionRules(contributionRules, paySchedules, "monthly");
    return billsTotal + expensesTotal + rulesTotal;
  }, [bills, expenses, contributionRules, paySchedules]);

  const rows: SplitRow<Member>[] = useMemo(
    () => computeSplit(results, totalMonthlyBills, convertAmount),
    [results, totalMonthlyBills]
  );

  // Direct Pay: which bills "Apply" may fill in, and how many keep a custom split.
  const defaultBills = useMemo(() => defaultSplitBills(bills, billSplits), [bills, billSplits]);
  const customCount = useMemo(() => {
    const onDefault = new Set(defaultBills.map((b) => String(b.id)));
    return bills.filter(
      (b) => b.assignee_id && b.dueLabel !== "One-off" && !onDefault.has(String(b.id))
    ).length;
  }, [bills, defaultBills]);

  const steps = isJointFund ? STEPS_JOINT : STEPS_DIRECT;
  const lastStep = steps.length - 1;
  const maxWeekly = Math.max(1, ...rows.map((r) => r.weeklyIncome));

  const fail = () => setError(SAVE_ERROR_MESSAGE);

  const applyMember = async (row: SplitRow<Member>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await settleSave(() =>
      setContribution(String(row.member.id), Math.round(row.ownFrequencyDollars * 100) / 100, row.ownFrequency)
    );
    setBusy(false);
    if (!result.ok) return fail();
    setAppliedMembers((prev) => [...prev, String(row.member.id)]);
    showToast({ message: "Contribution updated" });
  };

  const applyBills = async () => {
    if (busy || defaultBills.length === 0) return;
    setBusy(true);
    setError(null);
    const shares: Record<string, number> = {};
    for (const r of rows) shares[String(r.member.id)] = r.share;
    const n = defaultBills.length;
    const result = await settleSave(() => applyDirectPaySplits(defaultBills.map((b) => String(b.id)), shares));
    setBusy(false);
    if (!result.ok) {
      // A part-saved run says how far it got; other failures use the shared line.
      if (result.thrownMessage?.startsWith("Saved ")) setError(result.thrownMessage);
      else fail();
      return;
    }
    setAppliedBills((prev) => prev + n);
    showToast({ message: `Splits applied to ${n} ${n === 1 ? "bill" : "bills"}` });
  };

  const showSteps = householdMembers.length > 0 && blocked.length === 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Compare split"
      placement="bottom"
      busy={busy}
      error={error}
      subheader={
        showSteps ? (
          <div className="flex gap-2 overflow-x-auto px-5 pb-3" role="group" aria-label="Steps">
            {steps.map((label, i) => (
              <Chip key={label} selected={i === step} disabled={busy} onClick={() => setStep(i)}>
                {label}
              </Chip>
            ))}
          </div>
        ) : undefined
      }
      footer={
        showSteps ? (
          <div className="flex w-full gap-2">
            <Button variant="ghost" className="flex-1" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            {step < lastStep ? (
              <Button className="flex-1" disabled={busy} onClick={() => setStep(step + 1)}>
                Next
              </Button>
            ) : (
              <Button className="flex-1" disabled={busy} onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {!showSteps ? (
        <div className="space-y-2">
          {householdMembers.length === 0 ? (
            <p className="text-sm text-muted">No one to compare yet.</p>
          ) : (
            <>
              <p className="text-sm text-muted">Can&apos;t suggest a split yet. Set these up first:</p>
              <ul className="space-y-1">
                {blocked.map((b) => (
                  <li key={b.member.id} className="text-sm text-foreground">
                    <span className="font-semibold">{b.member.name}</span>{" "}
                    {b.reason === "missing pay schedule"
                      ? "hasn't set up a pay schedule yet."
                      : "doesn't have enough pays yet (needs at least 2 confirmed pays)."}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <div key={step} className="space-y-5">
          {step === 0 && (
            <>
              <p className="text-sm text-muted">What each person earns, as a weekly figure.</p>
              {rows.map((r) => (
                <MemberLine key={r.member.id} member={r.member} figure={
                  <><Figure value={r.weeklyIncome} format={money} reduced={reduced} /> a week</>
                }>
                  <Bar fraction={r.weeklyIncome / maxWeekly} reduced={reduced} />
                </MemberLine>
              ))}
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-muted">Each person&apos;s part of the household&apos;s income.</p>
              {rows.map((r) => (
                <MemberLine key={r.member.id} member={r.member} figure={
                  <Figure
                    value={r.share * 100}
                    format={percentFigure(r.share)}
                    reduced={reduced}
                  />
                }>
                  <Bar fraction={r.share} reduced={reduced} />
                </MemberLine>
              ))}
            </>
          )}

          {step === 2 && isJointFund && (
            <>
              <p className="text-sm text-muted">
                A fair part of {money(convertAmount(totalMonthlyBills, "monthly", "weekly"))} a week in bills, expenses and set rules.
              </p>
              {rows.map((r) => {
                const done = appliedMembers.includes(String(r.member.id));
                return (
                  <MemberLine key={r.member.id} member={r.member} figure={
                    <><Figure value={r.weeklyDollars} format={money} reduced={reduced} /> a week</>
                  }>
                    <Bar fraction={r.share} reduced={reduced} />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-muted">
                        Contribute {money(r.weeklyDollars)} a week
                        {r.ownFrequency !== "weekly" && `, ${money(r.ownFrequencyDollars)} each ${r.ownFrequency === "fortnightly" ? "fortnight" : "month"}`}
                      </span>
                      <Button
                        variant={done ? "ghost" : "primary"}
                        className="min-h-9 shrink-0 px-4 text-[15px]"
                        disabled={busy}
                        onClick={() => applyMember(r)}
                      >
                        {done ? (
                          <>
                            <Check size={16} strokeWidth={3} /> Applied
                          </>
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                  </MemberLine>
                );
              })}
            </>
          )}

          {step === 2 && !isJointFund && (
            <>
              <p className="text-sm text-muted">
                Each person covers their share of every bill that has no custom split.
              </p>
              {rows.map((r) => (
                <MemberLine key={r.member.id} member={r.member} figure={
                  <Figure value={r.share * 100} format={percentFigure(r.share)} reduced={reduced} />
                }>
                  <Bar fraction={r.share} reduced={reduced} />
                  <p className="mt-2 text-xs text-muted">
                    Cover {percentLabel(r.share)} of each bill, about {money(r.monthlyDollars)} a month of shared costs.
                  </p>
                </MemberLine>
              ))}
              <div className="space-y-2">
                {customCount > 0 && (
                  <p className="text-sm text-muted">
                    {customCount} {customCount === 1 ? "bill keeps" : "bills keep"} a custom split and {customCount === 1 ? "is" : "are"} left alone.
                  </p>
                )}
                {defaultBills.length === 0 && (
                  <p className="text-sm text-muted">
                    {appliedBills > 0
                      ? `Applied to ${appliedBills} ${appliedBills === 1 ? "bill" : "bills"}.`
                      : "No bills are on the default split, so there is nothing to apply."}
                  </p>
                )}
                <Button fullWidth disabled={busy || defaultBills.length === 0} onClick={applyBills}>
                  {busy
                    ? "Applying…"
                    : `Apply to ${defaultBills.length} ${defaultBills.length === 1 ? "bill" : "bills"}`}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}

function MemberLine({
  member,
  figure,
  children,
}: {
  member: Member;
  figure: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-border bg-surface-raised p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar member={member} />
          <span className="truncate text-base font-semibold text-foreground">{member.name}</span>
        </div>
        <span className="shrink-0 text-base font-bold tabular-nums text-foreground">{figure}</span>
      </div>
      {children}
    </div>
  );
}
