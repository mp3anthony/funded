"use client";

import React, { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useApp, useCurrentUser, type Bill, type BillSplit, type Member } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DetailSheet from "@/components/ui/DetailSheet";
import Row from "@/components/ui/Row";
import NextDueDateDialog from "@/components/NextDueDateDialog";
import ItemFieldCard, { fieldTakesKeyboard } from "@/components/ItemFieldCard";
import { useSheetSave } from "@/hooks/useSheetSave";
import { primaryPillLabel } from "@/lib/sheetSave";
import { todayInZone } from "@/lib/notifications/timezone";
import {
  UNPAID_STATUS,
  canUndoPayment,
  dueDateHint,
  isDateless,
  paidForLabel,
  shouldAskNextDueDate,
} from "@/lib/billCycle";
import {
  FREQUENCY_OPTIONS,
  amountLabel,
  billFieldError,
  billUpdate,
  dueDateLabel,
  optionLabel,
  splitBreakdownLabel,
  valuesFromBill,
  type BillField,
  type EditValues,
  type SplitContext,
} from "@/lib/addFlow";

interface BillDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** The live bill (parents look it up by id so it follows every save). */
  bill: Bill | null;
  splits: BillSplit[];
  householdMembers: Member[];
  /** Open straight on one field's card ("Add due date" passes "dueDate"). */
  startField?: BillField;
}

/** A row value that keeps long text on one line. */
function Val({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={
        accent
          ? "block max-w-[55vw] truncate text-[13px] font-semibold text-accent-ink"
          : "block max-w-[55vw] truncate text-[13px] text-muted"
      }
    >
      {children}
    </span>
  );
}

/**
 * Bill detail sheet (R10, #397): a status line, the actions on top, one tappable
 * row per field (each opens a one-field card) and a red Delete at the bottom.
 * The old Edit button and edit form are gone. Rules live in `lib/addFlow.ts`.
 */
