"use client";

import React from "react";
import { Plus } from "lucide-react";
import BackCircle from "@/components/ui/BackCircle";
import IconCircle from "@/components/ui/IconCircle";
import HeaderActions from "@/components/HeaderActions";

type AddProps =
  | { onAdd: () => void; addLabel: string }
  | { onAdd?: undefined; addLabel?: undefined };

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Hide the avatar (Settings and Updates). Default true. */
  showAvatar?: boolean;
  /** Drill-down pages: shows a back circle left of the title. */
  onBack?: () => void;
  /** A small mark left of the title (the Dashboard verdict's status dot). */
  leading?: React.ReactNode;
  /** Read out before the title by screen readers only ("Dashboard" for the verdict header). */
  srTitle?: string;
  /** Extra controls rendered before the "+" circle (later slices). */
  extra?: React.ReactNode;
} & AddProps;

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
  return (
    <div className="flex items-start justify-between gap-3 mb-4 mt-2">
      <div className="flex min-w-0 items-start gap-2">
        {onBack && <BackCircle onClick={onBack} className="-ml-1" />}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            {leading}
            <h1 className="font-heading font-extrabold text-[28px] sm:text-[32px] leading-tight tracking-tight text-foreground truncate">
              {srTitle && <span className="sr-only">{srTitle}: </span>}
              {title}
            </h1>
          </div>
          {subtitle && <p className="text-xs text-muted mt-1 font-body">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {extra}
        {onAdd && (
          <IconCircle label={addLabel} onClick={onAdd}>
            <Plus size={18} aria-hidden="true" />
          </IconCircle>
        )}
        <HeaderActions showAvatar={showAvatar} />
      </div>
    </div>
  );
}
