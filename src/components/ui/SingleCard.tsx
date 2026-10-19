"use client";

import React, { useId, useState } from "react";
import { useSheetSave } from "@/hooks/useSheetSave";
import { primaryPillLabel } from "@/lib/sheetSave";
import Button from "./Button";
import Dialog from "./Dialog";

interface SingleCardProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** One or two Fields. */
  children: React.ReactNode;
  /** Main pill label, e.g. "Save". */
  submitLabel: string;
  canSubmit?: boolean;
  /** Return false or throw to fail; void or true to succeed (the card then closes). */
  onSubmit: () => Promise<boolean | void> | boolean | void;
  successToast?: string;
  errorMessage?: string;
  /** Ghost pill under the main one: "Different amount", "Didn't get paid", "Skip". */
  secondaryAction?: { label: string; onClick: () => void };
}

/**
 * Bottom pop-up card for one or two fields with one main pill (R05, #392).
 * Return submits the form; the pill is blocked while disabled or saving.
 */
export default function SingleCard({
  open,
  onClose,
  title,
  children,
  submitLabel,
  canSubmit = true,
  onSubmit,
  successToast,
  errorMessage,
  secondaryAction,
}: SingleCardProps) {
  const formId = useId();
  const { status, error, run, reset } = useSheetSave({
    onSuccess: onClose,
    successToast,
    errorMessage,
  });

  // Fresh state each time the card opens (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) reset();
  }

  const saving = status === "saving";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      placement="bottom"
      busy={saving}
      error={error}
      footer={
        <div className="flex w-full flex-col gap-2">
          <Button
            type="submit"
            form={formId}
            fullWidth
            disabled={saving || !canSubmit}
          >
            {primaryPillLabel(status, submitLabel)}
          </Button>
          {secondaryAction && (
            <Button
              variant="ghost"
              fullWidth
              disabled={saving}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (saving || !canSubmit) return;
          run(onSubmit);
        }}
      >
        {children}
      </form>
    </Dialog>
  );
}
