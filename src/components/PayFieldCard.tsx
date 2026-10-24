"use client";

import React from "react";
import ChoiceField from "@/components/ui/ChoiceField";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import SingleCard from "@/components/ui/SingleCard";
import {
  PAY_FREQUENCY_OPTIONS,
  PAY_TYPE_OPTIONS,
  type AddPayValues,
  type PayField,
  type PayFrequency,
  type PayType,
} from "@/lib/addPayFlow";

const TITLES: Record<PayField, string> = {
  member: "Whose pay",
  payType: "Pay type",
  frequency: "How often",
  nextPayDate: "Next payday",
  amount: "Amount",
};

/** Fields whose card has a text box the tap should focus (so the iOS keyboard opens at once). */
export function payFieldTakesKeyboard(field: PayField): boolean {
  return field === "amount";
}

interface PayFieldCardProps {
  /** Null = closed. */
  field: PayField | null;
  onClose: () => void;
  values: AddPayValues;
  onChange: (patch: Partial<AddPayValues>) => void;
  /** The "Whose pay" choices. */
  memberChoices: { value: string; label: string }[];
  /** Id of the card's text box, so the opener can focus it inside the same tap. */
  inputId: string;
  /** Why Save is blocked right now, if it is. */
  error: string | null;
  /** Return false or throw to fail. */
  onSubmit: () => Promise<boolean | void>;
  successToast: string;
}

/**
 * One pop-up card for one field of a pay schedule (R11, #398). Each field is a
 * Field in a SingleCard with a Save pill; the sheet owns the draft values and
 * the save. Rules (errors, payloads) live in `lib/addPayFlow.ts`.
 */
export default function PayFieldCard({
  field,
  onClose,
  values,
  onChange,
  memberChoices,
  inputId,
  error,
  onSubmit,
  successToast,
}: PayFieldCardProps) {
  // Keep the last field while the card is closing so the title never goes blank.
  const shown: PayField = field ?? "amount";
  const showAmountError = error !== null && values.amount.trim() !== "";

  const amountField = (label: string) => (
    <Field id={inputId} label={label} question error={showAmountError ? error : undefined}>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          $
        </span>
        <Input
          id={inputId}
          inputMode="decimal"
          placeholder="0.00"
          value={values.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          enterKeyHint="done"
          autoComplete="off"
          className="pl-8"
          aria-invalid={showAmountError || undefined}
        />
      </div>
    </Field>
  );

  let body: React.ReactNode = null;

  switch (shown) {
    case "member":
      body = (
        <ChoiceField
          id={`${inputId}-member`}
          question="Whose pay is this?"
          options={memberChoices}
          value={values.member}
          onChange={(member) => onChange({ member })}
        />
      );
      break;
    case "payType":
      body = (
        <div className="flex flex-col gap-4">
          <ChoiceField
            id={`${inputId}-payType`}
            question="Is the pay the same each time?"
            options={PAY_TYPE_OPTIONS}
            value={values.payType}
            onChange={(payType) => onChange({ payType: payType as PayType })}
          />
          {values.payType === "fixed" && amountField("How much is each pay?")}
        </div>
      );
      break;
    case "frequency":
      body = (
        <ChoiceField
          id={`${inputId}-frequency`}
          question="How often is it paid?"
          options={PAY_FREQUENCY_OPTIONS}
          value={values.frequency}
          onChange={(frequency) => onChange({ frequency: frequency as PayFrequency })}
        />
      );
      break;
    case "nextPayDate":
      body = (
        <Field
          id={`${inputId}-date`}
          label="When is the next payday?"
          question
          description="A date in the past is fine. The next ones follow from it."
          error={error ?? undefined}
        >
          <Input
            id={`${inputId}-date`}
            type="date"
            value={values.nextPayDate}
            onChange={(e) => onChange({ nextPayDate: e.target.value })}
            aria-describedby={`${inputId}-date-desc`}
          />
        </Field>
      );
      break;
    case "amount":
      body = amountField("How much is each pay?");
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
