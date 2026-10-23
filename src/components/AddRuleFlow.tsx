"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { useApp, useCurrentUser } from "@/context/AppContext";
import ChoiceField from "@/components/ui/ChoiceField";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Row from "@/components/ui/Row";
import StepFlow, { type FlowStep } from "@/components/ui/StepFlow";
import { isAcceptedMember } from "@/lib/householdLeave";
import { hasChanges } from "@/lib/stepFlow";
import { savingGoals } from "@/lib/goalPace";
import { canPickMember } from "@/lib/addPayFlow";
import {
  AMOUNT_TYPE_OPTIONS,
  applyAmountTypeChange,
  buildRulePayload,
  effectiveMember,
  initialValues,
  optionLabel,
  parseRuleAmount,
  parseThreshold,
  ruleAmountLabel,
  stepKeys,
  thresholdLabel,
  type AddRuleValues,
  type AmountType,
} from "@/lib/addRuleFlow";

interface AddRuleFlowProps {
  open: boolean;
  onClose: () => void;
  /** Pre-picks the goal and skips the goal card (for a goal's own "Rules for this goal"). */
  goalId?: string;
}

/**
 * The one way to add a rule (R09, #396): a StepFlow with a card per question
 * (whose pay, which goal, the threshold, set amount or percentage, the amount),
 * then a summary. New rules always add to a goal; older "Add to Contribution"
 * rules keep working and stay editable in Rules. Only an owner with 2+ members
 * is asked "Whose pay"; everyone else makes the rule for themselves. Rules live
 * in `lib/addRuleFlow.ts`.
 */
