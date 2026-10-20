"use client";

import React, { useId, useState } from "react";
import { flushSync } from "react-dom";
import { useApp, useCurrentUser, type Expense, type Member } from "@/context/AppContext";
import DetailSheet from "@/components/ui/DetailSheet";
import Row from "@/components/ui/Row";
import ItemFieldCard, { fieldTakesKeyboard } from "@/components/ItemFieldCard";
import {
  amountLabel,
  expenseFieldError,
  expenseUpdate,
  splitBreakdownLabel,
  valuesFromExpense,
  type EditValues,
  type ExpenseField,
  type SplitContext,
} from "@/lib/addFlow";

interface ExpenseDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** The live expense (parents pass the current row so it follows every save). */
  expense: Expense | null;
  householdMembers: Member[];
}

/** A row value that keeps long text on one line. */
function Val({ children }: { children: React.ReactNode }) {
  return <span className="block max-w-[55vw] truncate text-[13px] text-muted">{children}</span>;
}

/**
 * Expense detail sheet (R10, #397): one tappable row per field (each opens a
 * one-field card) and a red Delete at the bottom. No actions on top: an expense
 * has no due date, paid state or pause. The old Edit button is gone.
 */
export default function ExpenseDetailSheet({
  isOpen,
  onClose,
  expense,
  householdMembers,
}: ExpenseDetailSheetProps) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const { expenseSplits, isJointFund, updateExpense, deleteExpense } = useApp();
  const currentUser = useCurrentUser();
  const currentId = currentUser.id ? String(currentUser.id) : "";

  const [editing, setEditing] = useState<ExpenseField | null>(null);
  const [draft, setDraft] = useState<EditValues | null>(null);

  // Clear the card when the sheet closes (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (!isOpen) {
      setEditing(null);
      setDraft(null);
    }
  }

  if (!isOpen || !expense) return null;

  const memberList = householdMembers.map((m) => ({ id: String(m.id), name: m.name }));
  const ctx: SplitContext = {
    memberIds: memberList.map((m) => m.id),
    isJointFund,
    fallbackAssigneeId: currentId,
  };
  const rows = expenseSplits
    .filter((s) => String(s.expense_id) === String(expense.id))
    .map((s) => ({ member_id: String(s.member_id), percentage: Number(s.percentage) }));
  const seed = valuesFromExpense(expense, rows);
  const isPercentage = seed.expenseSplit === "percentage";
  const assigneeName = memberList.find((m) => m.id === seed.assignee)?.name;

  const openField = (f: ExpenseField) => {
    // Render the card inside this tap, then focus its box, so the iOS keyboard opens with it.
    flushSync(() => {
      setDraft(valuesFromExpense(expense, rows));
      setEditing(f);
    });
    if (fieldTakesKeyboard(f)) document.getElementById(inputId)?.focus();
  };

  const patchDraft = (p: Partial<EditValues>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const saveField = async () => {
    if (!draft || !editing) return false;
    const { data } = expenseUpdate({ field: editing, values: draft, ctx });
    await updateExpense(expense.id, data);
  };

  const noteLine = (expense.notes ?? "").split("\n")[0].trim();

  return (
    <>
      <DetailSheet
        open={isOpen}
        onClose={onClose}
        title={expense.name}
        busy={editing !== null}
        onDelete={() => deleteExpense(expense.id)}
        deleteConfirm={{
          title: "Delete this expense?",
          message: `"${expense.name}" will be removed.`,
          confirmLabel: "Delete",
        }}
        deletedToast="Expense deleted"
      >
        <div className="flex flex-col">
          <Row divider tall chevron label="Name" onClick={() => openField("name")}>
            <Val>{expense.name}</Val>
          </Row>
          <Row
            divider
            tall
            chevron
            label="Amount"
            value={`${amountLabel(Number(expense.amount))} a week`}
            onClick={() => openField("amount")}
          />
          <Row divider tall chevron label="Category" value={expense.category || "Other"} onClick={() => openField("category")} />
          <Row
            divider
            tall
            chevron
            label="Assigned to"
            value={isPercentage ? "Split by percentage" : (assigneeName ?? "Unassigned")}
            onClick={() => openField(isPercentage ? "split" : "assignee")}
          />
          <Row divider tall chevron label="Split" onClick={() => openField("split")}>
            <Val>
              {splitBreakdownLabel(isPercentage ? rows : [], memberList, {
                isJointFund: false,
                assigneeName,
              })}
            </Val>
          </Row>
          <Row divider tall chevron label="Notes" onClick={() => openField("notes")}>
            <Val>{noteLine || "None"}</Val>
          </Row>
        </div>
      </DetailSheet>

      {draft && (
        <ItemFieldCard
          field={editing}
          kind="expense"
          onClose={() => setEditing(null)}
          values={draft}
          onChange={patchDraft}
          ctx={ctx}
          members={memberList}
          inputId={inputId}
          error={editing ? expenseFieldError(editing, draft, ctx) : null}
          onSubmit={saveField}
          successToast="Expense updated"
        />
      )}
    </>
  );
}
