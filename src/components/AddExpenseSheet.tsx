/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState } from "react";
import { useApp, useCurrentUser, type Expense } from "@/context/AppContext";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import ItemTypeToggle from "./ItemTypeToggle";

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
 * Issue #98 (Slice 2 of 6): add/edit form for expenses (variable spend —
 * groceries, fuel, etc. — see #98's decision comment for the bill/expense
 * distinction). Deliberately mirrors AddBillSheet's UX/validation patterns
 * closely, minus the fields that don't apply to expenses (due date, invoice
 * date, payment frequency, payment type, recurring/paused).
 *
 * split_mode is NOT exposed as a picker here — every expense saved by this
 * form is whole-item `assignee_id` assignment ("assignee" split_mode). The
 * schema already supports a "percentage" split mode (sub-slice 3's job),
 * but a disabled/stubbed picker for a mode that doesn't work yet would be
 * more confusing than just not showing the choice — see HANDOFF/PR notes.
 */
export default function AddExpenseSheet({
  isOpen,
  onClose,
  existingExpense,
  onSwitchToBill,
}: AddExpenseSheetProps) {
  const { householdMembers, addExpense, updateExpense, session } = useApp();
  const currentUser = useCurrentUser();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [assignee, setAssignee] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && existingExpense) {
      setName(existingExpense.name);
      setAmount(existingExpense.amount.toString());
      setCategory(existingExpense.category || "Other");
      setAssignee(existingExpense.assignee_id ? existingExpense.assignee_id.toString() : "");
      setNotes(existingExpense.notes ? existingExpense.notes : "");
    } else if (isOpen) {
      setName("");
      setAmount("");
      setCategory("Other");
      setAssignee(currentUser.id ? String(currentUser.id) : "");
      setNotes("");
    }
  }, [isOpen, existingExpense, currentUser.id]);

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

  if (!isOpen) return null;

  const isFormValid = name.trim() !== "" && amount.trim() !== "" && !isNaN(Number(amount));

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const expenseData = {
        name,
        amount: Number(amount),
        category,
        assignee_id: assignee || null,
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

        {/* 4. Assignee */}
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

        {/* 5. Notes */}
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
