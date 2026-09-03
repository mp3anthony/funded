"use client";

import { useState } from "react";
import { Check, Bell } from "lucide-react";
import Dialog, { DialogButton } from "@/components/ui/Dialog";

/* ── Slice 9 (#97): per-user notify-hour picker ───────────────────
   "Notify me around X o'clock" — independent per user (unlike the
   household-wide timezone from Slice 8/#37), so every member picks their
   own hour rather than only the owner. Stored on notification_settings.
   notify_hour (0-23, local to the household's timezone).

   NOTE: this only stores the preference. Actually consuming notify_hour to
   change *when* push notifications are sent is Slice 11's job (the cron
   rewrite) — not wired up yet. */

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
  const [selected, setSelected] = useState(currentHour);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset local state whenever the dialog is (re)opened — same
  // adjusting-state-during-render pattern as TimezoneDialog, so a previous
  // selection doesn't linger into the next open.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSelected(currentHour);
      setError(null);
    }
  }

  async function handleSave() {
    if (selected === currentHour) {
      onClose();
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave(selected);
      onClose();
    } catch (err) {
      setError((err as Error)?.message || "Failed to update notify time. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Notify me at"
      icon={<Bell className="h-5 w-5 text-primary" />}
      subheader={
        <div className="px-5 pb-4">
          <p className="text-sm text-muted">
            Your preferred hour for reminders — independent of other household members.
          </p>
        </div>
      }
      footer={
        <>
          <DialogButton variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </DialogButton>
          <DialogButton
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || selected === currentHour}
          >
            {isSaving ? "Saving…" : "Save"}
          </DialogButton>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 mb-2 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
            <span className="font-bold">Failed to update notify time:</span>
            <br />
            {error}
          </div>
        )}
        {HOURS.map((hour) => {
          const active = hour === selected;
          return (
            <button
              key={hour}
              type="button"
              onClick={() => setSelected(hour)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                active
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-transparent text-muted hover:text-foreground hover:bg-surface-raised"
              }`}
            >
              <span className="text-sm font-semibold truncate">{formatHourLabel(hour)}</span>
              {active && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
