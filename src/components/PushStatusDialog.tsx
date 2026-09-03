"use client";

import { useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import { subscribeToPush, type PushStatus } from "@/lib/pushClient";

/* ── Slice 10 (#96 half A): push dead-subscription re-prompt ──────
   Opened from the "Push notifications" Row in settings-client.tsx. Explains
   *why* this device isn't receiving push (permission never granted vs.
   granted-but-no-live-subscription — the iOS-expiry case) in plain,
   non-alarming language, then lets the user fix it in one tap: re-request
   permission and re-register, without reinstalling the PWA.

   subscribeToPush() (src/lib/pushClient.ts) already handles both the
   permission prompt and re-subscribing/persisting in one call — this dialog
   is just the UI wrapper + status refresh around it, same shape as
   TimezoneDialog/NotifyHourDialog. */

interface PushStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  status: PushStatus;
  /** Re-checks status after a successful (re)subscribe, so the Row/dialog
   *  reflect the new state without a full page reload. */
  onStatusChange: (status: PushStatus) => void;
}

function statusMessage(status: PushStatus): string {
  if (!status.supported) {
    return "This browser doesn't support push notifications. You'll still see reminders inside the app.";
  }
  if (status.permission === "denied") {
    return "Notifications are blocked for this site. You'll need to allow them in your browser's site settings before we can re-enable push here.";
  }
  if (status.permission !== "granted") {
    return "This device hasn't granted permission for push notifications yet, so reminders can't reach it outside the app.";
  }
  if (!status.hasLiveSubscription) {
    return "Permission is granted, but this device's subscription has expired or was invalidated — common after some time away from the app on iOS. Re-enabling refreshes it.";
  }
  return "Push notifications are active on this device.";
}

export default function PushStatusDialog({
  isOpen,
  onClose,
  status,
  onStatusChange,
}: PushStatusDialogProps) {
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justEnabled, setJustEnabled] = useState(false);

  // Reset local state whenever the dialog is (re)opened — same
  // adjusting-state-during-render pattern as TimezoneDialog/NotifyHourDialog.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setError(null);
      setJustEnabled(false);
    }
  }

  const needsAction = status.supported && !status.hasLiveSubscription && status.permission !== "denied";

  async function handleEnable() {
    setError(null);
    setIsEnabling(true);
    try {
      await subscribeToPush();
      setJustEnabled(true);
      onStatusChange({ supported: true, permission: "granted", hasLiveSubscription: true });
    } catch (err) {
      setError((err as Error)?.message || "Failed to enable push notifications. Please try again.");
    } finally {
      setIsEnabling(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Push notifications"
      icon={
        status.hasLiveSubscription ? (
          <Bell className="h-5 w-5 text-primary" />
        ) : (
          <BellOff className="h-5 w-5 text-muted" />
        )
      }
      footer={
        needsAction ? (
          <>
            <DialogButton variant="ghost" onClick={onClose} disabled={isEnabling}>
              Not now
            </DialogButton>
            <DialogButton variant="primary" onClick={handleEnable} disabled={isEnabling}>
              {isEnabling ? "Enabling…" : justEnabled ? "Enabled" : "Enable push notifications"}
            </DialogButton>
          </>
        ) : (
          <DialogButton variant="primary" onClick={onClose}>
            Done
          </DialogButton>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 rounded-[2px] p-3 text-destructive text-xs font-mono break-words whitespace-pre-wrap">
            <span className="font-bold">Couldn&apos;t enable push notifications:</span>
            <br />
            {error}
          </div>
        )}
        {justEnabled && !error && (
          <div className="flex items-center gap-2 bg-success/10 border border-success/30 rounded-xl p-3 text-success text-sm font-semibold">
            <Check className="h-4 w-4 shrink-0" /> Push notifications are now active on this device.
          </div>
        )}
        <p className="text-sm text-muted leading-relaxed">{statusMessage(status)}</p>
        <p className="font-mono text-[11px] text-subtle leading-relaxed">
          This only affects push alerts on this device — in-app reminders and the notification centre
          keep working either way.
        </p>
      </div>
    </Dialog>
  );
}
