"use client";

import { CheckCircle2 } from "lucide-react";
import Dialog, { DialogButton } from "@/components/ui/Dialog";

interface EmailVerifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailVerifiedModal({ isOpen, onClose }: EmailVerifiedModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Email verified!"
      placement="confirm"
      role="alertdialog"
      hideClose
      header={(titleId) => (
        <h3
          id={titleId}
          className="shrink-0 px-5 pt-6 text-center text-[17px] font-bold text-foreground"
        >
          Email verified!
        </h3>
      )}
      footer={
        <DialogButton variant="primary" onClick={onClose}>
          Continue to Funded
        </DialogButton>
      }
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <CheckCircle2 className="h-12 w-12 text-primary-ink" />
        <p className="text-sm text-muted font-body leading-relaxed">
          Your account is ready. Let&apos;s get your household set up.
        </p>
      </div>
    </Dialog>
  );
}
