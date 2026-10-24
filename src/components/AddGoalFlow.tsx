"use client";

import React, { useId, useState } from "react";
import { useApp } from "@/context/AppContext";
import ChoiceField from "@/components/ui/ChoiceField";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Row from "@/components/ui/Row";
import SectionHeader from "@/components/ui/SectionHeader";
import StepFlow, { type FlowStep } from "@/components/ui/StepFlow";
import { hasChanges } from "@/lib/stepFlow";
import {
  GOAL_CATEGORIES,
  KIND_OPTIONS,
  amountLabel,
  applyKindChange,
  buildGoalPayload,
  deadlineLabel,
  initialValues,
  optionLabel,
  parseAmount,
  parseSaved,
  stepKeys,
  type AddGoalValues,
  type AddedGoal,
  type GoalKind,
} from "@/lib/addGoalFlow";

const CATEGORY_OPTIONS = GOAL_CATEGORIES.map((c) => ({ value: c, label: c }));

interface AddGoalFlowProps {
  open: boolean;
  onClose: () => void;
  /** Called once the new goal is saved (the page expands its category and highlights it). */
  onAdded?: (goal: AddedGoal) => void;
}

/**
 * The one way to add a goal (R08, #395): a StepFlow with the essential cards
 * (Kind, Name, Target and, for a Saving goal, Already saved), then a summary
 * whose "Optional details" rows (Deadline, Category) open extra cards. All
 * entries live here, so Back and detours keep them and a failed save
 * ("Try again") loses nothing. Rules live in `lib/addGoalFlow.ts`.
 */
export default function AddGoalFlow({ open, onClose, onAdded }: AddGoalFlowProps) {
  const uid = useId();
  const { addFund } = useApp();

  const [values, setValues] = useState<AddGoalValues>(() => initialValues());
  // Fresh values each time the flow opens (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValues(initialValues());
  }

  const patch = (p: Partial<AddGoalValues>) => setValues((v) => ({ ...v, ...p }));

  const isSaving = values.kind === "saving";
  const targetOk = parseAmount(values.target) !== null;
  const showTargetError = values.target.trim() !== "" && !targetOk;
  const savedOk = parseSaved(values.saved) !== null;
  const showSavedError = values.saved.trim() !== "" && !savedOk;

  const kindStep: FlowStep = {
    key: "kind",
    autoFocus: false,
    content: (
      <ChoiceField
        id={`${uid}-kind`}
        question="What kind of goal?"
        options={KIND_OPTIONS}
        value={values.kind}
        onChange={(k) => setValues((v) => applyKindChange(v, k as GoalKind))}
      />
    ),
  };

  const nameStep: FlowStep = {
    key: "name",
    valid: values.name.trim() !== "",
    content: (
      <Field id={`${uid}-name`} label="What's it for?" question>
        <Input
          id={`${uid}-name`}
          value={values.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. Holiday, House deposit"
          enterKeyHint="next"
          autoComplete="off"
        />
      </Field>
    ),
  };

  const targetId = `${uid}-target`;
  const targetStep: FlowStep = {
    key: "target",
    valid: targetOk,
    content: (
      <Field
        id={targetId}
        label="How much is the target?"
        question
        error={showTargetError ? "Enter an amount above $0" : undefined}
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            $
          </span>
          <Input
            id={targetId}
            inputMode="decimal"
            placeholder="0.00"
            value={values.target}
            onChange={(e) => patch({ target: e.target.value })}
            enterKeyHint="next"
            autoComplete="off"
            className="pl-8"
            aria-invalid={showTargetError || undefined}
            aria-describedby={showTargetError ? `${targetId}-err` : undefined}
          />
        </div>
      </Field>
    ),
  };

  const savedId = `${uid}-saved`;
  const savedStep: FlowStep = {
    key: "saved",
    valid: savedOk,
    optional: true,
    onSkip: () => patch({ saved: "" }),
    content: (
      <Field
        id={savedId}
        label="How much is already saved?"
        question
        description="Leave at $0 if you're starting fresh."
        error={showSavedError ? "Enter an amount of $0 or more" : undefined}
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            $
          </span>
          <Input
            id={savedId}
            inputMode="decimal"
            placeholder="0.00"
            value={values.saved}
            onChange={(e) => patch({ saved: e.target.value })}
            enterKeyHint="next"
            autoComplete="off"
            className="pl-8"
            aria-invalid={showSavedError || undefined}
            aria-describedby={
              [`${savedId}-desc`, showSavedError && `${savedId}-err`].filter(Boolean).join(" ")
            }
          />
        </div>
      </Field>
    ),
  };

  const byKey: Record<string, FlowStep> = {
    kind: kindStep,
    name: nameStep,
    target: targetStep,
    saved: savedStep,
  };
  const steps = stepKeys(values.kind).map((k) => byKey[k]);

  const extras: FlowStep[] = [
    {
      key: "deadline",
      autoFocus: false,
      content: (
        <Field
          id={`${uid}-deadline`}
          label="Is there a deadline?"
          question
          description="Leave blank for no deadline."
        >
          <Input
            id={`${uid}-deadline`}
            type="date"
            value={values.deadline}
            onChange={(e) => patch({ deadline: e.target.value })}
            aria-describedby={`${uid}-deadline-desc`}
          />
        </Field>
      ),
    },
    {
      key: "category",
      autoFocus: false,
      content: (
        <ChoiceField
          id={`${uid}-category`}
          question="Which category?"
          options={CATEGORY_OPTIONS}
          value={values.category}
          onChange={(category) => patch({ category })}
        />
      ),
    },
  ];

  const targetNum = parseAmount(values.target);
  const savedNum = parseSaved(values.saved);

  const summary = ({ edit }: { edit: (key: string) => void }) => (
    <>
      <div className="flex flex-col">
        <Row
          tall
          chevron
          label="Kind"
          value={optionLabel(KIND_OPTIONS, values.kind)}
          onClick={() => edit("kind")}
        />
        <Row tall chevron label="Name" value={values.name.trim() || "—"} onClick={() => edit("name")} />
        <Row
          tall
          chevron
          label="Target"
          value={targetNum === null ? "—" : amountLabel(targetNum)}
          onClick={() => edit("target")}
        />
        {isSaving && (
          <Row
            tall
            chevron
            label="Already saved"
            value={savedNum === null ? "—" : amountLabel(savedNum)}
            onClick={() => edit("saved")}
          />
        )}
      </div>
      <div className="flex flex-col">
        <SectionHeader title="Optional details" size="sm" className="mb-1 mt-2" />
        <Row
          tall
          chevron
          label="Deadline"
          value={deadlineLabel(values.deadline)}
          onClick={() => edit("deadline")}
        />
        <Row tall chevron label="Category" value={values.category} onClick={() => edit("category")} />
      </div>
    </>
  );

  const announce = (goal: AddedGoal) => {
    // The goal is already saved: a problem here must not fail the save (a retry would add it twice).
    try {
      onAdded?.(goal);
    } catch (err) {
      console.error("onAdded failed:", err);
    }
  };

  const onSubmit = async () => {
    const id = await addFund(buildGoalPayload(values));
    announce({ id, category: values.category });
  };

  return (
    <StepFlow
      open={open}
      onClose={onClose}
      title="Add a goal"
      noun="goal"
      steps={steps}
      extras={extras}
      summary={summary}
      submitLabel="Add goal"
      successToast="Goal added"
      dirty={hasChanges(
        values as unknown as Record<string, unknown>,
        initialValues() as unknown as Record<string, unknown>
      )}
      onSubmit={onSubmit}
    />
  );
}
