"use client";

import React, { useState } from "react";
import Button from "./Button";
import ConfirmDialog from "./ConfirmDialog";
import Dialog from "./Dialog";

interface DetailSheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** The main action, pinned in the footer (pass a `fullWidth` primary Button). */
  primary?: React.ReactNode;
  /**
   * Other actions, pinned in the footer as equal-width pills in one row, with
   * Delete as the last pill. Pass plain `Button`s (no `fullWidth`; the footer sizes them).
   */
  secondary?: React.ReactNode[];
  /** Red line above the footer pills (an action failed). */
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

/** One equal-width cell of the pill row: the button inside fills it. */
const PILL_CELL = "flex min-w-0 flex-1 [&>*]:w-full [&>*]:px-3";

/**
 * Bottom pop-up showing an item as tappable rows (R05, #392). The header is the
 * title and close only. One pinned footer (F03, #466): `primary` full width, then
 * `secondary` pills and the red Delete (asks first) as equal-width pills in one
 * row, Delete last. The body scrolls and the footer stays put.
 * The sheet is locked while the Delete question is open (R10), so Escape closes
 * only the question and never the sheet under a running delete.
 */
export default function DetailSheet({
  open,
  onClose,
  title,
  primary,
  secondary,
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

  const pills = React.Children.toArray(secondary);
  const footer =
    primary || pills.length > 0 || onDelete ? (
      <div className="flex w-full flex-col gap-2">
        {primary}
        {(pills.length > 0 || onDelete) && (
          <div className="flex gap-2">
            {pills.map((pill, i) => (
              <div key={i} className={PILL_CELL}>
                {pill}
              </div>
            ))}
            {onDelete && (
              <div className={PILL_CELL}>
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
        )}
      </div>
    ) : undefined;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title={title}
        placement="bottom"
        busy={busy || confirmOpen}
        error={footer ? actionError : undefined}
        footer={footer}
      >
        {children}
        {!footer && actionError && (
          <p role="alert" className="mt-3 text-sm text-destructive-ink">
            {actionError}
          </p>
        )}
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
