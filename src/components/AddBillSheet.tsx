/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState } from "react";
import { useApp, useCurrentUser, type Bill, type BillSplit } from "@/context/AppContext";
import ContributorSplits, { type SplitResult } from "./ContributorSplits";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import ItemTypeToggle from "./ItemTypeToggle";

interface AddBillSheetProps {
  isOpen: boolean;
  onClose: () => void;
  existingBill?: Bill;
  existingSplits?: BillSplit[];
  /** Add-mode only (no existingBill): lets the user swap to the Expense
   * form without closing/reopening the dialog by hand. Omitted entirely
   * while editing, since an existing item's type is fixed. */
  onSwitchToExpense?: () => void;
}

export default function AddBillSheet({ isOpen, onClose, existingBill, existingSplits, onSwitchToExpense }: AddBillSheetProps) {
  const { householdMembers, addBill, updateBill, session, isJointFund } = useApp();
  const currentUser = useCurrentUser();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("Other");
  const [paymentType, setPaymentType] = useState<"Manual" | "Auto">("Manual");
  const [assignee, setAssignee] = useState("");
  const [splits, setSplits] = useState<SplitResult[]>([]);
  const [notes, setNotes] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [paidByMode, setPaidByMode] = useState<"joint" | "individual">("individual");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-fill fields if in edit mode
  React.useEffect(() => {
    if (isOpen && existingBill) {
      setName(existingBill.name);
      setAmount(existingBill.amount.toString());
      setInvoiceDate(existingBill.invoice_date ? existingBill.invoice_date : "");
      setDueDate(existingBill.due_date ? existingBill.due_date : "");
      setPaymentType(existingBill.payment_type?.toLowerCase() === "auto" ? "Auto" : "Manual");
      setCategory(existingBill.category || "Other");
      setAssignee(existingBill.assignee_id ? existingBill.assignee_id.toString() : "");
      setNotes(existingBill.notes ? existingBill.notes : "");
      setFrequency(existingBill.frequency ? existingBill.frequency.toLowerCase() : "monthly");
      
      const hasSplits = existingSplits && existingSplits.length > 0;
      setPaidByMode(hasSplits ? "individual" : (isJointFund ? "joint" : "individual"));
    } else if (isOpen) {
      setName("");
      setAmount("");
      setInvoiceDate("");
      setDueDate("");
      setCategory("Other");
      setPaymentType("Manual");
      setAssignee(currentUser.id ? String(currentUser.id) : "");
      setSplits([]);
      setNotes("");
      setFrequency("monthly");
      setPaidByMode(isJointFund ? "joint" : "individual");
    }
  }, [isOpen, existingBill, currentUser.id, isJointFund, existingSplits]);

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
      const billData = {
        name,
        amount: Number(amount),
        category,
        invoiceDate,
        dueDate,
        paymentType,
        assignee,
        notes,
        frequency,
      };

      const finalSplits = paidByMode === "joint" ? [] : splits;

      if (existingBill) {
        await updateBill(existingBill.id, billData, finalSplits);
      } else {
        await addBill(billData, finalSplits);
      }
      
      // Reset form on success
      setName("");
      setAmount("");
      setInvoiceDate("");
      setDueDate("");
      setCategory("Other");
      setPaymentType("Manual");
      setAssignee("");
      setSplits([]);
      setNotes("");
      
      onClose();
    } catch (error) {
      const err = error as Error;
      console.error("Failed to save bill:", err);
      setErrorMsg(err.message || "Failed to save bill. Please verify details and permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={existingBill ? "Edit Bill" : "Add Bill"}
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
            {existingBill
              ? isSaving
                ? "Updating..."
                : "Update Bill"
              : isSaving
                ? "Saving..."
                : "Save Bill"}
          </DialogButton>
        </>
      }
    >
      {/* Form Body */}
      <div className="space-y-4 md:space-y-6">
          {!existingBill && onSwitchToExpense && (
            <ItemTypeToggle value="bill" onChange={(t) => t === "expense" && onSwitchToExpense()} />
          )}

          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
              <span className="font-bold">Failed to save bill:</span><br/>
              {errorMsg}
            </div>
          )}
          
          {/* 1. Bill Name */}
          <div className="flex flex-col space-y-2">
            <label className="font-heading text-sm font-semibold text-subtle uppercase tracking-wider">
              Bill Name
            </label>
            <input 
              type="text" 
              placeholder="e.g., Internet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[2px] border border-border bg-surface-raised px-4 py-2.5 md:py-3 text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
            />
          </div>

          {/* 1.5 Bill Category */}
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

          {/* 2. Bill Amount */}
          <div className="flex flex-col space-y-2">
            <label className="font-heading text-sm font-semibold text-subtle capitalize tracking-wider">
              Bill Amount
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

          {/* Payment Frequency Selector */}
          <div className="flex flex-col space-y-2">
            <div className="flex flex-col">
              <label className="font-heading text-sm font-semibold text-subtle uppercase tracking-wider">
                Payment Frequency
              </label>
              <span className="text-xs text-muted">
                How often is this bill paid?
              </span>
            </div>
            <div className="relative">
              <select
                value={frequency.toLowerCase()}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-[2px] border border-border bg-background px-4 py-2.5 md:py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none transition-all cursor-pointer pr-10"
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Date Row (3. Invoice Date & 4. Due Date) */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-1 flex-col space-y-2">
              <label className="font-heading text-sm font-semibold text-subtle capitalize tracking-wider">
                Invoice Date
              </label>
              <input 
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full min-w-0 rounded-[2px] border border-border bg-surface-raised px-4 py-2.5 md:py-3 font-mono text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            
            <div className="flex flex-1 flex-col space-y-2">
              <label className="font-heading text-sm font-semibold text-subtle uppercase tracking-wider">
                Due Date
              </label>
              <input 
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-w-0 rounded-[2px] border border-border bg-surface-raised px-4 py-2.5 md:py-3 font-mono text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          </div>

          {/* 5. Payment Type */}
          <div className="flex flex-col space-y-2">
            <label className="font-heading text-sm font-semibold text-subtle uppercase tracking-wider">
              Payment Type
            </label>
            <div className="relative">
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as "Manual" | "Auto")}
                className="w-full rounded-[2px] border border-border bg-background px-4 py-2.5 md:py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none transition-all cursor-pointer pr-10"
              >
                <option value="Manual">Manual</option>
                <option value="Auto">Auto-Pay</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 6. Assignee */}
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

          {/* 7. Paid By Selector */}
          <div className="flex flex-col space-y-2 pt-2">
            <label className="font-heading text-sm font-semibold text-subtle capitalize tracking-wider">
              Paid By
            </label>
            {isJointFund ? (
              <div className="flex flex-col space-y-3">
                {/* Selector */}
                <div className="relative">
                  <select
                    value={paidByMode}
                    onChange={(e) => setPaidByMode(e.target.value as "joint" | "individual")}
                    className="w-full rounded-[2px] border border-border bg-background px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none transition-all cursor-pointer pr-10 capitalize tracking-wider font-bold"
                  >
                    <option value="joint">Joint Fund</option>
                    <option value="individual">Individual Splits</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>

                {paidByMode === "individual" ? (
                  <ContributorSplits 
                    totalBillAmount={Number(amount) || 0}
                    assigneeMemberId={assignee}
                    onSplitsChange={setSplits}
                    initialSplits={existingSplits}
                  />
                ) : (
                  <div className="p-4 rounded-[2px] border border-dashed border-border bg-surface-raised/20 text-center">
                    <p className="text-xs text-muted font-mono">
                      Paid directly from the household Joint Fund account.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <ContributorSplits 
                totalBillAmount={Number(amount) || 0}
                assigneeMemberId={assignee}
                onSplitsChange={setSplits}
                initialSplits={existingSplits}
              />
            )}
          </div>

          {/* 8. Notes */}
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
