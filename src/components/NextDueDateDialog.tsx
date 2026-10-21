"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
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
 *
 * R12 (#399): bottom card with pill buttons. The callbacks are fire-and-forget
 * (the parent runs the write and owns `busy`), so this stays a plain Dialog
 * rather than a SingleCard.
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
  const showInvalid = picked !== "" && !isValid;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="When is it next due?"
      placement="bottom"
      busy={busy}
      footer={
        <div className="flex w-full flex-col gap-2">
          <Button fullWidth onClick={() => onSave(picked)} disabled={!isValid || busy}>
            Save date
          </Button>
          <Button variant="ghost" fullWidth onClick={onSkip} disabled={busy}>
            Skip for now
          </Button>
          <Button variant="ghost" fullWidth onClick={onMute} disabled={busy}>
            Don&apos;t ask again for this bill
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="break-words text-sm text-muted">{billName}</p>
        <p className="text-sm text-foreground">
          This bill has no due date. Pick when it&apos;s next due and Funded will track it from there.
        </p>
        <Field
          id="next-due-date"
          label="Next due date"
          description={showInvalid ? "Pick today or a later date." : undefined}
        >
          <Input
            id="next-due-date"
            type="date"
            min={todayYmd}
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            disabled={busy}
            aria-describedby={showInvalid ? "next-due-date-desc" : undefined}
          />
        </Field>
      </div>
    </Dialog>
  );
}
