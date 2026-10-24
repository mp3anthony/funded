"use client";

import React, { useId, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { useApp, type PaySchedule, type PayHistory } from "@/context/AppContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import NotesToggle from "@/components/ui/NotesToggle";
import SingleCard from "@/components/ui/SingleCard";
import { amountLabel, parseAmount } from "@/lib/addPayFlow";
import { amountTitle, askTitle, cardMode, payLine } from "@/lib/needsYou";

/** What the card is about: a due pay to log, or a Pending pay to confirm. */
export type LogTarget =
  | { kind: "log"; schedule: PaySchedule }
  | { kind: "confirm"; history: PayHistory };

interface LogPayCardProps {
  /** Null = closed. */
  target: LogTarget | null;
  onClose: () => void;
  /** Save the pay. Return false or throw to fail (the card shows the red line and Try again). */
  onSave: (amount: number, notes: string | null) => Promise<boolean | void>;
  /** "Didn't get paid". Throw to fail. */
  onSkip: () => Promise<void>;
}

function knownAmountOf(t: LogTarget): number | null {
  if (t.kind === "log") {
    const s = t.schedule;
    return s.is_fixed_amount && Number(s.amount) > 0 ? Number(s.amount) : null;
  }
  return Number(t.history.amount) > 0 ? Number(t.history.amount) : null;
}

/**
 * The one small card for logging or confirming a pay (R20, #407), replacing the
 * old Enter Pay Amount pop-up. A known amount asks "Did $1,850 land?" with one
 * tap to say yes; otherwise (or after "Different amount") it asks for the
 * amount. "Didn't get paid" skips the pay after a second question.
 */
export default function LogPayCard({ target, onClose, onSave, onSkip }: LogPayCardProps) {
  const { householdMembers, paySchedules, contributionRules, funds } = useApp();
  const notesId = useId();
  const amountId = useId();

  // Keep the last target while the card is closing so the title never blanks,
  // and start fresh each time a new one opens (derived-state reset, no effect).
  const [shown, setShown] = useState<LogTarget | null>(target);
  const [mode, setMode] = useState<"ask" | "amount">(target ? cardMode(knownAmountOf(target)) : "ask");
  const [amount, setAmount] = useState(() => {
    const known = target ? knownAmountOf(target) : null;
    return known === null ? "" : String(known);
  });
  const [notes, setNotes] = useState(target?.kind === "confirm" ? (target.history.notes ?? "") : "");
  const [skipOpen, setSkipOpen] = useState(false);
  if (target !== null && target !== shown) {
    const known = knownAmountOf(target);
    setShown(target);
    setMode(cardMode(known));
    setAmount(known === null ? "" : String(known));
    setNotes(target.kind === "confirm" ? (target.history.notes ?? "") : "");
    setSkipOpen(false);
  }

  const current = target ?? shown;
  const memberId = current ? (current.kind === "log" ? current.schedule.member_id : current.history.member_id) : "";
  const memberName = householdMembers.find((m) => String(m.id) === String(memberId))?.name ?? "this person";
  const known = current ? knownAmountOf(current) : null;
  const payDate = current ? (current.kind === "log" ? current.schedule.next_pay_date : current.history.pay_date) : "";
  const frequency = current
    ? current.kind === "log"
      ? current.schedule.frequency
      : (paySchedules.find((s) => String(s.id) === String(current.history.pay_schedule_id ?? ""))?.frequency ?? null)
    : null;

  const parsed = parseAmount(amount);

  // What the rules would do with this pay. Only when logging a new pay by typing the amount.
  const allocationPreview = useMemo(() => {
    if (!current || current.kind !== "log" || mode !== "amount" || parsed === null) return null;
    const triggered = contributionRules.filter(
      (r) =>
        r.is_active &&
        String(r.member_id) === String(current.schedule.member_id) &&
        parsed > Number(r.threshold_amount)
    );
    if (triggered.length === 0) return null;

    const allocations = triggered.map((rule) => {
      let ruleAmount = Number(rule.amount_to_add);
      if (rule.amount_type === "percentage") {
        const surplus = parsed - Number(rule.threshold_amount);
        ruleAmount = surplus > 0 ? surplus * (Number(rule.amount_to_add) / 100) : 0;
      }
      let targetName = "Joint contribution";
      if (rule.action_type === "goal") {
        const goal = funds.find((g) => String(g.id) === String(rule.action_target_id));
        targetName = goal ? goal.name : "Savings goal";
      }
      return {
        id: rule.id,
        targetName,
        amount: ruleAmount,
        isPercentage: rule.amount_type === "percentage",
        percentValue: rule.amount_to_add,
      };
    });
    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
    return { allocations, remaining: parsed - totalAllocated, gross: parsed };
  }, [current, mode, parsed, contributionRules, funds]);

  const askAmount = mode === "ask" ? known : null;
  const askMode = askAmount !== null;
  const title = askAmount !== null ? askTitle(askAmount) : amountTitle(memberName);

  const skipAction = { label: "Didn't get paid", onClick: () => setSkipOpen(true) };

  return (
    <>
      <SingleCard
        open={target !== null}
        onClose={onClose}
        title={title}
        submitLabel={askMode ? "Yes, it landed" : "Save"}
        canSubmit={askMode || parsed !== null}
        onSubmit={() => onSave(askAmount ?? (parsed as number), notes.trim() || null)}
        busy={skipOpen}
        secondaryAction={
          askMode
            ? [{ label: "Different amount", onClick: () => setMode("amount") }, skipAction]
            : skipAction
        }
      >
        {askMode ? (
          <p className="text-sm text-muted">
            {memberName} · {payLine(frequency, payDate)}
          </p>
        ) : (
          <>
            <Field id={amountId} label="How much did they get?" question>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                  $
                </span>
                <Input
                  id={amountId}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  enterKeyHint="done"
                  autoComplete="off"
                  autoFocus
                  className="pl-8"
                />
              </div>
            </Field>
            <NotesToggle key={String(current ? (current.kind === "log" ? current.schedule.id : current.history.id) : "")} id={notesId} value={notes} onChange={setNotes} />
            {allocationPreview && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <Sparkles size={12} className="text-primary-ink" aria-hidden="true" />
                  Your rules would move
                </div>
                <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3.5 text-sm">
                  <div className="flex items-center justify-between text-foreground">
                    <span className="text-muted">Pay</span>
                    <span className="font-bold">{amountLabel(allocationPreview.gross)}</span>
                  </div>
                  {allocationPreview.allocations.map((alloc) => (
                    <div key={alloc.id} className="flex items-center justify-between text-primary-ink">
                      <span className="mr-2 truncate">
                        {alloc.targetName}
                        {alloc.isPercentage && (
                          <span className="ml-1 text-muted">({alloc.percentValue}%)</span>
                        )}
                      </span>
                      <span className="shrink-0 whitespace-nowrap font-bold">
                        −{amountLabel(alloc.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-border pt-2 text-foreground">
                    <span className="text-muted">Take home</span>
                    <span className={`font-bold ${allocationPreview.remaining >= 0 ? "text-primary-ink" : "text-destructive-ink"}`}>
                      {amountLabel(allocationPreview.remaining)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </SingleCard>

      <ConfirmDialog
        open={skipOpen && target !== null}
        title="Skip this pay?"
        message={`${memberName}'s pay on ${payLine(null, payDate)} will be skipped and nothing is logged.`}
        confirmLabel="Skip pay"
        successToast="Pay skipped"
        onConfirm={onSkip}
        onCancel={() => setSkipOpen(false)}
        onDone={() => {
          setSkipOpen(false);
          onClose();
        }}
      />
    </>
  );
}
