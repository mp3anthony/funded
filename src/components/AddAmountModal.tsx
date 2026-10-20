"use client";

import { useState } from "react";
import { useApp, type Fund } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import SingleCard from "@/components/ui/SingleCard";
import { parseAmount } from "@/lib/addGoalFlow";

interface AddAmountModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Fund | null;
  /** Id of the amount box, so the opener can focus it inside the same tap (iOS keyboard). */
  inputId: string;
}

const QUICK_AMOUNTS = [10, 25, 50, 100];

/**
 * "Add to {goal}" as a one-field card (R11, #398). It adds to the goal itself, so a
 * failed save keeps the card open with a red line and "Try again" (fixes #435).
 */
export default function AddAmountModal({ isOpen, onClose, goal, inputId }: AddAmountModalProps) {
  const { addToGoal } = useApp();
  const [amountStr, setAmountStr] = useState("");

  // Keep the goal's name while the card closes so the title never goes blank.
  const [shownName, setShownName] = useState(goal?.name ?? "");
  if (goal && goal.name !== shownName) setShownName(goal.name);

  // Fresh amount each time the card opens (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) setAmountStr("");
  }

  const amount = parseAmount(amountStr);
  const showError = amountStr.trim() !== "" && amount === null;

  return (
    <SingleCard
      open={isOpen && goal !== null}
      onClose={onClose}
      title={`Add to ${shownName}`}
      submitLabel="Add"
      canSubmit={amount !== null}
      onSubmit={async () => {
        if (!goal || amount === null) return false;
        await addToGoal(goal.id, amount);
      }}
      successToast={`Added to ${shownName}`}
    >
      <Field
        id={inputId}
        label="How much are you adding?"
        question
        error={showError ? "Enter an amount above $0" : undefined}
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            $
          </span>
          <Input
            id={inputId}
            inputMode="decimal"
            placeholder="0.00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            enterKeyHint="done"
            autoComplete="off"
            className="pl-8"
            aria-invalid={showError || undefined}
          />
        </div>
      </Field>
      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((amt) => (
          <Button key={amt} variant="ghost" className="px-4" onClick={() => setAmountStr(String(amt))}>
            +${amt}
          </Button>
        ))}
      </div>
    </SingleCard>
  );
}
