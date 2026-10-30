"use client";

import React from "react";
import Link from "next/link";
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
  /** Navigational row: renders a real link (same look as a tappable row). Wins over onClick. */
  href?: string;
  /** Taller tap target (44px) for tappable rows inside pop-ups. */
  tall?: boolean;
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
  href,
  tall,
  className,
}: RowProps) {
  const interactive = typeof onClick === "function" || typeof href === "string";

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
    tall && interactive && "min-h-11",
    className
  );

  if (typeof href === "string") {
    return (
      <Link href={href} className={cn(base, "text-left press-tint")}>
        {content}
      </Link>
    );
  }

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={cn(base, "text-left press-tint")}>
        {content}
      </button>
    );
  }

  return <div className={base}>{content}</div>;
}
