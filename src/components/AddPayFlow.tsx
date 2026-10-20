"use client";

import React, { useId, useState } from "react";
import { useApp, useCurrentUser } from "@/context/AppContext";
import ChoiceField from "@/components/ui/ChoiceField";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Row from "@/components/ui/Row";
import StepFlow, { type FlowStep } from "@/components/ui/StepFlow";
import { isAcceptedMember } from "@/lib/householdLeave";
import { hasChanges } from "@/lib/stepFlow";
import {
  PAY_FREQUENCY_OPTIONS,
  PAY_TYPE_OPTIONS,
  amountLabel,
  buildPaySchedulePayload,
  canPickMember,
  dateLabel,
  effectiveMember,
  initialValues,
  optionLabel,
  parseAmount,
  stepKeys,
  type AddPayValues,
  type PayFrequency,
  type PayType,
} from "@/lib/addPayFlow";

interface AddPayFlowProps {
  open: boolean;
  onClose: () => void;
  /** Called once the new pay schedule is saved (the page scrolls to it and highlights it). */
  onAdded?: (id: string) => void;
}

/**
 * The one way to add a pay schedule (R09, #396): a StepFlow with a card per
 * question (whose pay, fixed or variable, how often, next payday and, for fixed
 * pay, the amount), then a summary. Only an owner with 2+ members is asked
 * "Whose pay"; everyone else saves their own. All entries live here, so Back
 * keeps them and a failed save ("Try again") loses nothing. Rules live in
 * `lib/addPayFlow.ts`. Editing an existing schedule is in PayScheduleDetailSheet.
 */
export default function AddPayFlow({ open, onClose, onAdded }: AddPayFlowProps) {
  const uid = useId();
  const { addPaySchedule, householdMembers } = useApp();
  const currentUser = useCurrentUser();

  const [values, setValues] = useState<AddPayValues>(() => initialValues());
  // Fresh values each time the flow opens (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValues(initialValues());
  }

  const patch = (p: Partial<AddPayValues>) => setValues((v) => ({ ...v, ...p }));

  // Pending (not yet joined) members are not offered.
  const acceptedMembers = householdMembers.filter(isAcceptedMember);
  const canPick = canPickMember(currentUser.isOwner, acceptedMembers.length);
  const memberId = effectiveMember(values.member, {
    isOwner: canPick,
    currentId: String(currentUser.id),
    memberIds: acceptedMembers.map((m) => String(m.id)),
  });
  const memberName = householdMembers.find((m) => String(m.id) === memberId)?.name ?? "—";

  const isFixed = values.payType === "fixed";
  const amountOk = parseAmount(values.amount) !== null;
  const showAmountError = values.amount.trim() !== "" && !amountOk;

  const memberStep: FlowStep = {
    key: "member",
    autoFocus: false,
    content: (
      <ChoiceField
        id={`${uid}-member`}
        question="Whose pay is this?"
        options={acceptedMembers.map((m) => ({ value: String(m.id), label: m.name }))}
        value={memberId}
        onChange={(member) => patch({ member })}
      />
    ),
  };

  const payTypeStep: FlowStep = {
    key: "payType",
    autoFocus: false,
    content: (
      <ChoiceField
        id={`${uid}-payType`}
        question="Is the pay the same each time?"
        options={PAY_TYPE_OPTIONS}
        value={values.payType}
        onChange={(payType) => patch({ payType: payType as PayType })}
      />
    ),
  };

  const frequencyStep: FlowStep = {
    key: "frequency",
    autoFocus: false,
    content: (
      <ChoiceField
        id={`${uid}-frequency`}
        question="How often is it paid?"
        options={PAY_FREQUENCY_OPTIONS}
        value={values.frequency}
        onChange={(frequency) => patch({ frequency: frequency as PayFrequency })}
      />
    ),
  };

  const dateStep: FlowStep = {
    key: "nextPayDate",
    valid: values.nextPayDate !== "",
    autoFocus: false,
    content: (
      <Field
        id={`${uid}-date`}
        label="When is the next payday?"
        question
        description="A date in the past is fine. The next ones follow from it."
      >
        <Input
          id={`${uid}-date`}
          type="date"
          value={values.nextPayDate}
          onChange={(e) => patch({ nextPayDate: e.target.value })}
          aria-describedby={`${uid}-date-desc`}
        />
      </Field>
    ),
  };

  const amountId = `${uid}-amount`;
  const amountStep: FlowStep = {
    key: "amount",
    valid: amountOk,
    content: (
      <Field
        id={amountId}
        label="How much is each pay?"
        question
        error={showAmountError ? "Enter an amount above $0" : undefined}
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            $
          </span>
          <Input
            id={amountId}
            inputMode="decimal"
            placeholder="0.00"
            value={values.amount}
            onChange={(e) => patch({ amount: e.target.value })}
            enterKeyHint="next"
            autoComplete="off"
            className="pl-8"
            aria-invalid={showAmountError || undefined}
            aria-describedby={showAmountError ? `${amountId}-err` : undefined}
          />
        </div>
      </Field>
    ),
  };

  const byKey: Record<string, FlowStep> = {
    member: memberStep,
    payType: payTypeStep,
    frequency: frequencyStep,
    nextPayDate: dateStep,
    amount: amountStep,
  };
  const steps = stepKeys({ canPickMember: canPick, payType: values.payType }).map((k) => byKey[k]);

  const amountNum = parseAmount(values.amount);

  const summary = ({ edit }: { edit: (key: string) => void }) => (
    <div className="flex flex-col">
      {canPick ? (
        <Row tall chevron label="Whose pay" value={memberName} onClick={() => edit("member")} />
      ) : (
        <Row tall label="Whose pay" value={memberName} />
      )}
      <Row
        tall
        chevron
        label="Pay type"
        value={optionLabel(PAY_TYPE_OPTIONS, values.payType)}
        onClick={() => edit("payType")}
      />
      <Row
        tall
        chevron
        label="How often"
        value={optionLabel(PAY_FREQUENCY_OPTIONS, values.frequency)}
        onClick={() => edit("frequency")}
      />
      <Row
        tall
        chevron
        label="Next payday"
        value={dateLabel(values.nextPayDate)}
        onClick={() => edit("nextPayDate")}
      />
      {isFixed && (
        <Row
          tall
          chevron
          label="Amount"
          value={amountNum === null ? "—" : amountLabel(amountNum)}
          onClick={() => edit("amount")}
        />
      )}
    </div>
  );

  const announce = (id: string) => {
    // The schedule is already saved: a problem here must not fail the save (a retry would add it twice).
    try {
      onAdded?.(id);
    } catch (err) {
      console.error("onAdded failed:", err);
    }
  };

  const onSubmit = async () => {
    const id = await addPaySchedule(buildPaySchedulePayload(values, memberId));
    announce(id);
  };

  return (
    <StepFlow
      open={open}
      onClose={onClose}
      title="New pay schedule"
      noun="pay schedule"
      steps={steps}
      summary={summary}
      submitLabel="Add pay schedule"
      successToast="Pay schedule added"
      canSubmit={memberId !== ""}
      dirty={hasChanges(
        values as unknown as Record<string, unknown>,
        initialValues() as unknown as Record<string, unknown>
      )}
      onSubmit={onSubmit}
    />
  );
}
