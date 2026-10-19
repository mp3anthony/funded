"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useApp, type PaySchedule } from "@/context/AppContext";
import Dialog, { DialogButton } from "@/components/ui/Dialog";

interface EnterPayAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: PaySchedule | null;
  onConfirm: (amount: number, notes: string | null) => void;
  title?: string;
  submitLabel?: string;
  initialAmount?: number | null;
  initialNotes?: string | null;
}

export default function EnterPayAmountModal({
  isOpen,
  onClose,
  schedule,
  onConfirm,
  title,
  submitLabel,
  initialAmount,
  initialNotes,
}: EnterPayAmountModalProps) {
  const { contributionRules, funds } = useApp();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Prefer explicit initialAmount, then schedule amount, then empty
      const prefill = initialAmount != null ? initialAmount : schedule?.amount;
      setAmount(prefill ? String(prefill) : "");
      setNotes(initialNotes ?? "");
    }
  }, [isOpen, schedule, initialAmount, initialNotes]);

  // Compute triggered rules and allocation preview in real-time
  const allocationPreview = useMemo(() => {
    const numAmount = Number(amount);
    if (!schedule || isNaN(numAmount) || numAmount <= 0) return null;

    const memberId = schedule.member_id;
    const triggered = contributionRules.filter(
      (r) =>
        r.is_active &&
        String(r.member_id) === String(memberId) &&
        numAmount > Number(r.threshold_amount)
    );

    if (triggered.length === 0) return null;

    const allocations = triggered.map((rule) => {
      let ruleAmount = Number(rule.amount_to_add);
      if (rule.amount_type === "percentage") {
        const surplus = numAmount - Number(rule.threshold_amount);
        ruleAmount = surplus > 0 ? surplus * (Number(rule.amount_to_add) / 100) : 0;
      }

      let targetName = "Joint Contribution";
      if (rule.action_type === "goal") {
        const goal = funds.find((g) => String(g.id) === String(rule.action_target_id));
        targetName = goal ? goal.name : "Savings Goal";
      }

      return {
        id: rule.id,
        targetName,
        amount: ruleAmount,
        isPercentage: rule.amount_type === "percentage",
        percentValue: rule.amount_to_add,
      };
    });

    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
    const remaining = numAmount - totalAllocated;

    return { allocations, totalAllocated, remaining, gross: numAmount };
  }, [amount, schedule, contributionRules, funds]);

  if (!isOpen || !schedule) return null;

  const isValid = amount !== "" && !isNaN(Number(amount)) && Number(amount) > 0;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onConfirm(Number(amount), notes.trim() || null);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={title || "Review & Log Pay"}
      maxWidthClass="max-w-sm"
      footer={
        <>
          <DialogButton variant="ghost" type="button" onClick={onClose}>
            Cancel
          </DialogButton>
          <DialogButton
            variant="primary"
            type="submit"
            form="enter-pay-amount-form"
            disabled={!isValid}
          >
            {submitLabel || "Confirm & Log Pay"}
          </DialogButton>
        </>
      }
    >
      <form id="enter-pay-amount-form" onSubmit={handleConfirm} className="space-y-4">
          {/* Form Fields */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-subtle uppercase tracking-wider">
                Amount Received
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-background border border-border rounded-[2px] pl-8 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-subtle uppercase tracking-wider">
                Notes (Optional)
              </label>
              <textarea
                placeholder="e.g. Regular monthly pay, overtime bonus"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-background border border-border rounded-[2px] px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 h-20 resize-none font-body"
              />
            </div>
          </div>

          {/* Allocation Preview */}
          {allocationPreview && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5">
                <Sparkles size={12} className="text-primary" />
                <span className="text-xs font-semibold text-subtle uppercase tracking-wider">
                  Allocation Preview
                </span>
              </div>
              <div className="bg-background border border-border rounded-[2px] p-3.5 space-y-2.5 text-xs">
                {/* Gross */}
                <div className="flex items-center justify-between text-foreground">
                  <span className="text-muted uppercase">Gross Pay</span>
                  <span className="font-bold">
                    ${allocationPreview.gross.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Divider */}
                <div className="border-t border-border-strong" />

                {/* Rule allocations */}
                {allocationPreview.allocations.map((alloc) => (
                  <div key={alloc.id} className="flex items-center justify-between text-primary/80">
                    <span className="truncate mr-2">
                      → {alloc.targetName}
                      {alloc.isPercentage && (
                        <span className="text-muted ml-1">({alloc.percentValue}%)</span>
                      )}
                    </span>
                    <span className="font-bold whitespace-nowrap shrink-0">
                      −${alloc.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}

                {/* Divider */}
                <div className="border-t border-border-strong" />

                {/* Remaining */}
                <div className="flex items-center justify-between text-foreground">
                  <span className="text-muted uppercase">Take Home</span>
                  <span className={`font-bold ${allocationPreview.remaining >= 0 ? "text-primary" : "text-destructive"}`}>
                    ${allocationPreview.remaining.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
      </form>
    </Dialog>
  );
}
