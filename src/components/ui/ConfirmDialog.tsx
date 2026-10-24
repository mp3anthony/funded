"use client";

import React, { useState } from "react";
import { useSheetSave } from "@/hooks/useSheetSave";
import { primaryPillLabel } from "@/lib/sheetSave";
import Dialog, { DialogButton } from "./Dialog";

interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  /** The question text. */
  message?: React.ReactNode;
  /** Extra content under the message (e.g. a typed-confirmation field). */
  children?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Red confirm pill (default). False gives the lime primary pill. */
  destructive?: boolean;
  /** Disables the confirm pill (e.g. until a typed word matches). */
  canConfirm?: boolean;
  /** Confirm pill text while saving. Defaults to "Saving…". */
  busyLabel?: string;
  /** Toast shown after a successful confirm. */
  successToast?: string;
  errorMessage?: string;
  /** Show the thrown error's own message (server messages). */
  showThrownMessage?: boolean;
  /** Success leaves the dialog busy and skips onDone and the toast (the page is navigating away). */
  keepBusyOnSuccess?: boolean;
  /** Return false or throw to fail; void or true to succeed. */
  onConfirm: () => Promise<boolean | void> | boolean | void;
  /** Called after a successful confirm. Defaults to onCancel (closes the dialog). */
  onDone?: () => void;
  onCancel: () => void;
}

/**
 * Small centred question with Cancel and a red action (R05, #392).
 * Saves go through useSheetSave: "Saving…" with both pills locked; a failure
 * keeps the dialog open with a red line and a "Try again" pill.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = true,
  canConfirm = true,
  busyLabel,
  successToast,
  errorMessage,
  showThrownMessage,
  keepBusyOnSuccess,
  onConfirm,
  onDone,
  onCancel,
}: ConfirmDialogProps) {
  const { status, error, run, reset } = useSheetSave({
    onSuccess: onDone ?? onCancel,
    successToast,
    errorMessage,
    showThrownMessage,
    keepBusyOnSuccess,
  });

  // Fresh state each time the dialog opens (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) reset();
  }

  const saving = status === "saving";
  const label =
    saving && busyLabel ? busyLabel : primaryPillLabel(status, confirmLabel);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      placement="confirm"
      role="alertdialog"
      hideClose
      busy={saving}
      error={error}
      header={(titleId) => (
        <h3
          id={titleId}
          className="shrink-0 px-5 pt-6 text-center text-[17px] font-bold text-foreground"
        >
          {title}
        </h3>
      )}
      footer={
        <>
          <DialogButton variant="ghost" onClick={onCancel} disabled={saving}>
            {cancelLabel}
          </DialogButton>
          <DialogButton
            variant={destructive ? "destructive" : "primary"}
            className="min-h-[44px]"
            disabled={saving || !canConfirm}
            onClick={() => run(onConfirm)}
          >
            {label}
          </DialogButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {message && (
          <div className="text-center text-[15px] leading-relaxed text-foreground">
            {message}
          </div>
        )}
        {children}
      </div>
    </Dialog>
  );
}
