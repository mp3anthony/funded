"use client";

import React from "react";
import ChoiceField from "@/components/ui/ChoiceField";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import SingleCard from "@/components/ui/SingleCard";
import {
  KIND_OPTIONS,
  applyKindChange,
  goalCategoryOptions,
  type AddGoalValues,
  type GoalField,
  type GoalKind,
} from "@/lib/addGoalFlow";

const TITLES: Record<GoalField, string> = {
  name: "Name",
  kind: "Type",
  target: "Target",
  saved: "Saved",
  deadline: "Deadline",
  category: "Category",
};

/** Fields whose card has a text box the tap should focus (so the iOS keyboard opens at once). */
export function goalFieldTakesKeyboard(field: GoalField): boolean {
  return field === "name" || field === "target" || field === "saved";
}

interface GoalFieldCardProps {
  /** Null = closed. */
  field: GoalField | null;
  onClose: () => void;
  values: AddGoalValues;
  onChange: (patch: Partial<AddGoalValues>) => void;
  /** Id of the card's text box, so the opener can focus it inside the same tap. */
  inputId: string;
  /** Why Save is blocked right now, if it is. */
  error: string | null;
  /** Return false or throw to fail. */
  onSubmit: () => Promise<boolean | void>;
  successToast: string;
}

/**
 * One pop-up card for one field of a goal (R11, #398). Each field is a Field in
 * a SingleCard with a Save pill; the sheet owns the draft values and the save.
 * Rules (errors, payloads) live in `lib/addGoalFlow.ts`.
 */
export default function GoalFieldCard({
  field,
  onClose,
  values,
  onChange,
  inputId,
  error,
  onSubmit,
  successToast,
}: GoalFieldCardProps) {
  // Keep the last field while the card is closing so the title never goes blank.
  const shown: GoalField = field ?? "name";
  const typed = shown === "target" ? values.target : shown === "saved" ? values.saved : "x";
  const showError = error !== null && typed.trim() !== "";

  let body: React.ReactNode = null;
  let secondaryAction: { label: string; onClick: () => void } | undefined;

  switch (shown) {
    case "name":
      body = (
        <Field id={inputId} label="What's it for?" question error={showError ? error : undefined}>
          <Input
            id={inputId}
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            enterKeyHint="done"
            autoComplete="off"
            aria-invalid={showError || undefined}
          />
        </Field>
      );
      break;
    case "kind":
      body = (
        <ChoiceField
          id={`${inputId}-kind`}
          question="What type of goal?"
          options={KIND_OPTIONS}
          value={values.kind}
          onChange={(kind) => onChange(applyKindChange(values, kind as GoalKind))}
        />
      );
      break;
    case "target":
      body = (
        <Field id={inputId} label="How much is the target?" question error={showError ? error : undefined}>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              $
            </span>
            <Input
              id={inputId}
              inputMode="decimal"
              placeholder="0.00"
              value={values.target}
              onChange={(e) => onChange({ target: e.target.value })}
              enterKeyHint="done"
              autoComplete="off"
              className="pl-8"
              aria-invalid={showError || undefined}
            />
          </div>
        </Field>
      );
      break;
    case "saved":
      body = (
        <Field
          id={inputId}
          label="How much is saved so far?"
          question
          description="This sets the total. Use Add amount for a top-up."
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
              value={values.saved}
              onChange={(e) => onChange({ saved: e.target.value })}
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
    case "deadline":
      body = (
        <Field
          id={`${inputId}-deadline`}
          label="Is there a deadline?"
          question
          description="Leave blank for no deadline."
        >
          <Input
            id={`${inputId}-deadline`}
            type="date"
            value={values.deadline}
            onChange={(e) => onChange({ deadline: e.target.value })}
            aria-describedby={`${inputId}-deadline-desc`}
          />
        </Field>
      );
      if (values.deadline) {
        secondaryAction = { label: "Clear date", onClick: () => onChange({ deadline: "" }) };
      }
      break;
    case "category":
      body = (
        <ChoiceField
          id={`${inputId}-category`}
          question="Which category?"
          options={goalCategoryOptions(values.category)}
          value={values.category}
          onChange={(category) => onChange({ category })}
        />
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
      secondaryAction={secondaryAction}
    >
      {body}
    </SingleCard>
  );
}
