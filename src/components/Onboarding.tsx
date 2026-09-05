"use client";

import { useState } from "react";
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
} from "lucide-react";
import { DialogSection } from "@/components/ui/Dialog";
import Logo from "./Logo";
import JoinHouseholdSheet from "./JoinHouseholdSheet";

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const { addPaySchedule, addBill, completeOnboarding, createHousehold, updateHouseholdPaymentMode, session, joinHousehold } = useApp();
  const currentUser = useCurrentUser();

  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  /* Step 1 — Welcome & Paths */
  const [localHouseholdName, setLocalHouseholdName] = useState("");
  const [flowMode, setFlowMode] = useState<"choose" | "create">("choose");
  const [isJoinSheetOpen, setIsJoinSheetOpen] = useState(false);

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

  /* Step 4 — First Bill */
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billFrequency, setBillFrequency] = useState("monthly");
  const [billCategory, setBillCategory] = useState("Other");
  const [billInvoiceDate, setBillInvoiceDate] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billPaymentType, setBillPaymentType] = useState<"Manual" | "Auto">("Manual");
  const [billNotes, setBillNotes] = useState("");
  // Note (#83): the real Add Bill card also has an Assignee dropdown and a
  // "Paid By"/splits section. Both omitted here on purpose — no other
  // household members exist yet at this point in onboarding, so
  // assignee-choice/splits don't make sense. Assignee defaults to
  // currentUser.id implicitly on save, and splits are sent as [].

  /* ── Navigation ─────────────────────────────── */
  async function handleNext() {
    if (currentStep === 1 && localHouseholdName.trim()) {
      setIsCreating(true);
      setCreateError(null);
      try {
        await createHousehold(localHouseholdName.trim());
      } catch (err: any) {
        setCreateError(err.message || String(err));
        setIsCreating(false);
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
      } catch (err: any) {
        setStepError(err.message || String(err));
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    if (currentStep === 3 && paydayDate && (!isFixedPay || payAmount)) {
      setIsSaving(true);
      setStepError(null);
      try {
        await addPaySchedule({
          member_id: String(currentUser.id),
          frequency: payFrequency,
          is_fixed_amount: isFixedPay,
          amount: isFixedPay ? parseFloat(payAmount) : null,
          next_pay_date: paydayDate,
        });
      } catch (err: any) {
        setStepError(err.message || String(err));
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    if (currentStep === 4 && billName && billAmount && billDueDate) {
      setIsSaving(true);
      setStepError(null);
      try {
        // Same shape addBill() reads/inserts as AddBillSheet.tsx's handleSave,
        // so a bill created here lands identically in the `bills` table.
        await addBill(
          {
            name: billName,
            amount: parseFloat(billAmount),
            category: billCategory,
            invoiceDate: billInvoiceDate,
            dueDate: billDueDate,
            paymentType: billPaymentType,
            assignee: String(currentUser.id),
            notes: billNotes,
            frequency: billFrequency,
          },
          []
        );
      } catch (err: any) {
        setStepError(err.message || String(err));
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setStepError(null);
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  /* ── Can proceed? ──────────────────────────── */
  function canProceed(): boolean {
    if (currentStep === 1) return flowMode === "create" && localHouseholdName.trim().length > 0;
    if (currentStep === 2) return true; // Payment mode has default selected
    if (currentStep === 3)
      return (
        paydayDate !== "" &&
        (!isFixedPay || (payAmount !== "" && !isNaN(Number(payAmount)) && Number(payAmount) > 0))
      );
    if (currentStep === 4)
      return billName.trim().length > 0 && billAmount !== "" && billDueDate !== "";
    return true;
  }

  /* ── Step icons for progress ───────────────── */
  const stepIcons = [Home, Wallet, Calendar, Receipt, Sparkles];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background px-4">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

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
          <div className="flex items-center justify-center gap-3 pt-6 pb-2">
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
            {/* ── Step 1: Welcome ── */}
            {currentStep === 1 && (
              <div className="flex-1 flex flex-col justify-center space-y-6">
                {flowMode === "choose" && (
                  <>
                    <div className="text-center space-y-4 flex flex-col items-center">
                      <div className="flex justify-center h-[52px]">
                        <Logo size="large" showWordmark={true} />
                      </div>
                      <p className="text-sm text-muted max-w-xs mx-auto">
                        Choose how you want to get started with Funded.
                      </p>
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
                  <>
                    <div className="text-center space-y-2 flex flex-col items-center">
                      <div className="flex justify-center h-[40px]">
                        <Logo size="medium" showWordmark={true} />
                      </div>
                    </div>
                    <DialogSection label="Create your Household" />
                    {createError && (
                      <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
                        <span className="font-bold">Failed to create household:</span><br/>
                        {createError}
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label
                          htmlFor="ob-household"
                          className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                        >
                          Household Name
                        </label>
                        <input
                          id="ob-household"
                          type="text"
                          placeholder="e.g. The Smiths"
                          value={localHouseholdName}
                          onChange={(e) => setLocalHouseholdName(e.target.value)}
                          className="w-full px-4 py-3 rounded-[2px] bg-surface-raised border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setFlowMode("choose")}
                        className="text-xs text-muted hover:text-foreground transition-colors underline block mx-auto pt-2 cursor-pointer"
                      >
                        Back to selection
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Step 2: Payment Mode ── */}
            {currentStep === 2 && (
              <div className="flex-1 flex flex-col justify-center space-y-5">
                <div className="space-y-2">
                  <DialogSection label="Payment Mode" />
                  <p className="text-xs text-muted font-mono">
                    How your household settles bill splits.
                  </p>
                </div>

                {stepError && (
                  <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
                    <span className="font-bold">Failed to save:</span><br/>
                    {stepError}
                  </div>
                )}

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
              </div>
            )}

            {/* ── Step 3: Payday ── */}
            {currentStep === 3 && (
              <div className="flex-1 flex flex-col justify-center space-y-5">
                <div className="space-y-2">
                  <DialogSection label="Your Payday" />
                  <p className="text-xs text-muted font-mono">
                    When do you next get paid? We&apos;ll track it for you.
                  </p>
                </div>
                {stepError && (
                  <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
                    <span className="font-bold">Failed to save:</span><br/>
                    {stepError}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="ob-paydate"
                      className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                    >
                      Next Payday Date
                    </label>
                    <input
                      id="ob-paydate"
                      type="date"
                      value={paydayDate}
                      onChange={(e) => setPaydayDate(e.target.value)}
                      className="w-full min-w-0 px-4 py-3 rounded-[2px] bg-surface-raised border border-border font-mono text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="ob-payfreq"
                      className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                    >
                      Frequency
                    </label>
                    <select
                      id="ob-payfreq"
                      value={payFrequency}
                      onChange={(e) => setPayFrequency(e.target.value as "weekly" | "fortnightly" | "monthly")}
                      className="w-full px-4 py-3 rounded-[2px] bg-surface-raised border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="ob-paytype"
                      className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                    >
                      Pay Type
                    </label>
                    <select
                      id="ob-paytype"
                      value={isFixedPay ? "fixed" : "variable"}
                      onChange={(e) => setIsFixedPay(e.target.value === "fixed")}
                      className="w-full px-4 py-3 rounded-[2px] bg-surface-raised border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="fixed">Fixed Pay Amount</option>
                      <option value="variable">Variable Pay Amount</option>
                    </select>
                  </div>
                  {isFixedPay && (
                    <div className="space-y-2">
                      <label
                        htmlFor="ob-payamount"
                        className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                      >
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
                          className="w-full pl-8 pr-4 py-3 rounded-[2px] bg-surface-raised border border-border font-mono text-primary text-sm font-semibold focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 4: First Bill ── */}
            {currentStep === 4 && (
              <div className="flex-1 flex flex-col justify-center space-y-5">
                <div className="space-y-2">
                  <DialogSection label="First Bill" />
                  <p className="text-xs text-muted font-mono">
                    Enter your first recurring bill so we can start tracking it.
                  </p>
                </div>
                {stepError && (
                  <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
                    <span className="font-bold">Failed to save:</span><br/>
                    {stepError}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="ob-billname"
                      className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                    >
                      Bill Name
                    </label>
                    <input
                      id="ob-billname"
                      type="text"
                      placeholder="e.g. Rent, Electricity"
                      value={billName}
                      onChange={(e) => setBillName(e.target.value)}
                      className="w-full px-4 py-3 rounded-[2px] bg-surface-raised border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label
                        htmlFor="ob-billamount"
                        className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                      >
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
                          className="w-full pl-8 pr-4 py-3 rounded-[2px] bg-surface-raised border border-border font-mono text-primary text-sm font-semibold focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="ob-billfreq"
                        className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                      >
                        Frequency
                      </label>
                      <select
                        id="ob-billfreq"
                        value={billFrequency}
                        onChange={(e) => setBillFrequency(e.target.value)}
                        className="w-full px-4 py-3 rounded-[2px] bg-surface-raised border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="fortnightly">Fortnightly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="ob-billcategory"
                      className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                    >
                      Category
                    </label>
                    <select
                      id="ob-billcategory"
                      value={billCategory}
                      onChange={(e) => setBillCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-[2px] bg-surface-raised border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="Household Bills">Household Bills</option>
                      <option value="Living Costs">Living Costs</option>
                      <option value="Debt & Finance">Debt & Finance</option>
                      <option value="Loans">Loans</option>
                      <option value="Subscriptions">Subscriptions</option>
                      <option value="Temporary">Temporary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label
                        htmlFor="ob-billinvoicedate"
                        className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                      >
                        Invoice Date
                      </label>
                      <input
                        id="ob-billinvoicedate"
                        type="date"
                        value={billInvoiceDate}
                        onChange={(e) => setBillInvoiceDate(e.target.value)}
                        className="w-full min-w-0 px-4 py-3 rounded-[2px] bg-surface-raised border border-border font-mono text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="ob-billduedate"
                        className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                      >
                        Due Date
                      </label>
                      <input
                        id="ob-billduedate"
                        type="date"
                        value={billDueDate}
                        onChange={(e) => setBillDueDate(e.target.value)}
                        className="w-full min-w-0 px-4 py-3 rounded-[2px] bg-surface-raised border border-border font-mono text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="ob-billpaymenttype"
                      className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                    >
                      Payment Type
                    </label>
                    <select
                      id="ob-billpaymenttype"
                      value={billPaymentType}
                      onChange={(e) => setBillPaymentType(e.target.value as "Manual" | "Auto")}
                      className="w-full px-4 py-3 rounded-[2px] bg-surface-raised border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="Manual">Manual</option>
                      <option value="Auto">Auto-Pay</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="ob-billnotes"
                      className="block font-heading text-xs font-semibold tracking-wider uppercase text-subtle"
                    >
                      Notes
                    </label>
                    <textarea
                      id="ob-billnotes"
                      placeholder="Add any additional details or context here..."
                      value={billNotes}
                      onChange={(e) => setBillNotes(e.target.value)}
                      className="w-full px-4 py-3 rounded-[2px] bg-surface-raised border border-border font-mono text-foreground text-sm min-h-[80px] resize-y focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 5: Success ── */}
            {currentStep === 5 && (
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

                {/* Stats summary row (values already entered — no new data) */}
                <div className="w-full grid grid-cols-3 divide-x divide-border border-y border-border">
                  <div className="flex flex-col items-center gap-1 py-3 px-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-subtle">Payday</span>
                    <span className="font-mono text-sm font-semibold text-primary truncate max-w-full">
                      {isFixedPay
                        ? `$${Number(payAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "Variable"}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1 py-3 px-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-subtle">First Bill</span>
                    <span className="font-mono text-sm font-semibold text-primary truncate max-w-full">
                      ${Number(billAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1 py-3 px-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-subtle">Mode</span>
                    <span className="font-mono text-[11px] font-semibold text-foreground leading-tight">
                      {paymentMode ? "Joint Fund" : "Direct Pay"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={completeOnboarding}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-[2px] bg-primary text-primary-fg text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  Enter App
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Footer navigation (steps 1–4) ────── */}
          {currentStep < 5 && (
            <div className="px-6 sm:px-8 pb-6 flex items-center justify-between">
              {currentStep > 1 ? (
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
              {(currentStep > 1 || flowMode === "create") && (
                <button
                  onClick={handleNext}
                  disabled={!canProceed() || isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-[2px] bg-primary text-primary-fg text-sm font-bold shadow-lg shadow-primary/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  {isSaving ? "Saving..." : "Next"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
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
    </div>
  );
}