export default function AddRuleFlow({ open, onClose, goalId }: AddRuleFlowProps) {
  const uid = useId();
  const { addRule, householdMembers, funds } = useApp();
  const currentUser = useCurrentUser();

  const [values, setValues] = useState<AddRuleValues>(() => initialValues(goalId));
  // Fresh values each time the flow opens (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValues(initialValues(goalId));
  }

  const patch = (p: Partial<AddRuleValues>) => setValues((v) => ({ ...v, ...p }));

  // Pending (not yet joined) members are not offered.
  const acceptedMembers = householdMembers.filter(isAcceptedMember);
  const canPick = canPickMember(currentUser.isOwner, acceptedMembers.length);
  const memberId = effectiveMember(values.member, {
    isOwner: canPick,
    currentId: String(currentUser.id),
  });
  const memberName = householdMembers.find((m) => String(m.id) === memberId)?.name ?? "—";

  // R17: new rules only offer Saving goals. A goal pre-picked through `goalId` is still allowed, and
  // rules already on a Just tracking goal keep working (they show in its sheet).
  const pickable = savingGoals(funds);
  const goalOk = funds.some((g) => String(g.id) === values.goalId);
  const goalName = funds.find((g) => String(g.id) === values.goalId)?.name ?? "—";

  const thresholdOk = parseThreshold(values.threshold) !== null;
  const showThresholdError = values.threshold.trim() !== "" && !thresholdOk;
  const isPercent = values.amountType === "percentage";
  const amountOk = parseRuleAmount(values.amountType, values.amount) !== null;
  const showAmountError = values.amount.trim() !== "" && !amountOk;

  const memberStep: FlowStep = {
    key: "member",
    autoFocus: false,
    content: (
      <ChoiceField
        id={`${uid}-member`}
        question="Whose pay is this rule for?"
        options={acceptedMembers.map((m) => ({ value: String(m.id), label: m.name }))}
        value={memberId}
        onChange={(member) => patch({ member })}
      />
    ),
  };

  const goalStep: FlowStep = {
    key: "goal",
    valid: goalOk,
    autoFocus: false,
    content:
      pickable.length === 0 ? (
        <div role="note" className="flex flex-col gap-2">
          <p className="text-[17px] font-semibold text-foreground">Which goal does the extra go to?</p>
          <p className="text-[13px] text-muted">
            Add a goal first, then make a rule for it.{" "}
            <Link href="/funds?add=1" onClick={onClose} className="text-primary underline">
              Add a goal
            </Link>
          </p>
        </div>
      ) : (
        <ChoiceField
          id={`${uid}-goal`}
          question="Which goal does the extra go to?"
          options={pickable.map((g) => ({ value: String(g.id), label: g.name }))}
          value={values.goalId}
          placeholder="Choose a goal"
          onChange={(goal) => patch({ goalId: goal })}
        />
      ),
  };

  const thresholdId = `${uid}-threshold`;
  const thresholdStep: FlowStep = {
    key: "threshold",
    valid: thresholdOk,
    content: (
      <Field
        id={thresholdId}
        label={`When ${memberName}'s pay is more than…`}
        question
        description="The rule runs on any pay above this. $0 means every pay."
        error={showThresholdError ? "Enter an amount of $0 or more" : undefined}
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            $
          </span>
          <Input
            id={thresholdId}
            inputMode="decimal"
            placeholder="0.00"
            value={values.threshold}
            onChange={(e) => patch({ threshold: e.target.value })}
            enterKeyHint="next"
            autoComplete="off"
            className="pl-8"
            aria-invalid={showThresholdError || undefined}
            aria-describedby={
              [`${thresholdId}-desc`, showThresholdError && `${thresholdId}-err`].filter(Boolean).join(" ")
            }
          />
        </div>
      </Field>
    ),
  };

  const amountTypeStep: FlowStep = {
    key: "amountType",
    autoFocus: false,
    content: (
      <ChoiceField
        id={`${uid}-amountType`}
        question="How much of the extra goes to the goal?"
        options={AMOUNT_TYPE_OPTIONS}
        value={values.amountType}
        onChange={(t) => setValues((v) => applyAmountTypeChange(v, t as AmountType))}
      />
    ),
  };

  const amountId = `${uid}-amount`;
  const amountStep: FlowStep = {
    key: "amount",
    valid: amountOk,
    content: (
      <Field
        id={amountId}
        label={isPercent ? "What percentage?" : "How much is it?"}
        question
        error={showAmountError ? (isPercent ? "Enter 0.01 to 100" : "Enter an amount above $0") : undefined}
      >
        <div className="relative">
          {!isPercent && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              $
            </span>
          )}
          <Input
            id={amountId}
            inputMode="decimal"
            placeholder={isPercent ? "0" : "0.00"}
            value={values.amount}
            onChange={(e) => patch({ amount: e.target.value })}
            enterKeyHint="next"
            autoComplete="off"
            className={isPercent ? "pr-10" : "pl-8"}
            aria-invalid={showAmountError || undefined}
            aria-describedby={showAmountError ? `${amountId}-err` : undefined}
          />
          {isPercent && (
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
              %
            </span>
          )}
        </div>
      </Field>
    ),
  };

  const byKey: Record<string, FlowStep> = {
    member: memberStep,
    goal: goalStep,
    threshold: thresholdStep,
    amountType: amountTypeStep,
    amount: amountStep,
  };
  // A pre-picked goal (the `goalId` prop) skips the goal card, but only if that goal exists.
  const skipGoal = !!goalId && funds.some((g) => String(g.id) === goalId);
  const steps = stepKeys(canPick)
    .filter((k) => !(k === "goal" && skipGoal))
    .map((k) => byKey[k]);

  const summary = ({ edit }: { edit: (key: string) => void }) => (
    <div className="flex flex-col">
      {canPick ? (
        <Row tall chevron label="Whose pay" value={memberName} onClick={() => edit("member")} />
      ) : (
        <Row tall label="Whose pay" value={memberName} />
      )}
      {skipGoal ? (
        <Row tall label="Goal" value={goalName} />
      ) : (
        <Row tall chevron label="Goal" value={goalName} onClick={() => edit("goal")} />
      )}
      <Row
        tall
        chevron
        label="Threshold"
        value={thresholdLabel(values.threshold)}
        onClick={() => edit("threshold")}
      />
      <Row
        tall
        chevron
        label="Type"
        value={optionLabel(AMOUNT_TYPE_OPTIONS, values.amountType)}
        onClick={() => edit("amountType")}
      />
      <Row
        tall
        chevron
        label="Amount"
        value={ruleAmountLabel(values.amountType, values.amount)}
        onClick={() => edit("amount")}
      />
    </div>
  );

  const onSubmit = async () => {
    await addRule(buildRulePayload(values, memberId));
  };

  return (
    <StepFlow
      open={open}
      onClose={onClose}
      title="Add a rule"
      noun="rule"
      steps={steps}
      summary={summary}
      submitLabel="Add rule"
      successToast="Rule added"
      canSubmit={memberId !== "" && goalOk}
      dirty={hasChanges(
        values as unknown as Record<string, unknown>,
        initialValues(goalId) as unknown as Record<string, unknown>
      )}
      onSubmit={onSubmit}
    />
  );
}
