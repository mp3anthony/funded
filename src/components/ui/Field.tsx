import React from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  /** Id of the control inside; the label points at it. */
  id: string;
  label: React.ReactNode;
  /** Muted helper text under the control (id: `${id}-desc`). */
  description?: React.ReactNode;
  /** Red error text under the control (id: `${id}-err`). */
  error?: React.ReactNode;
  /** Bigger label for the one-question-per-card step flow (R06). */
  question?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Label + control + helper + error block used inside pop-up cards (R05, #392).
 * The consumer puts `aria-describedby` (`${id}-desc` / `${id}-err`) on the control.
 */
export default function Field({
  id,
  label,
  description,
  error,
  question = false,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={id}
        className={cn(
          "font-semibold text-foreground",
          question ? "text-[20px] leading-tight" : "text-[15px]"
        )}
      >
        {label}
      </label>
      {children}
      {description && (
        <p id={`${id}-desc`} className="text-xs leading-relaxed text-muted">
          {description}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-sm text-destructive-ink">
          {error}
        </p>
      )}
    </div>
  );
}
