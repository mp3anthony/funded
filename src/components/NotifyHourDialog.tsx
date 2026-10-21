"use client";

import { useId, useState } from "react";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import SingleCard from "@/components/ui/SingleCard";

/* ── Slice 9 (#97): per-user notify-hour picker ───────────────────
   "Notify me around X o'clock" — independent per user (unlike the
   household-wide timezone from Slice 8/#37), so every member picks their
   own hour rather than only the owner. Stored on notification_settings.
   notify_hour (0-23, local to the household's timezone).

   The push-reminders cron reads notify_hour to schedule each member's
   reminders (Slice 11); this dialog only edits the stored preference. */

interface NotifyHourDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentHour: number;
  onSave: (hour: number) => Promise<void>;
}

function formatHourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function NotifyHourDialog({
  isOpen,
  onClose,
  currentHour,
  onSave,
}: NotifyHourDialogProps) {
  const selectId = useId();
  const [selected, setSelected] = useState(currentHour);

  // Reset local state whenever the dialog is (re)opened — same
  // adjusting-state-during-render pattern as TimezoneDialog, so a previous
  // selection doesn't linger into the next open.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) setSelected(currentHour);
  }

  return (
    <SingleCard
      open={isOpen}
      onClose={onClose}
      title="Notify me at"
      submitLabel="Save"
      canSubmit={selected !== currentHour}
      onSubmit={() => onSave(selected)}
    >
      <Field
        id={selectId}
        label="Hour"
        description="Your preferred hour for reminders, independent of other household members."
      >
        <Select
          id={selectId}
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
          aria-describedby={`${selectId}-desc`}
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {formatHourLabel(hour)}
            </option>
          ))}
        </Select>
      </Field>
    </SingleCard>
  );
}
