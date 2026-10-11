"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp, useCurrentUser } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import {
  Home,
  Calendar,
  Receipt,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Wallet,
  Building2,
  Target,
} from "lucide-react";
import Logo from "./Logo";
import JoinHouseholdSheet from "./JoinHouseholdSheet";
import OnboardingStep from "./OnboardingStep";
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
  "w-full pl-8 pr-4 py-3 rounded-[2px] bg-surface-raised border border-border font-mono text-primary text-sm font-semibold focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all disabled:opacity-60";
const dateInputClass =
  "w-full min-w-0 px-4 py-3 rounded-[2px] bg-surface-raised border border-border font-mono text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all disabled:opacity-60";
const labelClass =
  "block font-heading text-xs font-semibold tracking-wider uppercase text-subtle";
const fieldsetClass = "space-y-4 min-w-0 border-0 p-0 m-0";

/* Plain-language "why we ask" copy for the two required steps. */
const HOUSEHOLD_WHY = (
  <p>A household is where your bills, pay and goals live. You can invite others to it later with a join code.</p>
);
const PAYMENT_MODE_WHY = (
  <>
    <p>
      <span className="font-bold text-foreground">Direct Pay:</span> no shared account; each person pays their share of
      each bill directly. Suits flatmates or couples with separate money.
    </p>
    <p>
      <span className="font-bold text-foreground">Joint Fund:</span> everyone puts money into one shared account and
      bills are paid from it. Suits households with a joint account.
    </p>
    <p>You can change this later in Settings.</p>
  </>
);

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
  return <p className="text-xs text-primary font-mono">Saved. You can change it later on the {where} page.</p>;
}

