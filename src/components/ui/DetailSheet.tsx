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
 */
export default function DetailSheet({
  open,
  onClose,
  title,
  actions,
  children,
  onDelete,
  deleteLabel = "Delete",
  deleteConfirm,
  deletedToast,
}: DetailSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onClose={onClose} title={title} placement="bottom">
        <div className="flex flex-col gap-4">
          {actions && <div className="flex flex-col gap-2">{actions}</div>}
          <div>{children}</div>
          {onDelete && (
            <div className="flex justify-center">
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
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
