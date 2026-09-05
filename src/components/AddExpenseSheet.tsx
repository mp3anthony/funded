/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState } from "react";
import { useApp, useCurrentUser, type Expense } from "@/context/AppContext";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import ItemTypeToggle from "./ItemTypeToggle";
import { Check } from "lucide-react";

interface AddExpenseSheetProps {
  isOpen: boolean;
  onClose: () => void;
  existingExpense?: Expense;
  /** Add-mode only (no existingExpense): lets the user swap to the Bill
   * form without closing/reopening the dialog by hand. Omitted entirely
   * while editing, since an existing item's type is fixed. */
  onSwitchToBill?: () => void;
}

/**
 * Issue #98 (Slice 2 of 6, split logic Slice 3 of 6): add/edit form for
 * expenses (variable spend — groceries, fuel, etc. — see #98's decision
 * comment for the bill/expense distinction). Deliberately mirrors
 * AddBillSheet's UX/validation patterns closely, minus the fields that
 * don't apply to expenses (due date, invoice date, payment frequency,
 * payment type, recurring/paused).
 *
 * Split Type picker (Decision #4, #98): "Assign to one person" (existing
 * whole-item `assignee_id` picker, unchanged) or "Split by percentage"
 * (new — a % per household member, must sum to exactly 100 before Save is
 * enabled). Both shapes are mutually exclusive per expense, chosen here.
 */
