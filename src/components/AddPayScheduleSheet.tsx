"use client";

import React, { useState, useEffect } from "react";
import { useApp, useCurrentUser, type PaySchedule } from "@/context/AppContext";
import Dialog, { DialogButton } from "@/components/ui/Dialog";

interface AddPayScheduleSheetProps {
  isOpen: boolean;
  onClose: () => void;
  existingSchedule?: PaySchedule | null;
}

export default function AddPayScheduleSheet({
  isOpen,
  onClose,
  existingSchedule,
}: AddPayScheduleSheetProps) {
  const { householdMembers, addPaySchedule, updatePaySchedule } = useApp();
  const currentUser = useCurrentUser();

  const [memberId, setMemberId] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "fortnightly" | "monthly">("monthly");
  const [isFixedAmount, setIsFixedAmount] = useState(true);
  const [amount, setAmount] = useState("");
  const [nextPayDate, setNextPayDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
      setErrorMsg(null);
      return;
    }

    if (isOpen && !hasInitialized) {
      if (existingSchedule) {
        setMemberId(String(existingSchedule.member_id));
        setFrequency(existingSchedule.frequency);
        setIsFixedAmount(existingSchedule.is_fixed_amount);
        setAmount(existingSchedule.amount ? String(existingSchedule.amount) : "");
        setNextPayDate(existingSchedule.next_pay_date || "");
        setHasInitialized(true);
      } else {
        const defaultMemberId = currentUser.id ? String(currentUser.id) : (householdMembers[0]?.id ? String(householdMembers[0].id) : "");
        setMemberId(defaultMemberId);
        setFrequency("monthly");
        setIsFixedAmount(true);
        setAmount("");
        setNextPayDate("");
        if (defaultMemberId) {
          setHasInitialized(true);
        }
      }
    }
  }, [isOpen, existingSchedule, householdMembers, currentUser.id, hasInitialized]);

  if (!isOpen) return null;

  const isFormValid =
    memberId !== "" &&
    nextPayDate !== "" &&
    (!isFixedAmount || (amount !== "" && !isNaN(Number(amount)) && Number(amount) > 0));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const scheduleData = {
        member_id: memberId,
        frequency,
        is_fixed_amount: isFixedAmount,
        amount: isFixedAmount ? Number(amount) : null,
        next_pay_date: nextPayDate,
      };

      if (existingSchedule) {
        await updatePaySchedule(existingSchedule.id, scheduleData);
      } else {
        await addPaySchedule(scheduleData);
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to save pay schedule:", err);
      setErrorMsg(err?.message || "An unexpected error occurred while saving the pay schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={existingSchedule ? "Edit Pay Schedule" : "Add Pay Schedule"}
      footer={
        <>
          <DialogButton variant="ghost" type="button" onClick={onClose}>
            Cancel
          </DialogButton>
          <DialogButton
            variant="primary"
            type="submit"
            form="add-pay-schedule-form"
            disabled={!isFormValid || isSaving}
            className="uppercase tracking-wider"
          >
            {existingSchedule
              ? isSaving
                ? "Updating..."
                : "Update Schedule"
              : isSaving
                ? "Saving..."
                : "Add Schedule"}
          </DialogButton>
        </>
      }
    >
      {/* Form Body */}
      <form
        id="add-pay-schedule-form"
        onSubmit={handleSave}
        className="space-y-4 md:space-y-5"
      >
          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
              <span className="font-bold">Error:</span> {errorMsg}
            </div>
          )}

          {/* Member Dropdown */}
          <div className="flex flex-col space-y-1 md:space-y-1.5">
            <label className="font-heading text-[10px] md:text-xs font-semibold text-subtle uppercase tracking-wider">
              Household Member
            </label>
            <div className="relative">
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full rounded-[2px] border border-border bg-background px-4 py-2.5 md:py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none transition-all"
                required
              >
                <option value="" disabled>Select member...</option>
                {householdMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Frequency Dropdown */}
          <div className="flex flex-col space-y-1 md:space-y-1.5">
            <label className="font-heading text-[10px] md:text-xs font-semibold text-subtle capitalize tracking-wider">
              Frequency
            </label>
            <div className="relative">
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as "weekly" | "fortnightly" | "monthly")}
                className="w-full rounded-[2px] border border-border bg-background px-4 py-2.5 md:py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none transition-all cursor-pointer pr-10"
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Fixed Amount Dropdown */}
          <div className="flex flex-col space-y-1.5 md:space-y-1.5 bg-background border border-border rounded-[2px] p-3 md:p-4">
            <div className="flex flex-col mb-2">
              <span className="text-xs md:text-sm font-semibold text-foreground">Pay Type</span>
              <span className="text-[10px] md:text-xs text-muted">Choose whether pay amount is fixed or varies each time</span>
            </div>
            <div className="relative">
              <select
                value={isFixedAmount ? "fixed" : "variable"}
                onChange={(e) => setIsFixedAmount(e.target.value === "fixed")}
                className="w-full rounded-[2px] border border-border bg-surface px-4 py-2.5 md:py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none transition-all cursor-pointer pr-10"
              >
                <option value="fixed">Fixed Pay Amount</option>
                <option value="variable">Variable Pay Amount</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Fixed Amount Input (Conditional) */}
          {isFixedAmount && (
            <div className="flex flex-col space-y-1 md:space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-(--duration-base) ease-(--ease-standard)">
              <label className="font-heading text-[10px] md:text-xs font-semibold text-subtle capitalize tracking-wider">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-mono text-sm">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-background border border-border rounded-[2px] pl-8 pr-4 py-2.5 md:py-3 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  required={isFixedAmount}
                />
              </div>
            </div>
          )}

          {/* Next Pay Date Datepicker */}
          <div className="flex flex-col space-y-1 md:space-y-1.5">
            <label className="font-heading text-[10px] md:text-xs font-semibold text-subtle uppercase tracking-wider">
              Next Pay Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={nextPayDate}
                onChange={(e) => setNextPayDate(e.target.value)}
                className="w-full min-w-0 bg-surface border border-border rounded-[2px] p-2.5 md:p-3 font-mono text-sm text-foreground [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-primary/50"
                required
              />
            </div>
          </div>
      </form>
    </Dialog>
  );
}