export default function Onboarding() {
  const {
    addPaySchedule,
    addBill,
    addFund,
    completeOnboarding,
    createHousehold,
    updateHouseholdPaymentMode,
  } = useApp();
  const currentUser = useCurrentUser();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  /* Step 1 — Household */
  const [localHouseholdName, setLocalHouseholdName] = useState("");
  const [flowMode, setFlowMode] = useState<"choose" | "create">("choose");
  const [isJoinSheetOpen, setIsJoinSheetOpen] = useState(false);
  // True once createHousehold succeeded. Guards Back then Next from calling it
  // again: re-creating would take createHousehold's adopt-existing path, which
  // flips isOnboarded and unmounts the wizard mid-flow.
  const [householdCreated, setHouseholdCreated] = useState(false);

  /* Step 2 — Payment Mode */
  const [paymentMode, setPaymentMode] = useState(false); // false = Direct Pay, true = Joint Fund

  /* Step 3 — Payday */
  const [paydayDate, setPaydayDate] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payFrequency, setPayFrequency] = useState<"weekly" | "fortnightly" | "monthly">("monthly");
  const [isFixedPay, setIsFixedPay] = useState(true);
  // Note (#84): the real Payday tab also has a Household Member dropdown.
  // Omitted here on purpose — at this point in onboarding the current user
  // is the only household member, so member stays implicit as currentUser.id.

  /* Step 4 — First Bill (name, amount, frequency, due date only) */
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billFrequency, setBillFrequency] = useState("monthly");
  const [billDueDate, setBillDueDate] = useState("");
  // Note (#83, #248): the real Add Bill card also has category, invoice date,
  // payment type, notes, an Assignee dropdown and a "Paid By"/splits section.
  // All omitted on purpose — confusing on day one, editable later. Saved as
  // category "Other", Manual, assignee currentUser.id, no splits.

  /* Step 5 — First Goal */
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
    currentStep === 3
      ? saved.payday !== null
      : currentStep === 4
        ? saved.bill !== null
        : currentStep === 5
          ? saved.goal !== null
          : false;

  /* ── Navigation ─────────────────────────────── */
  function advance() {
    setStepError(null);
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  async function handleNext() {
    if (currentStep === 1 && !householdCreated) {
      if (!localHouseholdName.trim()) return;
      setIsCreating(true);
      setCreateError(null);
      try {
        await createHousehold(localHouseholdName.trim());
        setHouseholdCreated(true);
      } catch (err) {
        setCreateError(errMsg(err));
        return;
      } finally {
        setIsCreating(false);
      }
    }

    if (currentStep === 2) {
      setIsSaving(true);
      setStepError(null);
      try {
        await updateHouseholdPaymentMode(paymentMode);
      } catch (err) {
        setStepError(errMsg(err));
        return;
      } finally {
        setIsSaving(false);
      }
    }

    if (currentStep === 3 && !saved.payday) {
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

    if (currentStep === 4 && !saved.bill) {
      setIsSaving(true);
      setStepError(null);
      try {
        const amount = parseFloat(billAmount);
        // Same shape addBill() reads/inserts as AddBillSheet.tsx's handleSave,
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

    if (currentStep === 5 && !saved.goal) {
      setIsSaving(true);
      setStepError(null);
      try {
        const target = parseFloat(goalTarget);
        // Same shape AddGoalSheet writes for a new goal. addFund throws on a
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
    if (currentStep === 1) return householdCreated || (flowMode === "create" && localHouseholdName.trim().length > 0);
    if (currentStep === 2) return true; // Payment mode has default selected
    if (stepSaved) return true; // Already written; Next just advances
    if (currentStep === 3) return isPaydayValid({ date: paydayDate, isFixed: isFixedPay, amount: payAmount });
    if (currentStep === 4) return isBillValid({ name: billName, amount: billAmount, dueDate: billDueDate });
    if (currentStep === 5) return isGoalValid({ name: goalName, target: goalTarget });
    return true;
  }

  const footer = footerFor(currentStep, { saved: stepSaved });
  // Step 1 before a path is chosen has no Next (the path rows are the buttons).
  const showNext = currentStep > 1 || householdCreated || flowMode === "create";

  /* ── Step icons for progress ───────────────── */
  const stepIcons = [Home, Wallet, Calendar, Receipt, Target, Check];

  const summaryCells: { label: string; text: string; muted: boolean }[] = [
    { label: "Payday", ...summarise(summaryCell(saved.payday)) },
    { label: "First Bill", ...summarise(summaryCell(saved.bill)) },
    { label: "Goal", ...summarise(summaryCell(saved.goal)) },
    { label: "Mode", text: paymentMode ? "Joint Fund" : "Direct Pay", muted: false },
  ];

  function summarise(cell: SummaryCell) {
    return { text: summaryText(cell), muted: cell.kind === "skipped" };
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
        {/* Decorative blobs */}
        <div className="pointer-events-none fixed top-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="pointer-events-none fixed bottom-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

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
              className="absolute -top-10 right-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] border border-border bg-surface text-[10px] font-bold text-muted hover:text-foreground hover:bg-surface-raised transition-colors cursor-pointer font-mono uppercase tracking-wider z-10"
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

              <p className="text-center font-mono text-[11px] font-semibold text-subtle uppercase tracking-widest pb-2">
                STEP {currentStep} / {TOTAL_STEPS}
              </p>

              {/* Step content */}
              <div className="px-6 sm:px-8 pb-6 pt-2 min-h-[280px] flex flex-col">
                {/* ── Step 1: Household ── */}
                {currentStep === 1 && (
                  <OnboardingStep
                    title={flowMode === "choose" ? "Welcome" : "Create your Household"}
                    intro={
                      flowMode === "choose"
                        ? "Choose how you want to get started with Funded."
                        : "Give your household a name."
                    }
                    why={HOUSEHOLD_WHY}
                    error={createError}
                  >
                    {flowMode === "choose" && (
                      <>
                        <div className="flex justify-center h-[52px]">
                          <Logo size="large" showWordmark={true} />
                        </div>
                        {/* Hairline path rows */}
                        <div className="border-y border-border divide-y divide-border">
                          <button
                            type="button"
                            onClick={() => setFlowMode("create")}
                            className="w-full flex items-center gap-4 py-4 text-left transition-colors hover:bg-surface-raised cursor-pointer group"
                          >
                            <span className="flex items-center justify-center h-9 w-9 rounded-[2px] bg-surface-raised text-primary shrink-0 group-hover:bg-primary/10 transition-colors">
                              <Home className="h-4 w-4" />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block font-heading font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                Create a Household
                              </span>
                              <span className="block text-[10px] text-muted mt-0.5 font-mono">
                                Start fresh, configure payday schedules &amp; add bills
                              </span>
                            </span>
                            <ArrowRight className="h-4 w-4 text-subtle group-hover:text-primary transition-colors shrink-0" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsJoinSheetOpen(true)}
                            className="w-full flex items-center gap-4 py-4 text-left transition-colors hover:bg-surface-raised cursor-pointer group"
                          >
                            <span className="flex items-center justify-center h-9 w-9 rounded-[2px] bg-surface-raised text-primary shrink-0 group-hover:bg-primary/10 transition-colors">
                              <Sparkles className="h-4 w-4" />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block font-heading font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                Join via Code
                              </span>
                              <span className="block text-[10px] text-muted mt-0.5 font-mono">
                                Join an existing household using a 6-digit code
                              </span>
                            </span>
                            <ArrowRight className="h-4 w-4 text-subtle group-hover:text-primary transition-colors shrink-0" />
                          </button>
                        </div>
                      </>
                    )}

                    {flowMode === "create" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label htmlFor="ob-household" className={labelClass}>
                            Household Name
                          </label>
                          <input
                            id="ob-household"
                            type="text"
                            placeholder="e.g. The Smiths"
                            value={localHouseholdName}
                            onChange={(e) => setLocalHouseholdName(e.target.value)}
                            readOnly={householdCreated}
                            className={`${inputClass} ${householdCreated ? "opacity-60" : ""}`}
                          />
                        </div>
                        {householdCreated ? (
                          <SavedNote where="Settings" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setFlowMode("choose")}
                            className="text-xs text-muted hover:text-foreground transition-colors underline block mx-auto pt-2 cursor-pointer"
                          >
                            Back to selection
                          </button>
                        )}
                      </div>
                    )}
                  </OnboardingStep>
                )}

                {/* ── Step 2: Payment Mode ── */}
                {currentStep === 2 && (
                  <OnboardingStep
                    title="Payment Mode"
                    intro="How your household settles bill splits."
                    why={PAYMENT_MODE_WHY}
                    error={stepError}
                  >
                    <div className="space-y-3">
                      {/* Direct Pay */}
                      <button
                        type="button"
                        onClick={() => setPaymentMode(false)}
                        className={`w-full flex items-start gap-3 p-4 rounded-[2px] border text-left transition-all cursor-pointer ${
                          paymentMode === false
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="flex items-center justify-center h-9 w-9 rounded-[2px] bg-surface-raised text-primary shrink-0">
                          <Wallet className="h-4 w-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-heading font-bold text-sm text-foreground">
                            Direct Pay
                          </span>
                          <span className="block text-[10px] text-muted mt-0.5 font-mono">
                            Transfer directly per bill split.
                          </span>
                        </span>
                        {paymentMode === false && (
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        )}
                      </button>

                      {/* Joint Fund */}
                      <button
                        type="button"
                        onClick={() => setPaymentMode(true)}
                        className={`w-full flex items-start gap-3 p-4 rounded-[2px] border text-left transition-all cursor-pointer ${
                          paymentMode === true
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="flex items-center justify-center h-9 w-9 rounded-[2px] bg-surface-raised text-primary shrink-0">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-heading font-bold text-sm text-foreground">
                            Joint Fund
                          </span>
                          <span className="block text-[10px] text-muted mt-0.5 font-mono">
                            Shared household bank account.
                          </span>
                        </span>
                        {paymentMode === true && (
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        )}
                      </button>
                    </div>
                  </OnboardingStep>
                )}

                {/* ── Step 3: Payday ── */}
                {currentStep === 3 && (
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
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary text-sm font-mono">$</span>
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

                {/* ── Step 4: First Bill ── */}
                {currentStep === 4 && (
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
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary text-sm font-mono">$</span>
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

                {/* ── Step 5: First Goal ── */}
                {currentStep === 5 && (
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
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary text-sm font-mono">$</span>
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

                {/* ── Step 6: Setup Complete ── */}
                {currentStep === 6 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                    {/* Lime-glow check */}
                    <div className="inline-flex items-center justify-center h-20 w-20 rounded-[2px] bg-primary/15 border border-primary/40 text-primary shadow-lg shadow-primary/25">
                      <Check className="h-9 w-9" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="font-mono text-sm font-bold uppercase tracking-[0.2em] text-primary">
                        Setup Complete
                      </h2>
                      <p className="text-sm text-muted max-w-xs mx-auto">
                        <span className="font-bold text-foreground">{localHouseholdName || "Your household"}</span> is ready to go.
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
                          <span className="font-mono text-[9px] uppercase tracking-wider text-subtle">{label}</span>
                          <span
                            className={`font-mono text-sm font-semibold truncate max-w-full ${
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
                          // Finish onboarding first, else the wizard remounts at step 1 on return.
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
                    {showNext && (
                      <button
                        onClick={handleNext}
                        disabled={!canProceed() || isSaving || isCreating}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-[2px] bg-primary text-primary-fg text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      >
                        {isSaving ? "Saving..." : "Next"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <JoinHouseholdSheet isOpen={isJoinSheetOpen} onClose={() => setIsJoinSheetOpen(false)} />
      {isCreating && (
        <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md">
          <div className="flex flex-col items-center gap-6 animate-in fade-in duration-(--duration-base) ease-(--ease-standard)">
            <Logo size="large" showWordmark={true} />
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm font-bold text-foreground capitalize tracking-wider font-mono animate-pulse">
              Creating your Household...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
