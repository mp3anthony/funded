"use client";

import React, { useRef, useState } from "react";
import { Check, Pause } from "lucide-react";
import { useApp, type Bill, type BillSplit, type Member } from "@/context/AppContext";
import { convertAmount } from "@/lib/utils";
import NextDueDateDialog from "./NextDueDateDialog";
import RowPill from "./RowPill";
import IconCircle from "@/components/ui/IconCircle";
import { isDateless, dueDateHint, shouldAskNextDueDate } from "@/lib/billCycle";
import { dueCountdown, showTick, type CountdownTone } from "@/lib/billRow";
import { todayInZone } from "@/lib/notifications/timezone";

export interface BillCardProps {
  bill: Bill;
  splits?: BillSplit[];
  householdMembers: Member[];
  displayFrequency?: "weekly" | "fortnightly" | "monthly" | "yearly";
  /** Opens the detail sheet, which the Bills page owns (F10, #438). "dueDate" starts on the Due date card. */
  onOpen: (startField?: "dueDate") => void;
}

const TONE_CLASS: Record<CountdownTone, string> = {
  neutral: "text-muted",
  overdue: "text-destructive-ink",
  paid: "text-success-ink",
  muted: "text-muted",
};

/**
 * Bill row (R15, #402): avatar circle, name, Auto-Pay pill, a countdown line
 * ("Due in 3 days", "2 days overdue", "Paid") and the amount. The main button
 * opens the detail sheet and reads once for screen readers (the amount is
 * sr-only text inside it); the visible amount is a decorative second tap
 * target for the same sheet. An unpaid manual bill also has a round tick left
 * of the amount, in a fixed 44px slot that every row keeps so names and
 * amounts line up. The tick marks it paid in one tap (a dateless recurring
 * bill asks "When is it next due?" first, same as the detail sheet).
 * "Add due date" is its own button under the row, never inside the main one.
 * The detail sheet lives on the Bills page (F10, #438), so a row that moves to a
 * closed category or is filtered out after an edit cannot take the open sheet with it.
 */
export default function BillCard({
  bill,
  splits = [],
  householdMembers,
  displayFrequency = "weekly",
  onOpen,
}: BillCardProps) {
  const { markAsPaid, markDatelessBillPaid, householdTimezone } = useApp();
  // R15: the tick's in-flight write, and the in-row "When is it next due?" question.
  const [saving, setSaving] = useState(false);
  const [askingNextDue, setAskingNextDue] = useState(false);
  // Blocks a fast double tap before the disabled state has re-rendered.
  const inFlightRef = useRef(false);

  // Determine assignee
  const assigneeSplit = splits.find((s) => s.is_assignee);
  const assigneeId = bill.assignee_id || (assigneeSplit?.member_id);
  const assignee = householdMembers.find((m) => String(m.id) === String(assigneeId));

  // #267: paused bills look paused (orange pause icon, greyed amount, "Paused" in the countdown slot).
  const isPaused = bill.is_paused === true;

  // #250: a bill with no due date (and no label) skips all date maths.
  const dateless = !bill.dueLabel && isDateless(bill);
  const hint = dateless ? dueDateHint(bill, new Date().getTime()) : "none";
  const todayYmd = todayInZone(householdTimezone || "Australia/Sydney");
  const countdown = dueCountdown(bill, todayYmd, hint);

  const isAutoPay = bill.payment_type?.toLowerCase() === "auto";

  // Convert amount based on selected frequency
  const convertedAmount = convertAmount(bill.amount, bill.frequency || "monthly", displayFrequency);

  // Format currency beautifully
  const formattedAmount = convertedAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Runs one write with the double-tap guard; the row's tick is disabled meanwhile.
  async function run(write: () => Promise<boolean>): Promise<boolean> {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setSaving(true);
    try {
      return await write();
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  }

  const handleTick = () => {
    if (inFlightRef.current) return;
    if (shouldAskNextDueDate(bill)) {
      setAskingNextDue(true);
      return;
    }
    void run(() => markAsPaid(bill));
  };

  const answerNextDue = async (write: () => Promise<boolean>) => {
    // Close only on success; on failure keep the dialog (and the picked date) open.
    if (await run(write)) setAskingNextDue(false);
  };

  const showAddDueDate = hint === "add-due-date";
  const tick = showTick(bill);

  return (
    <>
      <div className="border-t border-border">
        <div className="flex items-center gap-1">
          {/* One button, one reading: avatar is decorative, the rest is its text. */}
          <button
            type="button"
            onClick={() => onOpen()}
            className="press-tint flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
          >
            {assignee && (
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary bg-surface-elevated text-[11px] font-bold text-foreground"
              >
                {assignee.avatar_url ? (
                  <img src={assignee.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  assignee.avatar || assignee.name.charAt(0).toUpperCase()
                )}
              </span>
            )}

            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-body text-[15px] font-semibold text-foreground">{bill.name}</span>
              <span className="mt-0.5 flex items-center gap-1.5">
                {isAutoPay && <RowPill label="Auto-Pay" variant="primary" />}
                <span className={`text-[11px] font-medium ${TONE_CLASS[countdown.tone]}`}>{countdown.text}</span>
              </span>
            </span>

            {/* Read once: the visible amount below is a decorative tap target. */}
            <span className="sr-only">${formattedAmount}</span>
          </button>

          {/* Fixed slot on every row so names and amounts line up; empty without a tick. */}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center">
            {tick && (
              <IconCircle label={`Mark ${bill.name} as paid`} disabled={saving} onClick={handleTick}>
                <Check size={18} aria-hidden="true" />
              </IconCircle>
            )}
          </span>

          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => onOpen()}
            className={`press-tint inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-end gap-1 rounded-sm pl-1 text-lg font-semibold tracking-tight tabular-nums whitespace-nowrap ${
              isPaused ? "text-muted" : "text-foreground"
            }`}
          >
            {isPaused && <Pause size={14} className="shrink-0 text-accent-ink" aria-hidden="true" />}
            ${formattedAmount}
          </button>
        </div>

        {showAddDueDate && (
          <button
            type="button"
            onClick={() => onOpen("dueDate")}
            aria-label={`Add due date for ${bill.name}`}
            className={`-mt-1 mb-1 min-h-11 text-left text-[11px] font-bold text-accent-ink cursor-pointer ${
              assignee ? "pl-11" : ""
            }`}
          >
            Add due date
          </button>
        )}
      </div>

      <NextDueDateDialog
        open={askingNextDue}
        billName={bill.name}
        todayYmd={todayYmd}
        busy={saving}
        onCancel={() => setAskingNextDue(false)}
        onSave={(ymd) => void answerNextDue(() => markDatelessBillPaid(bill, { nextDue: ymd }))}
        // Skip is the plain Mark as paid.
        onSkip={() => void answerNextDue(() => markAsPaid(bill))}
        onMute={() => void answerNextDue(() => markDatelessBillPaid(bill, { mute: true }))}
      />
    </>
  );
}
