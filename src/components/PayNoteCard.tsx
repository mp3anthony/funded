"use client";

import React, { useId, useState } from "react";
import { useApp, type PayHistory } from "@/context/AppContext";
import Field from "@/components/ui/Field";
import SingleCard from "@/components/ui/SingleCard";
import Textarea from "@/components/ui/Textarea";

interface PayNoteCardProps {
  /** The pay whose note is shown. Null = closed. */
  history: PayHistory | null;
  onClose: () => void;
}

/**
 * The "Pay note" pop-up on a Payday History row (F12, #476): shows the pay's
 * note and lets anyone edit it. Notes only, no edit history. Save is greyed
 * until the text changes; empty text saves as no note.
 */
export default function PayNoteCard({ history, onClose }: PayNoteCardProps) {
  const { updatePayNotes } = useApp();
  const id = useId();

  // Keep the last pay while the card closes so the text never blanks, and
  // start from its saved note each time the card opens (derived-state reset, no effect).
  // Reset on open or on a different pay only, so a background refresh never wipes typing.
  const [shown, setShown] = useState<PayHistory | null>(history);
  const [text, setText] = useState(history?.notes ?? "");
  const [wasOpen, setWasOpen] = useState(history !== null);
  const isOpen = history !== null;
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (history) {
      setShown(history);
      setText(history.notes ?? "");
    }
  } else if (history !== null && String(history.id) !== String(shown?.id)) {
    setShown(history);
    setText(history.notes ?? "");
  }

  const current = history ?? shown;
  const saved = (current?.notes ?? "").trim();
  const changed = text.trim() !== saved;

  return (
    <SingleCard
      open={history !== null}
      onClose={onClose}
      title="Pay note"
      submitLabel="Save"
      canSubmit={changed}
      successToast="Note saved"
      onSubmit={async () => {
        if (!current) return false;
        await updatePayNotes(String(current.id), text);
      }}
    >
      <Field id={id} label="Note">
        <Textarea id={id} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
      </Field>
    </SingleCard>
  );
}
