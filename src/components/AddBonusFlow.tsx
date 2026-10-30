"use client";

import React, { useId, useState } from "react";
import { useApp, useCurrentUser } from "@/context/AppContext";
import ChoiceField from "@/components/ui/ChoiceField";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import NotesToggle from "@/components/ui/NotesToggle";
import Row from "@/components/ui/Row";
import StepFlow, { type FlowStep } from "@/components/ui/StepFlow";
import { isAcceptedMember } from "@/lib/householdLeave";
import { hasChanges } from "@/lib/stepFlow";
import { todayInZone } from "@/lib/notifications/timezone";
import {
  amountLabel,
  buildBonusPayload,
  dateLabel,
  effectiveMember,
  initialValues,
  isValidBonusDate,
  parseAmount,
  stepKeys,
  type AddBonusValues,
} from "@/lib/addBonusFlow";

interface AddBonusFlowProps {
  open: boolean;
  onClose: () => void;
  /** Called once the bonus is saved (the page can scroll to it). */
  onAdded?: (id: string, memberId: string) => void;
}

/**
 * Add a bonus payment (F13, #477): a one-off income from Payday "+". A StepFlow
 * with Whose pay (2+ members), Amount and Date, then a summary with optional
 * Notes. Anyone can log a bonus for any accepted member. Saves a confirmed pay
 * with no schedule through `logBonus`, which moves no pay date and runs no
 * rules or surplus suggestion. Rules live in `lib/addBonusFlow.ts`.
 */
export default function AddBonusFlow({ open, onClose, onAdded }: AddBonusFlowProps) {
  const uid = useId();
  const { logBonus, householdMembers, householdTimezone } = useApp();
  const currentUser = useCurrentUser();

  // Household-local day, the same one Log Pay uses.
  const today = todayInZone(householdTimezone || "Australia/Sydney");
  const [values, setValues] = useState<AddBonusValues>(() => initialValues(today));
  // Fresh values (and today's date) each time the flow opens (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValues(initialValues(today));
  }

  const patch = (p: Partial<AddBonusValues>) => setValues((v) => ({ ...v, ...p }));

  // Pending (not yet joined) members are not offered.
  const acceptedMembers = householdMembers.filter(isAcceptedMember);
  const askWhose = acceptedMembers.length >= 2;
  const memberId = effectiveMember(
    values.member,
    String(currentUser.id),
    acceptedMembers.map((m) => String(m.id)),
  );
  const memberName = householdMembers.find((m) => String(m.id) === memberId)?.name ?? "—";

  const amountNum = parseAmount(values.amount);
  const showAmountError = values.amount.trim() !== "" && amountNum === null;
  const dateOk = isValidBonusDate(values.date, today);
  const showDateError = values.date !== "" && !dateOk;

  const amountId = `${uid}-amount`;
  const dateId = `${uid}-date`;

  const byKey: Record<string, FlowStep> = {
    member: {
      key: "member",
      autoFocus: false,
      content: (
        <ChoiceField
          id={`${uid}-member`}
          question="Whose bonus is this?"
          options={acceptedMembers.map((m) => ({ value: String(m.id), label: m.name }))}
          value={memberId}
          onChange={(member) => patch({ member })}
        />
      ),
    },
    amount: {
      key: "amount",
      valid: amountNum !== null,
      content: (
        <Field
          id={amountId}
          label="How much was the bonus?"
          question
          error={showAmountError ? "Enter an amount above $0" : undefined}
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
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
    },
    date: {
      key: "date",
      valid: dateOk,
      autoFocus: false,
      content: (
        <Field
          id={dateId}
          label="When did it land?"
          question
          description="Today or earlier."
          error={showDateError ? "Pick today or an earlier date" : undefined}
        >
          <Input
            id={dateId}
            type="date"
            max={today}
            value={values.date}
            onChange={(e) => patch({ date: e.target.value })}
            aria-invalid={showDateError || undefined}
            aria-describedby={showDateError ? `${dateId}-err` : `${dateId}-desc`}
          />
        </Field>
      ),
    },
  };
  const steps = stepKeys({ canPickMember: askWhose }).map((k) => byKey[k]);

  const summary = ({ edit }: { edit: (key: string) => void }) => (
    <>
      <div className="flex flex-col">
        {askWhose ? (
          <Row tall chevron label="Whose bonus" value={memberName} onClick={() => edit("member")} />
        ) : (
          <Row tall label="Whose bonus" value={memberName} />
        )}
        <Row
          tall
          chevron
          label="Amount"
          value={amountNum === null ? "—" : amountLabel(amountNum)}
          onClick={() => edit("amount")}
        />
        <Row tall chevron label="Date" value={dateLabel(values.date)} onClick={() => edit("date")} />
      </div>
      <NotesToggle id={`${uid}-notes`} value={values.notes} onChange={(notes) => patch({ notes })} />
    </>
  );

  const onSubmit = async () => {
    const id = await logBonus(buildBonusPayload(values, memberId));
    // The bonus is already saved: a problem here must not fail the save (a retry would add it twice).
    try {
      onAdded?.(id, memberId);
    } catch (err) {
      console.error("onAdded failed:", err);
    }
  };

  return (
    <StepFlow
      open={open}
      onClose={onClose}
      title="Add a bonus payment"
      noun="bonus"
      steps={steps}
      summary={summary}
      submitLabel="Save bonus"
      successToast="Bonus added"
      canSubmit={memberId !== ""}
      dirty={hasChanges(
        values as unknown as Record<string, unknown>,
        initialValues(today) as unknown as Record<string, unknown>,
      )}
      onSubmit={onSubmit}
    />
  );
}