export default function AddExpenseSheet({
  isOpen,
  onClose,
  existingExpense,
  onSwitchToBill,
}: AddExpenseSheetProps) {
  const { householdMembers, addExpense, updateExpense, expenseSplits, session } = useApp();
  const currentUser = useCurrentUser();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [assignee, setAssignee] = useState("");
  const [notes, setNotes] = useState("");
  const [splitType, setSplitType] = useState<"assignee" | "percentage">("assignee");
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fallback: If householdMembers is empty, display at least the logged-in user
  const displayMembers = householdMembers.length > 0
    ? householdMembers
    : (session?.user
        ? [{
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "You",
            email: session.user.email || "",
            role: "owner",
            avatar: "Y"
          }]
        : []);

  React.useEffect(() => {
    if (isOpen && existingExpense) {
      setName(existingExpense.name);
      setAmount(existingExpense.amount.toString());
      setCategory(existingExpense.category || "Other");
      setAssignee(existingExpense.assignee_id ? existingExpense.assignee_id.toString() : "");
      setNotes(existingExpense.notes ? existingExpense.notes : "");
      setSplitType(existingExpense.split_mode === "percentage" ? "percentage" : "assignee");

      const existingSplits = expenseSplits.filter(
        (s) => String(s.expense_id) === String(existingExpense.id)
      );
      const initialPercentages: Record<string, string> = {};
      existingSplits.forEach((s) => {
        initialPercentages[String(s.member_id)] = String(s.percentage);
      });
      setPercentages(initialPercentages);
    } else if (isOpen) {
      setName("");
      setAmount("");
      setCategory("Other");
      setAssignee(currentUser.id ? String(currentUser.id) : "");
      setNotes("");
      setSplitType("assignee");
      setPercentages({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, existingExpense, currentUser.id]);

  if (!isOpen) return null;

  const percentageTotal = displayMembers.reduce(
    (sum, m) => sum + (Number(percentages[String(m.id)]) || 0),
    0
  );
  const percentageValid = Math.abs(percentageTotal - 100) < 0.001;

  const isFormValid =
    name.trim() !== "" &&
    amount.trim() !== "" &&
    !isNaN(Number(amount)) &&
    (splitType === "assignee" || percentageValid);

  const handlePercentageChange = (memberId: string, value: string) => {
    setPercentages((prev) => ({ ...prev, [memberId]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const splits =
        splitType === "percentage"
          ? displayMembers
              .map((m) => ({
                member_id: String(m.id),
                percentage: Number(percentages[String(m.id)]) || 0,
              }))
              .filter((s) => s.percentage > 0)
          : [];

      const expenseData = {
        name,
        amount: Number(amount),
        category,
        split_mode: splitType,
        assignee_id: splitType === "assignee" ? assignee || null : null,
        splits,
        notes,
      };

      if (existingExpense) {
        await updateExpense(existingExpense.id, expenseData);
      } else {
        await addExpense(expenseData);
      }

      setName("");
      setAmount("");
      setCategory("Other");
      setAssignee("");
      setNotes("");
      setSplitType("assignee");
      setPercentages({});

      onClose();
    } catch (error) {
      const err = error as Error;
      console.error("Failed to save expense:", err);
      setErrorMsg(err.message || "Failed to save expense. Please verify details and permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={existingExpense ? "Edit Expense" : "Add Expense"}
      footer={
        <>
          <DialogButton variant="ghost" onClick={onClose}>
            Cancel
          </DialogButton>
          <DialogButton
            variant="primary"
            onClick={handleSave}
            disabled={!isFormValid || isSaving}
            className="uppercase tracking-wider"
          >
            {existingExpense
              ? isSaving
                ? "Updating..."
                : "Update Expense"
              : isSaving
                ? "Saving..."
                : "Save Expense"}
          </DialogButton>
        </>
      }
    >
      <div className="space-y-4 md:space-y-6">
        {!existingExpense && onSwitchToBill && (
          <ItemTypeToggle value="expense" onChange={(t) => t === "bill" && onSwitchToBill()} />
        )}

        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
            <span className="font-bold">Failed to save expense:</span><br/>
            {errorMsg}
          </div>
        )}

        {/* 1. Expense Name */}
        <div className="flex flex-col space-y-2">
          <label className="font-heading text-sm font-semibold text-subtle uppercase tracking-wider">
            Expense Name
          </label>
          <input
            type="text"
            placeholder="e.g., Groceries"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-[2px] border border-border bg-surface-raised px-4 py-2.5 md:py-3 text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
          />
        </div>

        {/* 2. Category */}
        <div className="flex flex-col space-y-2">
          <label className="font-heading text-sm font-semibold text-subtle uppercase tracking-wider">
            Category
          </label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-[2px] border border-border bg-surface-raised px-4 py-2.5 md:py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none text-sm cursor-pointer"
            >
              <option value="Household Bills">Household Bills</option>
              <option value="Living Costs">Living Costs</option>
              <option value="Debt & Finance">Debt & Finance</option>
              <option value="Loans">Loans</option>
              <option value="Subscriptions">Subscriptions</option>
              <option value="Temporary">Temporary</option>
              <option value="Other">Other</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 3. Amount */}
        <div className="flex flex-col space-y-2">
          <label className="font-heading text-sm font-semibold text-subtle capitalize tracking-wider">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-mono">$</span>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-[2px] border border-border bg-surface-raised pl-8 pr-4 py-2.5 md:py-3 font-mono text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
            />
          </div>
        </div>

        {/* 4. Split Type */}
        <div className="flex flex-col space-y-2">
          <label className="font-heading text-sm font-semibold text-subtle capitalize tracking-wider">
            Split Type
          </label>
          <div className="grid grid-cols-2 gap-1 bg-background border border-border rounded-[2px] p-1">
            <button
              type="button"
              onClick={() => setSplitType("assignee")}
              className={`py-2 px-3 rounded-[2px] text-[10px] font-bold uppercase tracking-wider transition-all ${
                splitType === "assignee"
                  ? "bg-primary text-primary-fg shadow"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              Assign to One Person
            </button>
            <button
              type="button"
              onClick={() => setSplitType("percentage")}
              className={`py-2 px-3 rounded-[2px] text-[10px] font-bold uppercase tracking-wider transition-all ${
                splitType === "percentage"
                  ? "bg-primary text-primary-fg shadow"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              Split by Percentage
            </button>
          </div>
        </div>

        {/* 5a. Assignee (whole-item assignment) */}
        {splitType === "assignee" && (
          <div className="flex flex-col space-y-2">
            <label className="font-heading text-sm font-semibold text-subtle capitalize tracking-wider">
              Assignee
            </label>
            <div className="relative">
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full rounded-[2px] border border-border bg-surface-raised px-4 py-2.5 md:py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none text-sm"
              >
                <option value="" disabled>Select a member</option>
                {displayMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            {householdMembers.length === 0 && (
              <span className="text-xs text-accent font-medium">
                Add household members first (Showing logged-in user as fallback)
              </span>
            )}
          </div>
        )}

        {/* 5b. Percentage split editor */}
        {splitType === "percentage" && (
          <div className="flex flex-col space-y-2">
            <label className="font-heading text-sm font-semibold text-subtle capitalize tracking-wider">
              Percentage Split
            </label>
            <div className="rounded-[2px] border border-border bg-background divide-y divide-white/5">
              {displayMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 px-3 py-3">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-tr from-primary to-emerald-500 flex items-center justify-center text-foreground font-bold text-[10px] overflow-hidden">
                    {(member as { avatar_url?: string | null }).avatar_url ? (
                      <img
                        src={(member as { avatar_url?: string | null }).avatar_url!}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      member.avatar || member.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">
                    {member.name}
                  </span>
                  <div className="relative shrink-0 w-24">
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      max="100"
                      value={percentages[String(member.id)] ?? ""}
                      onChange={(e) => handlePercentageChange(String(member.id), e.target.value)}
                      className="w-full bg-surface-raised border border-border rounded-[2px] pl-3 pr-6 py-2 font-mono text-xs text-foreground text-right focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted font-mono text-xs pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div
              className={`flex items-center justify-between rounded-[2px] border px-3 py-2 font-mono text-xs ${
                percentageValid
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              <span className="font-bold uppercase tracking-wider text-[10px]">
                Total
              </span>
              <span className="flex items-center gap-1 font-bold">
                {percentageValid && <Check size={12} />}
                {percentageTotal.toFixed(1)}%
              </span>
            </div>
            {!percentageValid && (
              <span className="text-xs text-destructive font-medium">
                Percentages must add up to exactly 100% before saving.
              </span>
            )}
            {householdMembers.length === 0 && (
              <span className="text-xs text-accent font-medium">
                Add household members first (Showing logged-in user as fallback)
              </span>
            )}
          </div>
        )}

        {/* 6. Notes */}
        <div className="flex flex-col space-y-2 pt-2">
          <label className="font-heading text-sm font-semibold text-subtle uppercase tracking-wider">
            Notes
          </label>
          <textarea
            placeholder="Add any additional details or context here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-surface border border-border rounded-[2px] p-3 font-mono text-sm min-h-[80px] resize-y placeholder:text-muted text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>
    </Dialog>
  );
}