export default function BillDetailSheet({
  isOpen,
  onClose,
  bill,
  splits,
  householdMembers,
  startField,
}: BillDetailSheetProps) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const {
    isJointFund,
    markAsPaid,
    markDatelessBillPaid,
    markAsUnpaid,
    undoPayment,
    togglePauseBill,
    updateBill,
    deleteBill,
    householdTimezone,
  } = useApp();
  const currentUser = useCurrentUser();
  const currentId = currentUser.id ? String(currentUser.id) : "";

  // #250: the "When is it next due?" question, shown instead of the sheet. Above the early return (hook order).
  const [askingNextDue, setAskingNextDue] = useState(false);
  const [nextDueBusy, setNextDueBusy] = useState(false);
  // Blocks a fast double tap before the busy state has re-rendered the buttons disabled.
  const nextDueInFlightRef = useRef(false);

  const [undoOpen, setUndoOpen] = useState(false);
  // Captured when the dialog opens: a successful undo clears last_paid_for before the dialog closes.
  const [undoText, setUndoText] = useState<{ month: string; message?: string }>({ month: "" });
  // The field card: which field, and the draft of every field (seeded from the live bill when it opens).
  const [editing, setEditing] = useState<BillField | null>(null);
  const [draft, setDraft] = useState<EditValues | null>(null);

  // Mark as Paid / Unpaid closes the sheet on success; Pause keeps it open (the toast says what happened).
  const payHook = useSheetSave({ onSuccess: onClose });
  const pauseHook = useSheetSave({ onSuccess: () => {} });

  const memberList = householdMembers.map((m) => ({ id: String(m.id), name: m.name }));
  const ctx: SplitContext = {
    memberIds: memberList.map((m) => m.id),
    isJointFund,
    fallbackAssigneeId: currentId,
  };

  // Fresh state every time the sheet opens, and cleared when it closes (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    payHook.reset();
    pauseHook.reset();
    setUndoOpen(false);
    setAskingNextDue(false);
    setNextDueBusy(false);
    if (isOpen && bill && startField) {
      setDraft(valuesFromBill(bill, splits, ctx));
      setEditing(startField);
    } else {
      setEditing(null);
      setDraft(null);
    }
  }

  if (!isOpen || !bill) return null;

  const isAutoPay = bill.payment_type?.toLowerCase() === "auto";
  const seed = valuesFromBill(bill, splits, ctx);
  const assigneeName = memberList.find((m) => m.id === seed.assignee)?.name;

  // #211: month last paid for (from the due date while Paid, else the record).
  const todayYmd = todayInZone(householdTimezone || "Australia/Sydney");
  const paidForYmd = bill.status === "Paid" ? bill.due_date : bill.last_paid_for;
  // Autopay bills show no line: their mapped due date can be a future cycle and they never get last_paid_for.
  const paidLabel = isAutoPay ? null : paidForLabel(paidForYmd, todayYmd);
  const showUndoPayment =
    !isAutoPay &&
    canUndoPayment({
      status: bill.status,
      is_recurring: bill.is_recurring,
      is_paused: bill.is_paused,
      due_date: bill.due_date,
      frequency: bill.frequency,
      payment_type: bill.payment_type,
      last_paid_for: bill.last_paid_for,
      invoice_date: bill.invoice_date,
    });

  // #250: what the Due date row shows for a bill with no due date (a dueLabel still wins).
  const dateless = !bill.dueLabel && isDateless(bill);
  const hint = dateless ? dueDateHint(bill, new Date().getTime()) : "none";

  const statusLine = [
    bill.is_paused ? "Paused" : isAutoPay ? "Auto-Pay" : bill.status,
    paidLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  const anySaving = payHook.status === "saving" || pauseHook.status === "saving";

  // #250: each answer saves. On success the sheet closes; if the save failed (the
  // toast says why) it goes back to the bill instead. Cancel just goes back to the bill.
  async function answerNextDue(run: () => Promise<boolean>) {
    if (nextDueInFlightRef.current) return;
    nextDueInFlightRef.current = true;
    setNextDueBusy(true);
    let ok = false;
    try {
      ok = await run();
    } finally {
      nextDueInFlightRef.current = false;
      setNextDueBusy(false);
      setAskingNextDue(false);
      if (ok) onClose();
    }
  }

  if (askingNextDue) {
    const datelessBill = bill;
    return (
      <NextDueDateDialog
        open
        billName={bill.name}
        todayYmd={todayYmd}
        busy={nextDueBusy}
        onCancel={() => setAskingNextDue(false)}
        onSave={(ymd) => void answerNextDue(() => markDatelessBillPaid(datelessBill, { nextDue: ymd }))}
        // Skip is the plain Mark as paid: back to the sheet, where its pill shows Saving… or a red line.
        onSkip={() => {
          setAskingNextDue(false);
          void payHook.run(() => markAsPaid(datelessBill));
        }}
        onMute={() => void answerNextDue(() => markDatelessBillPaid(datelessBill, { mute: true }))}
      />
    );
  }

  const openField = (f: BillField) => {
    // Render the card inside this tap, then focus its box, so the iOS keyboard opens with it.
    flushSync(() => {
      setDraft(valuesFromBill(bill, splits, ctx));
      setEditing(f);
    });
    if (fieldTakesKeyboard(f)) document.getElementById(inputId)?.focus();
  };

  const patchDraft = (p: Partial<EditValues>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const saveField = async () => {
    if (!draft || !editing) return false;
    const { data, splits: rebuilt } = billUpdate({
      field: editing,
      values: draft,
      ctx,
      hadSplits: splits.length > 0,
      bill: { status: bill.status, hadDueDate: !isDateless(bill) },
      unpaidStatus: UNPAID_STATUS,
    });
    await updateBill(bill.id, data, rebuilt);
  };

  const undoMessage = (() => {
    if (!bill.last_paid_for) return undefined;
    const backDate = new Date(bill.last_paid_for + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    return bill.last_paid_for < todayYmd
      ? `This bill goes back to being due ${backDate}. That date has passed, so it will show as Overdue and overdue reminders will start again.`
      : "This bill goes back to being due today.";
  })();
  const undoMonth = bill.last_paid_for
    ? new Date(bill.last_paid_for + "T00:00:00").toLocaleDateString("en-US", { month: "long" })
    : "";

  const paidPill =
    bill.status === "Paid" ? (
      <Button
        variant="ghost"
        fullWidth
        disabled={anySaving}
        onClick={() => {
          pauseHook.reset();
          void payHook.run(() => markAsUnpaid(bill));
        }}
      >
        {primaryPillLabel(payHook.status, "Mark as Unpaid")}
      </Button>
    ) : (
      <Button
        fullWidth
        disabled={anySaving}
        onClick={() => {
          pauseHook.reset();
          if (shouldAskNextDueDate(bill)) {
            setAskingNextDue(true);
            return;
          }
          void payHook.run(() => markAsPaid(bill));
        }}
      >
        {primaryPillLabel(payHook.status, "Mark as Paid")}
      </Button>
    );

  const hasSecondary = showUndoPayment || bill.is_recurring;
  const actions =
    isAutoPay && !hasSecondary ? undefined : (
      <>
        {/* #187: autopay bills pay themselves — no paid/unpaid action. */}
        {!isAutoPay && paidPill}
        {hasSecondary && (
          <div className="flex flex-wrap justify-center gap-2">
            {showUndoPayment && (
              <Button variant="ghost" disabled={anySaving} onClick={() => {
                setUndoText({ month: undoMonth, message: undoMessage });
                setUndoOpen(true);
              }}>
                Undo payment
              </Button>
            )}
            {bill.is_recurring && (
              <Button
                variant="ghost"
                disabled={anySaving}
                onClick={() => {
                  payHook.reset();
                  void pauseHook.run(() => togglePauseBill(bill.id, !bill.is_paused));
                }}
              >
                {primaryPillLabel(pauseHook.status, bill.is_paused ? "Resume" : "Pause")}
              </Button>
            )}
          </div>
        )}
      </>
    );

  const noteLine = (bill.notes ?? "").split("\n")[0].trim();

  return (
    <>
      <DetailSheet
        open={isOpen}
        onClose={onClose}
        title={bill.name}
        actions={actions}
        actionError={payHook.error ?? pauseHook.error}
        busy={anySaving || editing !== null || undoOpen}
        onDelete={() => deleteBill(bill.id)}
        deleteConfirm={{
          title: "Delete this bill?",
          message: `"${bill.name}" and its splits will be removed.`,
          confirmLabel: "Delete",
        }}
        deletedToast="Bill deleted"
      >
        {statusLine && <p className="mb-1 text-sm text-muted">{statusLine}</p>}
        <div className="flex flex-col">
          <Row divider tall chevron label="Name" onClick={() => openField("name")}>
            <Val>{bill.name}</Val>
          </Row>
          <Row divider tall chevron label="Amount" value={amountLabel(Number(bill.amount))} onClick={() => openField("amount")} />
          <Row
            divider
            tall
            chevron
            label="How often"
            value={optionLabel(FREQUENCY_OPTIONS, seed.frequency)}
            onClick={() => openField("frequency")}
          />
          <Row divider tall chevron label="Due date" onClick={() => openField("dueDate")}>
            {hint === "add-due-date" ? (
              <Val accent>Add due date</Val>
            ) : dateless ? (
              <Val>{hint === "paid-no-due-date" ? "Paid · no due date" : "No due date"}</Val>
            ) : (
              <Val>{bill.dueLabel ?? bill.dueDate}</Val>
            )}
          </Row>
          <Row
            divider
            tall
            chevron
            label="Invoice date"
            value={bill.invoice_date ? dueDateLabel(bill.invoice_date.slice(0, 10)) : "None"}
            onClick={() => openField("invoiceDate")}
          />
          <Row divider tall chevron label="Category" value={bill.category || "Other"} onClick={() => openField("category")} />
          <Row
            divider
            tall
            chevron
            label="Assigned to"
            value={assigneeName ?? "Unassigned"}
            onClick={() => openField("assignee")}
          />
          <Row divider tall chevron label="Split" onClick={() => openField("split")}>
            <Val>
              {splitBreakdownLabel(
                splits.map((s) => ({ member_id: String(s.member_id), amount: Number(s.amount) })),
                memberList,
                { isJointFund, assigneeName }
              )}
            </Val>
          </Row>
          <Row
            divider
            tall
            chevron
            label="Auto-Pay"
            value={isAutoPay ? "Auto-Pay" : "Manual"}
            onClick={() => openField("autoPay")}
          />
          <Row divider tall chevron label="Notes" onClick={() => openField("notes")}>
            <Val>{noteLine || "None"}</Val>
          </Row>
        </div>
      </DetailSheet>

      {draft && (
        <ItemFieldCard
          field={editing}
          kind="bill"
          onClose={() => setEditing(null)}
          values={draft}
          onChange={patchDraft}
          ctx={ctx}
          members={memberList}
          inputId={inputId}
          error={editing ? billFieldError(editing, draft, ctx) : null}
          onSubmit={saveField}
          successToast="Bill updated"
        />
      )}

      <ConfirmDialog
        open={undoOpen}
        title={`Undo the ${undoText.month} payment?`}
        message={undoText.message}
        confirmLabel="Undo payment"
        onConfirm={() => undoPayment(bill)}
        onCancel={() => setUndoOpen(false)}
        onDone={() => {
          setUndoOpen(false);
          onClose();
        }}
      />
    </>
  );
}
