"use client";

import { useState } from "react";
import Dialog from "@/components/ui/Dialog";
import { nextDueDatePatch } from "@/lib/billCycle";

interface NextDueDateDialogProps {
  open: boolean;
  billName: string;
  /** Today in the household timezone ('YYYY-MM-DD'); the earliest pickable date. */
  todayYmd: string;
  /** True while a choice is being saved: all three buttons are disabled. */
  busy: boolean;
  /** X / backdrop / Escape: writes nothing, back to the bill. */
  onCancel: () => void;
  onSave: (nextDueYmd: string) => void;
  onSkip: () => void;
  onMute: () => void;
}

/**
 * #250: asked on Mark as Paid for a manual recurring bill with no due date.
 * "Save date" pays this cycle and makes the bill due on the picked date;
 * "Skip for now" just marks it Paid; "Don't ask again for this bill" marks it
 * Paid and never asks again. Closing writes nothing.
 */
export default function NextDueDateDialog({
  open,
  billName,
  todayYmd,
  busy,
  onCancel,
  onSave,
  onSkip,
  onMute,
}: NextDueDateDialogProps) {
  const [picked, setPicked] = useState("");
  const isValid = nextDueDatePatch(picked, todayYmd) !== null;

  const secondaryClass =
    "w-full min-h-[44px] rounded-[2px] px-4 py-2.5 bg-surface-elevated text-foreground border border-border font-heading font-bold uppercase tracking-wider text-[10px] hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:pointer-events-none";

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onCancel();
      }}
      title="When is it next due?"
      footer={
        <div className="w-full flex flex-col space-y-3">
          <button
            type="button"
            onClick={() => onSave(picked)}
            disabled={!isValid || busy}
            className="w-full min-h-[44px] rounded-[2px] py-3.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-heading font-bold uppercase tracking-wider text-xs hover:bg-emerald-500 hover:text-foreground transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            Save date
          </button>
          <button type="button" onClick={onSkip} disabled={busy} className={secondaryClass}>
            Skip for now
          </button>
          <button type="button" onClick={onMute} disabled={busy} className={secondaryClass}>
            Don&apos;t ask again for this bill
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted font-mono break-words">{billName}</p>
        <p className="text-sm text-foreground">
          This bill has no due date. Pick when it&apos;s next due and Funded will track it from there.
        </p>
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="next-due-date"
            className="font-heading text-sm font-semibold text-subtle uppercase tracking-wider"
          >
            Next due date
          </label>
          <input
            id="next-due-date"
            type="date"
            min={todayYmd}
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            disabled={busy}
            className="w-full min-w-0 min-h-[44px] rounded-[2px] border border-border bg-surface-raised px-4 py-2.5 font-mono text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          {picked && !isValid && (
            <p className="text-xs text-muted font-mono">Pick today or a later date.</p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
