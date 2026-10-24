"use client";

import React, { useId, useState } from "react";
import { useApp, useCurrentUser } from "@/context/AppContext";
import ChoiceField from "@/components/ui/ChoiceField";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import NotesToggle from "@/components/ui/NotesToggle";
import Row from "@/components/ui/Row";
import SectionHeader from "@/components/ui/SectionHeader";
import StepFlow, { type FlowStep } from "@/components/ui/StepFlow";
import { hasChanges } from "@/lib/stepFlow";
import {
  FREQUENCY_OPTIONS,
  ITEM_CATEGORIES,
  PAYMENT_OPTIONS,
  TYPE_OPTIONS,
  amountSummary,
  applyTypeChange,
  buildBillPayload,
  buildBillSplits,
  buildExpensePayload,
  dirtyValues,
  dueDateLabel,
  effectiveAssignee,
  flowTitle,
  initialValues,
  optionLabel,
  parseAmount,
  splitSummary,
  splitValid,
  stepKeys,
  submitLabel,
  successToast,
  type AddFlowValues,
  type AddedItem,
  type ItemType,
  type SplitContext,
} from "@/lib/addFlow";
import AddFlowSplitCard from "./AddFlowSplitCard";

const CATEGORY_OPTIONS = ITEM_CATEGORIES.map((c) => ({ value: c, label: c }));

interface AddFlowProps {
  open: boolean;
  onClose: () => void;
  /** Called once the new row is saved (the page expands its category and highlights it). */
  onAdded?: (item: AddedItem) => void;
  /** Answers already known (R16 "Turn into a bill"). The type is decided, so that card is skipped. */
  prefill?: Partial<AddFlowValues>;
}

/**
 * The one way to add a bill or an expense (R07, #394): a StepFlow with the
 * essential cards (Type, Name, Amount, and for bills How often and Due date),
 * then a summary whose "Optional details" rows (Category, Assigned to, Split,
 * Auto-Pay) open extra cards. All entries live here, so Back and detours keep
 * them and a failed save ("Try again") loses nothing. Rules live in
 * `lib/addFlow.ts`.
 */
