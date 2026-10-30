"use client";

import React from "react";
import ChoiceField from "@/components/ui/ChoiceField";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import SingleCard from "@/components/ui/SingleCard";
import {
  AMOUNT_TYPE_OPTIONS,
  applyAmountTypeChange,
  type AddRuleValues,
  type AmountType,
  type RuleField,
} from "@/lib/addRuleFlow";

const TITLES: Record<RuleField, string> = {
  member: "Whose pay",
  goal: "Goal",
  threshold: "Threshold",
  amount: "Amount",
};

/** Fields whose card has a text box the tap should focus (so the iOS keyboard opens at once). */
export function ruleFieldTakesKeyboard(field: RuleField): boolean {
  return field === "threshold" || field === "amount";
}

interface RuleFieldCardProps {
  /** Null = closed. */
  field: RuleField | null;
  onClose: () => void;
  values: AddRuleValues;
  /** Gets the whole next draft (the type change clears the amount). */
  onChange: (next: AddRuleValues) => void;
  memberChoices: { value: string; label: string }[];
  goalChoices: { value: string; label: string }[];
  /** Whose pay the threshold question names. */
  memberName: string;
  /** Id of the card's text box, so the opener can focus it inside the same tap. */
  inputId: string;
  /** Why Save is blocked right now, if it is. */
  error: string | null;
  /** Return false or throw to fail. */
  onSubmit: () => Promise<boolean | void>;
  successToast: string;
}

/**
 * One pop-up card for one field of a rule (R11, #398). Each field is a Field in
 * a SingleCard with a Save pill; the sheet owns the draft values and the save.
 * The Amount card carries the set amount / percentage choice too. Rules
 * (errors, payloads) live in `lib/addRuleFlow.ts`.
 */
export default function RuleFieldCard({
  field,
  onClose,
  values,
  onChange,
  memberChoices,
  goalChoices,
  memberName,
  inputId,
  error,
  onSubmit,
  successToast,
}: RuleFieldCardProps) {
  // Keep the last field while the card is closing so the title never goes blank.
  const shown: RuleField = field ?? "threshold";
  const patch = (p: Partial<AddRuleValues>) => onChange({ ...values, ...p });
  const isPercent = values.amountType === "percentage";
  const typed = shown === "threshold" ? values.threshold : values.amount;
  const showError = error !== null && (shown === "threshold" || shown === "amount") && typed.trim() !== "";

  let body: React.ReactNode = null;

  switch (shown) {
    case "member":
      body = (
        <ChoiceField
          id={`${inputId}-member`}
          question="Whose pay is this rule for?"
          options={memberChoices}
          value={values.member}
          onChange={(member) => patch({ member })}
        />
      );
      break;
    case "goal":
      body = (
        <ChoiceField
          id={`${inputId}-goal`}
          question="Which goal does the extra go to?"
          options={goalChoices}
          value={values.goalId}
          placeholder="Choose a goal"
          onChange={(goalId) => patch({ goalId })}
        />
      );
      break;
    case "threshold":
      body = (
        <Field
          id={inputId}
          label={`When ${memberName}'s pay is more than…`}
          question
          description="The rule runs on any pay above this. $0 means every pay."
          error={showError ? error : undefined}
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              $
            </span>
            <Input
              id={inputId}
              inputMode="decimal"
              placeholder="0.00"
              value={values.threshold}
              onChange={(e) => patch({ threshold: e.target.value })}
              enterKeyHint="done"
              autoComplete="off"
              className="pl-8"
              aria-invalid={showError || undefined}
              aria-describedby={`${inputId}-desc`}
            />
          </div>
        </Field>
      );
      break;
    case "amount":
      body = (
        <div className="flex flex-col gap-4">
          <ChoiceField
            id={`${inputId}-amountType`}
            question="How much of the extra goes to the goal?"
            options={AMOUNT_TYPE_OPTIONS}
            value={values.amountType}
            onChange={(t) => onChange(applyAmountTypeChange(values, t as AmountType))}
          />
          <Field
            id={inputId}
            label={isPercent ? "What percentage?" : "How much is it?"}
            question
            error={showError ? error : undefined}
          >
            <div className="relative">
              {!isPercent && (
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                  $
                </span>
              )}
              <Input
                id={inputId}
                inputMode="decimal"
                placeholder={isPercent ? "0" : "0.00"}
                value={values.amount}
                onChange={(e) => patch({ amount: e.target.value })}
                enterKeyHint="done"
                autoComplete="off"
                className={isPercent ? "pr-10" : "pl-8"}
                aria-invalid={showError || undefined}
              />
              {isPercent && (
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                  %
                </span>
              )}
            </div>
          </Field>
        </div>
      );
      break;
  }

  return (
    <SingleCard
      open={field !== null}
      onClose={onClose}
      title={TITLES[shown]}
      submitLabel="Save"
      canSubmit={error === null}
      onSubmit={onSubmit}
      successToast={successToast}
    >
      {body}
    </SingleCard>
  );
}
