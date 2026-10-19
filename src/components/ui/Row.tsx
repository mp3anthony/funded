"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RowProps {
  /** Left-side label (Instrument Sans). */
  label: React.ReactNode;
  /** Right-side value. Figures use the body font with tabular numbers. */
  value?: React.ReactNode;
  /** Custom right-side content; overrides `value` when provided. */
  children?: React.ReactNode;
  /** Show a trailing chevron (navigational rows). */
  chevron?: boolean;
  /** Draw a hairline top border (list rows). Off by default — editorial
   *  settings sections separate rows with whitespace, not borders. */
  divider?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Flat editorial row — a label on the left and a value / control / chevron on
 * the right, with no surrounding box. Two idioms from the design:
 *   • settings rows: borderless, py-2.5 (divider omitted)
 *   • list rows: hairline top border (divider), used in stacked lists
 * Border colour is the theme token so light + dark both render correctly.
 */
export default function Row({
  label,
  value,
  children,
  chevron,
  divider,
  onClick,
  className,
}: RowProps) {
  const interactive = typeof onClick === "function";

  const content = (
    <>
      <span className="text-[15px] font-body text-foreground/85 min-w-0">
        {label}
      </span>
      <span className="flex items-center gap-2 shrink-0 text-right">
        {children ?? (
          <span className="text-[13px] text-muted">{value}</span>
        )}
        {chevron && <ChevronRight className="h-[17px] w-[17px] text-subtle" />}
      </span>
    </>
  );

  const base = cn(
    "w-full flex items-center justify-between gap-3 py-2.5",
    divider && "border-t border-border",
    className
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={cn(base, "text-left")}>
        {content}
      </button>
    );
  }

  return <div className={base}>{content}</div>;
}
