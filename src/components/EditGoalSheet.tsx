"use client";

import React, { useState, useEffect } from "react";
import { useApp, type Fund } from "@/context/AppContext";
import Dialog, { DialogButton } from "@/components/ui/Dialog";

interface EditGoalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  existingGoal: Fund | null;
}

export default function EditGoalSheet({
  isOpen,
  onClose,
  existingGoal,
}: EditGoalSheetProps) {
  const { updateGoal } = useApp();

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [category, setCategory] = useState("Savings");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'completed' | 'paused'>("not_started");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && existingGoal) {
      setName(existingGoal.name);
      setTargetAmount(existingGoal.targetAmount.toString());
      setCurrentAmount(existingGoal.currentAmount.toString());
      setCategory(existingGoal.category);
      setDeadline(existingGoal.deadline || "");
      setStatus(existingGoal.status || "not_started");
    }
  }, [isOpen, existingGoal]);

  if (!isOpen || !existingGoal) return null;

  const isFormValid = 
    name.trim() !== "" && 
    targetAmount.trim() !== "" && 
    !isNaN(Number(targetAmount)) && 
    Number(targetAmount) > 0 &&
    !isNaN(Number(currentAmount));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSaving(true);
    try {
      const goalData = {
        name,
        category,
        currentAmount: Number(currentAmount) || 0,
        targetAmount: Number(targetAmount),
        deadline: deadline || null,
        status,
      };

      await updateGoal(existingGoal.id, goalData);
      onClose();
    } catch (error) {
      console.error("Failed to update goal:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Edit Goal"
      footer={
        <>
          <DialogButton variant="ghost" type="button" onClick={onClose}>
            Cancel
          </DialogButton>
          <DialogButton
            variant="primary"
            type="submit"
            form="edit-goal-form"
            disabled={!isFormValid || isSaving}
            className="uppercase tracking-wider"
          >
            {isSaving ? "Updating..." : "Update Goal"}
          </DialogButton>
        </>
      }
    >
      {/* Form Body */}
      <form
        id="edit-goal-form"
        onSubmit={handleSave}
        className="space-y-4 md:space-y-6"
      >

          {/* Goal Name */}
          <div className="flex flex-col space-y-1.5 md:space-y-2">
            <label className="font-heading text-xs font-semibold text-subtle uppercase tracking-wider">
              Goal Name
            </label>
            <input 
              type="text" 
              placeholder="e.g. Holiday Trip, House Deposit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[2px] border border-border bg-surface-raised px-4 py-2.5 md:py-3 text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-body text-sm"
              required
            />
          </div>

          {/* Target Amount */}
          <div className="flex flex-col space-y-1.5 md:space-y-2">
            <label className="font-heading text-xs font-semibold text-subtle uppercase tracking-wider">
              Target Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-mono">$</span>
              <input 
                type="number" 
                placeholder="0.00"
                min="1"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full rounded-[2px] border border-border bg-surface-raised pl-8 pr-4 py-2.5 md:py-3 font-mono text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Current Amount */}
          <div className="flex flex-col space-y-1.5 md:space-y-2">
            <label className="font-heading text-xs font-semibold text-subtle uppercase tracking-wider">
              Current Saved Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-mono">$</span>
              <input 
                type="number" 
                placeholder="0.00"
                min="0"
                step="0.01"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full rounded-[2px] border border-border bg-surface-raised pl-8 pr-4 py-2.5 md:py-3 font-mono text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
              />
            </div>
          </div>

          {/* Deadline Date Picker */}
          <div className="flex flex-col space-y-1.5 md:space-y-2">
            <label className="font-heading text-xs font-semibold text-subtle uppercase tracking-wider">
              Deadline
            </label>
            <input 
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full min-w-0 bg-surface border border-border rounded-[2px] p-2.5 md:p-3 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex flex-col space-y-1.5 md:space-y-2">
            <label className="font-heading text-xs font-semibold text-subtle uppercase tracking-wider">
              Status
            </label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-[2px] border border-border bg-surface-raised px-4 py-2.5 md:py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none text-sm"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="flex flex-col space-y-1.5 md:space-y-2">
            <label className="font-heading text-xs font-semibold text-subtle capitalize tracking-wider">
              Category
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-[2px] border border-border bg-surface-raised px-4 py-2.5 md:py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none text-sm"
              >
                <option value="Home & Living">Home & Living</option>
                <option value="Debt & Finance">Debt & Finance</option>
                <option value="Vacation & Travel">Vacation & Travel</option>
                <option value="Savings">Savings</option>
                <option value="Emergency">Emergency</option>
                <option value="Wish List">Wish List</option>
                <option value="Education">Education</option>
                <option value="Other">Other</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

      </form>
    </Dialog>
  );
}
