"use client";

import React from "react";
import ChoiceField from "@/components/ui/ChoiceField";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import SingleCard from "@/components/ui/SingleCard";
import Textarea from "@/components/ui/Textarea";
import {
  FREQUENCY_OPTIONS,
  PAYMENT_OPTIONS,
  billSplitTouched,
  categoryOptions,
  type BillField,
  type EditValues,
  type ExpenseField,
  type SplitContext,
} from "@/lib/addFlow";
import AddFlowSplitCard from "./AddFlowSplitCard";

const TITLES: Record<BillField, string> = {
  name: "Name",
  amount: "Amount",
  frequency: "How often",
  dueDate: "Due date",
  invoiceDate: "Invoice date",
  category: "Category",
  assignee: "Assigned to",
  split: "Split",
  autoPay: "Auto-Pay",
  notes: "Notes",
};

/** Fields whose card has a text box the tap should focus (so the iOS keyboard opens at once). */
export function fieldTakesKeyboard(field: BillField | ExpenseField): boolean {
  return field === "name" || field === "amount" || field === "notes";
}

interface ItemFieldCardProps {
  /** Null = closed. */
  field: (BillField | ExpenseField) | null;
  kind: "bill" | "expense";
  onClose: () => void;
  values: EditValues;
  onChange: (patch: Partial<EditValues>) => void;
  ctx: SplitContext;
  members: { id: string; name: string }[];
  /** Id of the card's text box, so the opener can focus it inside the same tap. */
  inputId: string;
  /** Why Save is blocked right now, if it is. */
  error: string | null;
  /** Return false or throw to fail. */
  onSubmit: () => Promise<boolean | void>;
  successToast: string;
}

/**
 * One pop-up card for one field of a bill or expense (R10, #397). Each field is
 * a Field in a SingleCard with a Save pill; the sheet owns the draft values and
 * the save. Rules (errors, payloads) live in `lib/addFlow.ts`.
 */
export default function ItemFieldCard({
  field,
  kind,
  onClose,
  values,
  onChange,
  ctx,
  members,
  inputId,
  error,
  onSubmit,
  successToast,
}: ItemFieldCardProps) {
  // Keep the last field while the card is closing so the title never goes blank.
  const shown: BillField | ExpenseField = field ?? "name";
  const isBill = kind === "bill";
  const assigneeId = values.assignee;
  const showError = error !== null && (shown === "amount" ? values.amount.trim() !== "" : true);

  let body: React.ReactNode = null;
  let secondaryAction: { label: string; onClick: () => void } | undefined;

  switch (shown) {
    case "name":
      body = (
        <Field id={inputId} label="What's it called?" question error={showError ? error : undefined}>
          <Input
            id={inputId}
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            enterKeyHint="done"
            autoComplete="off"
          />
        </Field>
      );
      break;
    case "amount":
      body = (
        <Field
          id={inputId}
          label={isBill ? "How much is it?" : "How much a week?"}
          question
          description={isBill ? undefined : "Expenses count as a weekly amount."}
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
              value={values.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
              enterKeyHint="done"
              autoComplete="off"
              className="pl-8"
              aria-invalid={showError || undefined}
            />
          </div>
        </Field>
      );
      break;
    case "frequency":
      body = (
        <ChoiceField
          id={`${inputId}-frequency`}
          question="How often is it paid?"
          options={FREQUENCY_OPTIONS}
          value={values.frequency}
          onChange={(frequency) => onChange({ frequency })}
        />
      );
      break;
    case "dueDate":
      body = (
        <Field
          id={`${inputId}-due`}
          label="When is it next due?"
          question
          description="Leave blank if it has no set date."
        >
          <Input
            id={`${inputId}-due`}
            type="date"
            value={values.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
            aria-describedby={`${inputId}-due-desc`}
          />
        </Field>
      );
      if (values.dueDate) {
        secondaryAction = { label: "Clear date", onClick: () => onChange({ dueDate: "" }) };
      }
      break;
    case "invoiceDate":
      body = (
        <Field
          id={`${inputId}-invoice`}
          label="Invoice date"
          question
          description="Optional. Leave blank if you do not track it."
        >
          <Input
            id={`${inputId}-invoice`}
            type="date"
            value={values.invoiceDate}
            onChange={(e) => onChange({ invoiceDate: e.target.value })}
            aria-describedby={`${inputId}-invoice-desc`}
          />
        </Field>
      );
      if (values.invoiceDate) {
        secondaryAction = { label: "Clear date", onClick: () => onChange({ invoiceDate: "" }) };
      }
      break;
    case "category":
      body = (
        <ChoiceField
          id={`${inputId}-category`}
          question="Which category?"
          options={categoryOptions(values.category)}
          value={values.category}
          onChange={(category) => onChange({ category })}
        />
      );
      break;
    case "assignee":
      body = (
        <div className="flex flex-col gap-3">
          <ChoiceField
            id={`${inputId}-assignee`}
            question="Who looks after it?"
            options={members.map((m) => ({ value: m.id, label: m.name }))}
            value={assigneeId}
            placeholder={assigneeId === "" ? "Pick someone" : undefined}
            // Changing who looks after it starts the shares again.
            onChange={(assignee) => onChange({ assignee, shares: {} })}
          />
          {isBill && billSplitTouched(values, ctx) && (
            <p className="text-xs leading-relaxed text-muted">
              This bill is shared. Changing who looks after it puts the whole bill on them; set
              the shares again from Split.
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive-ink" role="alert">
              {error}
            </p>
          )}
        </div>
      );
      break;
    case "split":
      body = (
        <div className="flex flex-col gap-3">
          <AddFlowSplitCard
            id={`${inputId}-split`}
            values={values}
            onChange={onChange}
            ctx={ctx}
            members={members}
            assigneeId={assigneeId || ctx.fallbackAssigneeId || ""}
          />
          {error && (
            <p className="text-sm text-destructive-ink" role="alert">
              {error}
            </p>
          )}
        </div>
      );
      break;
    case "autoPay":
      body = (
        <ChoiceField
          id={`${inputId}-autopay`}
          question="How is it paid?"
          options={PAYMENT_OPTIONS}
          value={values.paymentType}
          onChange={(p) => onChange({ paymentType: p as EditValues["paymentType"] })}
        />
      );
      break;
    case "notes":
      body = (
        <Field id={inputId} label="Notes" question>
          <Textarea
            id={inputId}
            value={values.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </Field>
      );
      break;
  }

  return (
    <SingleCard
      open={field !== null}
      onClose={onClose}
      title={TITLES[shown as BillField]}
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
