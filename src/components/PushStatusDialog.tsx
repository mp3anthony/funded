"use client";

import { useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import SingleCard from "@/components/ui/SingleCard";
import { subscribeToPush, type PushStatus } from "@/lib/pushClient";

/* ── Slice 10 (#96 half A): push dead-subscription re-prompt ──────
   Opened from the "Push on this device" row in NotificationCenter. Explains
   *why* this device isn't receiving push (permission never granted vs.
   granted-but-no-live-subscription — the iOS-expiry case) in plain,
   non-alarming language, then lets the user fix it in one tap: re-request
   permission and re-register, without reinstalling the PWA.

   subscribeToPush() (src/lib/pushClient.ts) already handles both the
   permission prompt and re-subscribing/persisting in one call.

   R13 (#400): when action is needed this is a SingleCard (the shared save
   behaviour: "Saving…", red line, "Try again"); otherwise a plain bottom card
   with "Done". It closes after enabling with no toast (a toast would sit under
   the Notifications sheet). */

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

function computeNeedsAction(status: PushStatus): boolean {
  return status.supported && !status.hasLiveSubscription && status.permission !== "denied";
}

export default function PushStatusDialog({
  isOpen,
  onClose,
  status,
  onStatusChange,
}: PushStatusDialogProps) {
  // Snapshot at open so onStatusChange inside onSubmit does not swap the
  // card for the Done card (a remount) while the save is still finishing.
  const [needsAction, setNeedsAction] = useState(() => computeNeedsAction(status));
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) setNeedsAction(computeNeedsAction(status));
  }

  const body = (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted leading-relaxed">{statusMessage(status)}</p>
      <p className="text-[11px] text-subtle leading-relaxed">
        This only affects push alerts on this device — in-app reminders and the notification centre
        keep working either way.
      </p>
    </div>
  );

  if (needsAction) {
    return (
      <SingleCard
        open={isOpen}
        onClose={onClose}
        title="Push notifications"
        submitLabel="Enable push notifications"
        showThrownMessage
        secondaryAction={{ label: "Not now", onClick: onClose }}
        onSubmit={async () => {
          try {
            await subscribeToPush();
          } catch (err) {
            const msg = (err as Error)?.message || "Please try again.";
            throw new Error(`Couldn't enable push notifications: ${msg}`);
          }
          onStatusChange({ supported: true, permission: "granted", hasLiveSubscription: true });
        }}
      >
        {body}
      </SingleCard>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Push notifications"
      placement="bottom"
      footer={
        <Button fullWidth onClick={onClose}>
          Done
        </Button>
      }
    >
      {body}
    </Dialog>
  );
}
