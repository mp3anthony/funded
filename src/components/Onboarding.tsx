"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, useCurrentUser } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import { Calendar, Receipt, ArrowRight, ArrowLeft, Check, Target } from "lucide-react";
import JoinHouseholdSheet from "./JoinHouseholdSheet";
import OnboardingStep from "./OnboardingStep";
import OnboardingWelcome from "./OnboardingWelcome";
import OnboardingCreateFlow from "./OnboardingCreateFlow";
import {
  TOTAL_STEPS,
  isPaydayValid,
  isBillValid,
  isGoalValid,
  footerFor,
  summaryCell,
  type SummaryCell,
} from "@/lib/onboarding";

const inputClass =
  "w-full px-4 py-3 rounded-[2px] bg-surface-raised border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all disabled:opacity-60";
const moneyInputClass =
  "w-full pl-8 pr-4 py-3 rounded-[2px] bg-surface-raised border border-border text-primary text-sm font-semibold focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all disabled:opacity-60";
const dateInputClass =
  "w-full min-w-0 px-4 py-3 rounded-[2px] bg-surface-raised border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all disabled:opacity-60";
const labelClass =
  "block text-xs font-semibold tracking-wider uppercase text-subtle";
const fieldsetClass = "space-y-4 min-w-0 border-0 p-0 m-0";

function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function summaryText(cell: SummaryCell) {
  if (cell.kind === "skipped") return "Skipped";
  if (cell.kind === "variable") return "Variable";
  return money(cell.amount);
}

