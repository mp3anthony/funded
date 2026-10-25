"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import BackCircle from "@/components/ui/BackCircle";
import IconCircle from "@/components/ui/IconCircle";
import HeaderActions from "@/components/HeaderActions";
import Logo from "@/components/Logo";

type AddProps =
  | { onAdd: () => void; addLabel: string }
  | { onAdd?: undefined; addLabel?: undefined };

type PageHeaderProps = {
  title: string;
  /** One-line description of the page (row 2, left). */
  subtitle?: string;
  /** Hide the avatar (Settings and Updates). Default true. */
  showAvatar?: boolean;
  /** Drill-down pages: a back circle replaces the app icon in row 1. */
  onBack?: () => void;
  /** A small mark left of the title (the Dashboard verdict's status dot). */
  leading?: React.ReactNode;
  /** Read out before the title by screen readers only ("Dashboard" for the verdict header). */
  srTitle?: string;
  /** Extra controls in row 2, before the "+" circle. */
  extra?: React.ReactNode;
} & AddProps;

/**
 * Three rows (F06, #469): app icon (or back circle) with bell and avatar; description with the
 * page's action buttons; then the title, so a long title never fights the buttons for width.
 */
export default function PageHeader({
  title,
  subtitle,
  showAvatar = true,
  onBack,
  leading,
  srTitle,
  extra,
  onAdd,
  addLabel,
}: PageHeaderProps) {
  const hasActions = Boolean(extra || onAdd);
  return (
    <div className="mb-4 mt-2">
      {/* Row 1: app icon (or back circle) left, bell and avatar right */}
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <BackCircle onClick={onBack} className="-ml-1" />
        ) : (
          <Link
            href="/"
            aria-label="Dashboard"
            className="press inline-flex h-12 min-w-11 -ml-2 items-center justify-start touch-manipulation [-webkit-tap-highlight-color:transparent]"
          >
            <Logo size="large" />
          </Link>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <HeaderActions showAvatar={showAvatar} />
        </div>
      </div>

      {/* Row 2: the page title, full width, sized down on narrow screens so it fits */}
      <div className="mt-1 flex min-w-0 items-center gap-3">
        {leading}
        <h1 className="font-heading font-extrabold text-[clamp(20px,7.2vw,28px)] sm:text-[32px] leading-tight tracking-tight text-foreground truncate">
          {srTitle && <span className="sr-only">{srTitle}: </span>}
          {title}
        </h1>
      </div>

      {/* Row 3: description left, page actions right, on one line */}
      {(subtitle || hasActions) && (
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-xs text-muted font-body">{subtitle}</p>
          {hasActions && (
            <div className="flex shrink-0 items-center gap-1">
              {extra}
              {onAdd && (
                <IconCircle label={addLabel} onClick={onAdd}>
                  <Plus size={18} aria-hidden="true" />
                </IconCircle>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