export default function AddFlow({ open, onClose, onAdded, prefill }: AddFlowProps) {
  const uid = useId();
  // One members list for assignee options, split rows and what gets saved
  // (`members` and `householdMembers` are the same list in AppContext).
  const { members, isJointFund, addBill, addExpense } = useApp();
  const currentUser = useCurrentUser();
  const currentId = currentUser.id ? String(currentUser.id) : "";

  const [values, setValues] = useState<AddFlowValues>(() =>
    initialValues({ currentMemberId: currentId, isJointFund, prefill })
  );
  // Fresh values each time the flow opens (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setValues(initialValues({ currentMemberId: currentId, isJointFund, prefill }));
  }

  const patch = (p: Partial<AddFlowValues>) => setValues((v) => ({ ...v, ...p }));

  const memberList = members.map((m) => ({ id: String(m.id), name: m.name }));
  const ctx: SplitContext = {
    memberIds: memberList.map((m) => m.id),
    isJointFund,
    fallbackAssigneeId: currentId,
  };
  const assigneeId = effectiveAssignee(values, currentId);
  const assigneeName = memberList.find((m) => m.id === assigneeId)?.name ?? "";
  const isBill = values.type === "bill";
  const splitOk = splitValid(values, ctx);
  const split = splitSummary(values, ctx, assigneeName);
  const amountOk = parseAmount(values.amount) !== null;
  const showAmountError = values.amount.trim() !== "" && !amountOk;

  const typeStep: FlowStep = {
    key: "type",
    autoFocus: false,
    content: (
      <ChoiceField
        id={`${uid}-type`}
        question="What are you adding?"
        options={TYPE_OPTIONS}
        value={values.type}
        onChange={(t) => setValues((v) => applyTypeChange(v, t as ItemType))}
      />
    ),
  };

  const nameStep: FlowStep = {
    key: "name",
    valid: values.name.trim() !== "",
    content: (
      <Field id={`${uid}-name`} label="What's it called?" question>
        <Input
          id={`${uid}-name`}
          value={values.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder={isBill ? "e.g. Internet" : "e.g. Groceries"}
          enterKeyHint="next"
          autoComplete="off"
        />
      </Field>
    ),
  };

  const amountId = `${uid}-amount`;
  const amountDescribedBy =
    [!isBill && `${amountId}-desc`, showAmountError && `${amountId}-err`]
      .filter(Boolean)
      .join(" ") || undefined;
  const amountStep: FlowStep = {
    key: "amount",
    valid: amountOk,
    content: (
      <Field
        id={amountId}
        label={isBill ? "How much is it?" : "How much a week?"}
        question
        description={isBill ? undefined : "Expenses count as a weekly amount."}
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
            aria-describedby={amountDescribedBy}
          />
        </div>
      </Field>
    ),
  };

  const frequencyStep: FlowStep = {
    key: "frequency",
    autoFocus: false,
    content: (
      <ChoiceField
        id={`${uid}-frequency`}
        question="How often is it paid?"
        options={FREQUENCY_OPTIONS}
        value={values.frequency}
        onChange={(frequency) => patch({ frequency })}
      />
    ),
  };

  const dueDateStep: FlowStep = {
    key: "dueDate",
    optional: true,
    onSkip: () => patch({ dueDate: "" }),
    autoFocus: false,
    content: (
      <Field
        id={`${uid}-due`}
        label="When is it next due?"
        question
        description="Leave blank if it has no set date."
      >
        <Input
          id={`${uid}-due`}
          type="date"
          value={values.dueDate}
          onChange={(e) => patch({ dueDate: e.target.value })}
          aria-describedby={`${uid}-due-desc`}
        />
      </Field>
    ),
  };

  const byKey: Record<string, FlowStep> = {
    type: typeStep,
    name: nameStep,
    amount: amountStep,
    frequency: frequencyStep,
    dueDate: dueDateStep,
  };
  const typeKnown = prefill?.type !== undefined;
  const steps = stepKeys(values.type, typeKnown).map((k) => byKey[k]);

  const extras: FlowStep[] = [
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
    {
      key: "assignee",
      autoFocus: false,
      content: (
        <ChoiceField
          id={`${uid}-assignee`}
          question="Who looks after it?"
          options={memberList.map((m) => ({ value: m.id, label: m.name }))}
          value={assigneeId}
          placeholder={memberList.length === 0 ? "No members yet" : undefined}
          // Changing who looks after it starts the shares again.
          onChange={(assignee) => patch({ assignee, shares: {} })}
        />
      ),
    },
    {
      key: "split",
      autoFocus: false,
      valid: splitOk,
      content: (
        <AddFlowSplitCard
          id={`${uid}-split`}
          values={values}
          onChange={patch}
          ctx={ctx}
          members={memberList}
          assigneeId={assigneeId}
        />
      ),
    },
    ...(isBill
      ? [
          {
            key: "autoPay",
            autoFocus: false,
            content: (
              <ChoiceField
                id={`${uid}-autopay`}
                question="How is it paid?"
                options={PAYMENT_OPTIONS}
                value={values.paymentType}
                onChange={(p) => patch({ paymentType: p as AddFlowValues["paymentType"] })}
              />
            ),
          },
        ]
      : []),
  ];

  const percentExpense = !isBill && values.expenseSplit === "percentage";
  const assignedTo = percentExpense
    ? "Split by percentage"
    : assigneeName
      ? assigneeId === currentId
        ? "You"
        : assigneeName
      : "—";

  const summary = ({ edit }: { edit: (key: string) => void }) => (
    <>
      <div className="flex flex-col">
        {!typeKnown && (
          <Row
            tall
            chevron
            label="Type"
            value={optionLabel(TYPE_OPTIONS, values.type)}
            onClick={() => edit("type")}
          />
        )}
        <Row tall chevron label="Name" value={values.name.trim() || "—"} onClick={() => edit("name")} />
        <Row
          tall
          chevron
          label="Amount"
          value={amountSummary(values.type, values.amount)}
          onClick={() => edit("amount")}
        />
        {isBill && (
          <>
            <Row
              tall
              chevron
              label="How often"
              value={optionLabel(FREQUENCY_OPTIONS, values.frequency)}
              onClick={() => edit("frequency")}
            />
            <Row
              tall
              chevron
              label="Due date"
              value={dueDateLabel(values.dueDate)}
              onClick={() => edit("dueDate")}
            />
          </>
        )}
      </div>
      <div className="flex flex-col">
        <SectionHeader title="Optional details" size="sm" className="mb-1 mt-2" />
        <Row tall chevron label="Category" value={values.category} onClick={() => edit("category")} />
        <Row
          tall
          chevron
          label="Assigned to"
          value={assignedTo}
          onClick={() => edit(percentExpense ? "split" : "assignee")}
        />
        <Row tall chevron label="Split" onClick={() => edit("split")}>
          <span className={split.invalid ? "text-[13px] text-destructive" : "text-[13px] text-muted"}>
            {split.label}
          </span>
        </Row>
        {isBill && (
          <Row
            tall
            chevron
            label="Auto-Pay"
            value={values.paymentType === "Auto" ? "Auto-Pay" : "Manual"}
            onClick={() => edit("autoPay")}
          />
        )}
      </div>
      <NotesToggle
        id={`${uid}-notes`}
        value={values.notes}
        onChange={(notes) => patch({ notes })}
      />
    </>
  );

  const announce = (item: AddedItem) => {
    // The row is already saved: a problem here must not fail the save (a retry would add it twice).
    try {
      onAdded?.(item);
    } catch (err) {
      console.error("onAdded failed:", err);
    }
  };

  const onSubmit = async () => {
    if (isBill) {
      const id = await addBill(buildBillPayload(values, currentId), buildBillSplits(values, ctx));
      announce({ kind: "bill", id, category: values.category });
    } else {
      const id = await addExpense(buildExpensePayload(values, ctx));
      announce({ kind: "expense", id, category: values.category });
    }
  };

  return (
    <StepFlow
      open={open}
      onClose={onClose}
      title={flowTitle(values.type)}
      noun={values.type}
      steps={steps}
      extras={extras}
      summary={summary}
      submitLabel={submitLabel(values.type)}
      successToast={successToast(values.type)}
      canSubmit={splitOk}
      dirty={hasChanges(
        dirtyValues(values, currentId) as unknown as Record<string, unknown>,
        initialValues({ currentMemberId: currentId, isJointFund, prefill }) as unknown as Record<string, unknown>
      )}
      onSubmit={onSubmit}
    />
  );
}
