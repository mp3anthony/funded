"use client";

import React, { useState } from "react";
import Button from "./Button";
import ConfirmDialog from "./ConfirmDialog";
import Dialog from "./Dialog";

interface DetailSheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Main actions shown on top (the main one `fullWidth` primary). */
  actions?: React.ReactNode;
  /** Red line under `actions` (an action failed). */
  actionError?: React.ReactNode;
  /** An action or card save is in flight: close, Escape, backdrop and Delete do nothing. */
  busy?: boolean;
  /** The item's details as Rows (`divider chevron tall`, onClick only where editable). */
  children: React.ReactNode;
  /** Return false or throw to fail. Omit to hide the Delete pill. */
  onDelete?: () => Promise<boolean | void> | boolean | void;
  deleteLabel?: string;
  deleteConfirm?: { title: string; message: string; confirmLabel: string };
  deletedToast?: string;
}

/**
 * Bottom pop-up showing an item as tappable rows, main actions on top and a
 * red Delete pill at the bottom that asks first (R05, #392). No footer.
 * The sheet is locked while the Delete question is open (R10), so Escape closes
 * only the question and never the sheet under a running delete.
 */
export default function DetailSheet({
  open,
  onClose,
  title,
  actions,
  actionError,
  busy = false,
  children,
  onDelete,
  deleteLabel = "Delete",
  deleteConfirm,
  deletedToast,
}: DetailSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // The Delete question never outlives the sheet (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setConfirmOpen(false);
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={title}
        placement="bottom"
        busy={busy || confirmOpen}
      >
        <div className="flex flex-col gap-4">
          {actions && <div className="flex flex-col gap-2">{actions}</div>}
          {actionError && (
            <p role="alert" className="text-sm text-destructive">
              {actionError}
            </p>
          )}
          <div>{children}</div>
          {onDelete && (
            <div className="flex justify-center">
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => setConfirmOpen(true)}
              >
                {deleteLabel}
              </Button>
            </div>
          )}
        </div>
      </Dialog>
      {onDelete && (
        <ConfirmDialog
          open={open && confirmOpen}
          title={deleteConfirm?.title ?? "Delete this?"}
          message={deleteConfirm?.message}
          confirmLabel={deleteConfirm?.confirmLabel ?? deleteLabel}
          successToast={deletedToast}
          onConfirm={onDelete}
          onCancel={() => setConfirmOpen(false)}
          onDone={() => {
            setConfirmOpen(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