function errMsg(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function SavedNote({ where }: { where: string }) {
  return <p className="text-xs text-primary">Saved. You can change it later on the {where} page.</p>;
}

export default function Onboarding() {
  const { addPaySchedule, addBill, addFund, completeOnboarding, createHousehold, householdName, isJointFund } = useApp();
  const currentUser = useCurrentUser();
  const router = useRouter();

  // Welcome and the create flow come first; the tail (payday, bill, goal, done)
  // only starts once the household exists.
  const [phase, setPhase] = useState<"welcome" | "create" | "tail">("welcome");
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isJoinSheetOpen, setIsJoinSheetOpen] = useState(false);
  // True once createHousehold succeeded. Guards against calling it a second
  // time: re-creating would take createHousehold's adopt-existing path, which
  // flips isOnboarded and unmounts the wizard mid-flow.
  const householdCreatedRef = useRef(false);

  async function createFromFlow(name: string, jointFund: boolean) {
    if (householdCreatedRef.current) return;
    await createHousehold(name, jointFund);
    householdCreatedRef.current = true;
  }

  /* Step 1 — Payday */
  const [paydayDate, setPaydayDate] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payFrequency, setPayFrequency] = useState<"weekly" | "fortnightly" | "monthly">("monthly");
  const [isFixedPay, setIsFixedPay] = useState(true);
  // Note (#84): the real Payday tab also has a Household Member dropdown.
  // Omitted here on purpose — at this point in onboarding the current user
  // is the only household member, so member stays implicit as currentUser.id.

  /* Step 2 — First Bill (name, amount, frequency, due date only) */
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billFrequency, setBillFrequency] = useState("monthly");
  const [billDueDate, setBillDueDate] = useState("");
  // Note (#83, #248): the real Add Bill card also has category, invoice date,
  // payment type, notes, an Assignee dropdown and a "Paid By"/splits section.
  // All omitted on purpose — confusing on day one, editable later. Saved as
  // category "Other", Manual, assignee currentUser.id, no splits.

  /* Step 3 — First Goal */
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");

  // Snapshots of what was actually written (null = skipped / not saved). The
  // Setup Complete summary reads these, and a saved step goes read-only so
  // Back then Next can't write a duplicate.
  const [saved, setSaved] = useState<{
    payday: { isFixed: boolean; amount: number } | null;
    bill: { amount: number } | null;
    goal: { amount: number } | null;
  }>({ payday: null, bill: null, goal: null });

  const stepSaved =
    currentStep === 1
      ? saved.payday !== null
      : currentStep === 2
        ? saved.bill !== null
        : currentStep === 3
          ? saved.goal !== null
          : false;

  /* ── Navigation ─────────────────────────────── */
  function advance() {
    setStepError(null);
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  async function handleNext() {
    if (currentStep === 1 && !saved.payday) {
      setIsSaving(true);
      setStepError(null);
      try {
        const amount = isFixedPay ? parseFloat(payAmount) : 0;
        await addPaySchedule({
          member_id: String(currentUser.id),
          frequency: payFrequency,
          is_fixed_amount: isFixedPay,
          amount: isFixedPay ? amount : null,
          next_pay_date: paydayDate,
        });
        setSaved((s) => ({ ...s, payday: { isFixed: isFixedPay, amount } }));
      } catch (err) {
        setStepError(errMsg(err));
        return;
      } finally {
        setIsSaving(false);
      }
    }

    if (currentStep === 2 && !saved.bill) {
      setIsSaving(true);
      setStepError(null);
      try {
        const amount = parseFloat(billAmount);
        // Same shape addBill() reads/inserts as the Add flow's buildBillPayload (lib/addFlow.ts),
        // so a bill created here lands identically in the `bills` table.
        await addBill(
          {
            name: billName.trim(),
            amount,
            category: "Other",
            invoiceDate: "",
            dueDate: billDueDate,
            paymentType: "Manual",
            assignee: String(currentUser.id),
            notes: "",
            frequency: billFrequency,
          },
          []
        );
        setSaved((s) => ({ ...s, bill: { amount } }));
      } catch (err) {
        setStepError(errMsg(err));
        return;
      } finally {
        setIsSaving(false);
      }
    }

    if (currentStep === 3 && !saved.goal) {
      setIsSaving(true);
      setStepError(null);
      try {
        const target = parseFloat(goalTarget);
        // Same shape AddGoalFlow writes for a new goal. addFund throws on a
        // failed insert, so a failure lands in the catch below.
        await addFund({
          id: Date.now(), // placeholder, the database assigns the real id
          name: goalName.trim(),
          category: "Savings",
          currentAmount: 0,
          targetAmount: target,
          deadline: null,
          status: "not_started",
        });
        setSaved((s) => ({ ...s, goal: { amount: target } }));
      } catch (err) {
        setStepError(errMsg(err));
        return;
      } finally {
        setIsSaving(false);
      }
    }

    advance();
  }

  function handleBack() {
    setStepError(null);
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  /* ── Can proceed? ──────────────────────────── */
  function canProceed(): boolean {
    if (stepSaved) return true; // Already written; Next just advances
    if (currentStep === 1) return isPaydayValid({ date: paydayDate, isFixed: isFixedPay, amount: payAmount });
    if (currentStep === 2) return isBillValid({ name: billName, amount: billAmount, dueDate: billDueDate });
    if (currentStep === 3) return isGoalValid({ name: goalName, target: goalTarget });
    return true;
  }

  const footer = footerFor(currentStep, { saved: stepSaved });
  /* ── Step icons for progress ───────────────── */
  const stepIcons = [Calendar, Receipt, Target, Check];

  const summaryCells: { label: string; text: string; muted: boolean }[] = [
    { label: "Payday", ...summarise(summaryCell(saved.payday)) },
    { label: "First Bill", ...summarise(summaryCell(saved.bill)) },
    { label: "Goal", ...summarise(summaryCell(saved.goal)) },
    { label: "Mode", text: isJointFund ? "Joint Fund" : "Direct Pay", muted: false },
  ];

  function summarise(cell: SummaryCell) {
    return { text: summaryText(cell), muted: cell.kind === "skipped" };
  }

  if (phase === "welcome") {
    return (
      <>
        <OnboardingWelcome onCreate={() => setPhase("create")} onJoin={() => setIsJoinSheetOpen(true)} />
        <JoinHouseholdSheet isOpen={isJoinSheetOpen} onClose={() => setIsJoinSheetOpen(false)} />
      </>
    );
  }

  if (phase === "create") {
    return (
      <OnboardingCreateFlow
        onCreate={createFromFlow}
        onDone={() => setPhase("tail")}
        onExit={() => setPhase("welcome")}
      />
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
        {/* Scrolls when a step is taller than the screen; centres when it isn't. */}
        <div
          className="relative min-h-full flex items-center justify-center px-4"
          style={{
            paddingTop: "max(3.5rem, env(safe-area-inset-top))",
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="relative w-full max-w-lg">
            <button
              onClick={() => supabase.auth.signOut()}
              className="absolute -top-10 right-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-border bg-surface text-[10px] font-bold text-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer uppercase tracking-wider z-10"
            >
              Sign Out
            </button>
            {/* Card */}
            <div className="bg-surface border border-border rounded-[2px] shadow-2xl overflow-hidden">
              {/* Lime top progress bar */}
              <div className="h-1.5 bg-surface-raised">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
                />
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2.5 pt-6 pb-2">
                {stepIcons.map((Icon, i) => {
                  const stepNum = i + 1;
                  const isActive = stepNum === currentStep;
                  const isDone = stepNum < currentStep;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-center h-10 w-10 rounded-[2px] transition-all duration-300 ${
                        isActive
                          ? "bg-primary text-primary-fg shadow-lg shadow-primary/30 scale-110"
                          : isDone
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-raised text-subtle"
                      }`}
                    >
                      {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                  );
                })}
              </div>

              <p className="text-center text-[11px] font-semibold text-subtle uppercase tracking-widest pb-2">
                STEP {currentStep} / {TOTAL_STEPS}
              </p>

              {/* Step content */}
              <div className="px-6 sm:px-8 pb-6 pt-2 min-h-[280px] flex flex-col">
                {/* ── Step 1: Payday ── */}
                {currentStep === 1 && (
                  <OnboardingStep
                    title="Your Payday"
                    intro="When do you next get paid? We'll track it for you."
                    error={stepError}
                  >
                    <fieldset disabled={stepSaved || isSaving} className={fieldsetClass}>
                      <div className="space-y-2">
                        <label htmlFor="ob-paydate" className={labelClass}>
                          Next Payday Date
                        </label>
                        <input
                          id="ob-paydate"
                          type="date"
                          value={paydayDate}
                          onChange={(e) => setPaydayDate(e.target.value)}
                          className={dateInputClass}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="ob-payfreq" className={labelClass}>
                          Frequency
                        </label>
                        <select
                          id="ob-payfreq"
                          value={payFrequency}
                          onChange={(e) => setPayFrequency(e.target.value as "weekly" | "fortnightly" | "monthly")}
                          className={`${inputClass} appearance-none cursor-pointer`}
                        >
                          <option value="weekly">Weekly</option>
                          <option value="fortnightly">Fortnightly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="ob-paytype" className={labelClass}>
                          Pay Type
                        </label>
                        <select
                          id="ob-paytype"
                          value={isFixedPay ? "fixed" : "variable"}
                          onChange={(e) => setIsFixedPay(e.target.value === "fixed")}
                          className={`${inputClass} appearance-none cursor-pointer`}
                        >
                          <option value="fixed">Fixed Pay Amount</option>
                          <option value="variable">Variable Pay Amount</option>
                        </select>
                      </div>
                      {isFixedPay && (
                        <div className="space-y-2">
                          <label htmlFor="ob-payamount" className={labelClass}>
                            Pay Amount
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary text-sm">$</span>
                            <input
                              id="ob-payamount"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="2,500.00"
                              value={payAmount}
                              onChange={(e) => setPayAmount(e.target.value)}
                              className={moneyInputClass}
                            />
                          </div>
                        </div>
                      )}
                    </fieldset>
                    {stepSaved && <SavedNote where="Payday" />}
                  </OnboardingStep>
                )}

                {/* ── Step 2: First Bill ── */}
                {currentStep === 2 && (
                  <OnboardingStep
                    title="First Bill"
                    intro="Enter your first recurring bill so we can start tracking it."
                    error={stepError}
                  >
                    <fieldset disabled={stepSaved || isSaving} className={fieldsetClass}>
                      <div className="space-y-2">
                        <label htmlFor="ob-billname" className={labelClass}>
                          Bill Name
                        </label>
                        <input
                          id="ob-billname"
                          type="text"
                          placeholder="e.g. Rent, Electricity"
                          value={billName}
                          onChange={(e) => setBillName(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label htmlFor="ob-billamount" className={labelClass}>
                            Amount
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary text-sm">$</span>
                            <input
                              id="ob-billamount"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={billAmount}
                              onChange={(e) => setBillAmount(e.target.value)}
                              className={moneyInputClass}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="ob-billfreq" className={labelClass}>
                            Frequency
                          </label>
                          <select
                            id="ob-billfreq"
                            value={billFrequency}
                            onChange={(e) => setBillFrequency(e.target.value)}
                            className={`${inputClass} appearance-none cursor-pointer`}
                          >
                            <option value="weekly">Weekly</option>
                            <option value="fortnightly">Fortnightly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="ob-billduedate" className={labelClass}>
                          Due Date
                        </label>
                        <input
                          id="ob-billduedate"
                          type="date"
                          value={billDueDate}
                          onChange={(e) => setBillDueDate(e.target.value)}
                          className={dateInputClass}
                        />
                      </div>
                    </fieldset>
                    {stepSaved && <SavedNote where="Bills" />}
                  </OnboardingStep>
                )}

                {/* ── Step 3: First Goal ── */}
                {currentStep === 3 && (
                  <OnboardingStep
                    title="First Goal"
                    intro="Something to save towards, like a holiday or an emergency fund."
                    error={stepError}
                  >
                    <fieldset disabled={stepSaved || isSaving} className={fieldsetClass}>
                      <div className="space-y-2">
                        <label htmlFor="ob-goalname" className={labelClass}>
                          Goal Name
                        </label>
                        <input
                          id="ob-goalname"
                          type="text"
                          placeholder="e.g. Holiday, Emergency fund"
                          value={goalName}
                          onChange={(e) => setGoalName(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="ob-goaltarget" className={labelClass}>
                          Target Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary text-sm">$</span>
                          <input
                            id="ob-goaltarget"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="1,000.00"
                            value={goalTarget}
                            onChange={(e) => setGoalTarget(e.target.value)}
                            className={moneyInputClass}
                          />
                        </div>
                      </div>
                    </fieldset>
                    {stepSaved && <SavedNote where="Goals" />}
                  </OnboardingStep>
                )}

                {/* ── Step 4: Setup Complete ── */}
                {currentStep === 4 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                    {/* Lime-glow check */}
                    <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2px] bg-primary/15 border border-primary/40 text-primary shadow-lg shadow-primary/25">
                      <Check className="h-9 w-9" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                        Setup Complete
                      </h2>
                      <p className="text-sm text-muted max-w-xs mx-auto">
                        <span className="font-bold text-foreground">{householdName || "Your household"}</span> is ready to go.
                      </p>
                    </div>

                    {/* Summary of what was actually saved; skipped items read "Skipped". */}
                    <div className="w-full grid grid-cols-2 border-y border-border">
                      {summaryCells.map(({ label, text, muted }, i) => (
                        <div
                          key={label}
                          className={`flex flex-col items-center gap-1 py-3 px-2 border-border ${
                            i % 2 === 0 ? "border-r" : ""
                          } ${i < 2 ? "border-b" : ""}`}
                        >
                          <span className="text-[9px] uppercase tracking-wider text-subtle">{label}</span>
                          <span
                            className={`text-sm font-semibold truncate max-w-full ${
                              muted ? "text-subtle" : "text-primary"
                            }`}
                          >
                            {text}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-muted">
                      You can find the Getting started guide{" "}
                      <button
                        type="button"
                        onClick={() => {
                          // Finish onboarding first, else the wizard remounts at Welcome on return.
                          completeOnboarding();
                          router.push("/getting-started");
                        }}
                        className="underline text-primary hover:brightness-110 cursor-pointer"
                      >
                        here
                      </button>
                    </p>
                  </div>
                )}
              </div>

              {/* ── Footer navigation ────── */}
              {footer.primary === "enter" ? (
                <div className="px-6 sm:px-8 pb-6 flex justify-center">
                  <button
                    onClick={completeOnboarding}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-[2px] bg-primary text-primary-fg text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    Enter App
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="px-6 sm:px-8 pb-6 flex items-center justify-between gap-2">
                  {footer.showBack ? (
                    <button
                      onClick={handleBack}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-[2px] border border-border text-sm font-bold text-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                  ) : (
                    <div /> /* spacer */
                  )}
                  <div className="flex items-center gap-4">
                    {footer.showSkip && (
                      <button
                        onClick={advance}
                        disabled={isSaving}
                        className="text-xs text-muted hover:text-foreground transition-colors underline cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                      >
                        Skip for now
                      </button>
                    )}
                    <button
                      onClick={handleNext}
                      disabled={!canProceed() || isSaving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-[2px] bg-primary text-primary-fg text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                    >
                      {isSaving ? "Saving..." : "Next"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
