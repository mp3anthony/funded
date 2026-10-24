"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  /** Section title, rendered in Instrument Sans. */
  title: React.ReactNode;
  /** Optional count shown in muted after the title, e.g. (2). */
  count?: number | string;
  /** Optional trailing content rendered after the lime rule (rare). */
  trailing?: React.ReactNode;
  /** Visual size. "md" = page section (15px), "sm" = subsection (13px). */
  size?: "md" | "sm";
  className?: string;
}

/**
 * Editorial section header — a title followed by a lime fade-rule.
 * The rule is `linear-gradient(90deg, primary → transparent)` so it reads as
 * a signature accent without boxing the section. Colour comes from theme
 * tokens (var(--color-primary) / --color-foreground) so light + dark both work.
 *
 * This is the core repeated element of the editorial (1b) system; every page
 * section uses it instead of a bordered card heading.
 */
export default function SectionHeader({
  title,
  count,
  trailing,
  size = "md",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3 mb-4", className)}>
      <span
        className={cn(
          "font-bold text-foreground shrink-0",
          size === "md" ? "text-[15px]" : "text-[13px]"
        )}
      >
        {title}
      </span>
      {count !== undefined && count !== null && (
        <span className="text-[11px] font-semibold text-subtle shrink-0">
          ({count})
        </span>
      )}
      <span
        className="h-0.5 flex-1 rounded-sm"
        style={{
          background:
            "linear-gradient(90deg, var(--color-primary), transparent)",
        }}
      />
      {trailing && <span className="shrink-0">{trailing}</span>}
    </div>
  );
}
