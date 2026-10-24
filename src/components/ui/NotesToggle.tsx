"use client";

import React, { useState } from "react";
import { NotebookPen } from "lucide-react";
import IconCircle from "./IconCircle";
import Textarea from "./Textarea";

interface NotesToggleProps {
  /** Id of the text box; the toggle controls it. */
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Accessible name of the text box. Defaults to "Notes". */
  label?: string;
}

/**
 * A notes icon that shows a hidden text box (R06, #393). Starts open when
 * there is already text, so saved notes are never hidden.
 */
export default function NotesToggle({
  id,
  value,
  onChange,
  label = "Notes",
}: NotesToggleProps) {
  const [open, setOpen] = useState(() => value.trim() !== "");

  return (
    <div className="flex flex-col gap-2">
      <IconCircle
        label={open ? "Hide notes" : "Add notes"}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <NotebookPen size={18} aria-hidden="true" />
      </IconCircle>
      {open && (
        <Textarea
          id={id}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
