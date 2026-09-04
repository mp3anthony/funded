"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   Dialog — the single "1d" popup template every modal/sheet uses.

   One shell (editorial turn-3 spec): squared card (2px radius) with a
   lime gradient top-edge, header (title + X, hairline under), scrollable
   body, optional footer (hairline over). Destructive flows only swap the
   solid button colour.

   Two behaviours this MUST preserve to fit the existing app:
   • The backdrop carries the `modal-backdrop` class — AppShell's
     MutationObserver toggles body scroll-lock on its presence, and
     globals.css applies the mobile centered-card treatment to it.
   • It portals to document.body — a nested position:fixed inside the
     AppShell overflow-hidden wrapper is reclassified to absolute on iOS
     WebKit (see AGENTS.md invariant #2 and the pre-existing household
     modals that already portal for this reason).

   The card's height cap is `max-h-full`, NOT a dvh value. The backdrop is
   full-screen but pads itself down to the keyboard-free area (see the
   .modal-backdrop comment in globals.css), so 100% of its content box IS
   the visible area. dvh tracks the layout viewport, which iOS does not
   shrink for the keyboard, so a dvh cap let tall forms spill out top and
   bottom with the body below never scrolling.

   The lime top-edge is an inner clipped bar (not a CSS border-top): the
   mobile globals.css rule forces `border: 1px … !important` on the card,
   which would otherwise overwrite a real border-top. An inner bar lives
   inside the card's overflow-hidden and survives that override.
   ───────────────────────────────────────────────────────────── */

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Optional icon shown before the title (lucide element). */
  icon?: React.ReactNode;
  /** Body content. */
  children: React.ReactNode;
  /** Optional non-scrolling region between the header and the scrollable body; the consumer styles its own content (no border/padding baked in). */
  subheader?: React.ReactNode;
  /** Footer content — pass DialogButton(s); wrapped in the standard bar. */
  footer?: React.ReactNode;
  /** Panel max width. Defaults to max-w-md (matches app + globals.css cap). */
  maxWidthClass?: string;
  /** Hide the header close button (rare). */
  hideClose?: boolean;
}

export default function Dialog({
  open,
  onClose,
  title,
  icon,
  children,
  subheader,
  footer,
  maxWidthClass = "max-w-md",
  hideClose = false,
}: DialogProps) {
  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] modal-backdrop flex items-center justify-center p-4 dialog-backdrop-animate"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Dim + blur layer, split from the opacity-animated wrapper above.
          Safari doesn't animate `backdrop-filter` smoothly when opacity is
          transitioning on the SAME element — it composites the blur once
          the animation settles instead of fading it in, which read as "no
          entrance animation" on-device (#99 regression). Keeping the static
          dim/blur here and letting the wrapper's opacity carry the fade
          works around it: this div's own opacity never changes, so its
          backdrop-filter always composites normally, and it still visually
          fades in/out as part of the ancestor's animated opacity. */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      <div
        className={cn(
          "relative bg-surface border border-border-strong rounded-[2px] w-full max-h-full flex flex-col shadow-2xl overflow-hidden dialog-card-animate",
          maxWidthClass
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lime gradient top-edge (inner bar — see file header note) */}
        <div
          className="absolute inset-x-0 top-0 h-[2px] pointer-events-none z-10"
          style={{
            background:
              "linear-gradient(90deg, var(--color-primary), transparent)",
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h3 className="text-[17px] font-bold text-foreground font-heading flex items-center gap-2 min-w-0">
            {icon}
            <span className="truncate">{title}</span>
          </h3>
          {!hideClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 -mr-2 text-muted hover:text-foreground hover:bg-surface-raised rounded-xl transition-colors shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Subheader — non-scrolling region (consumer styles content) */}
        {subheader && <div className="shrink-0">{subheader}</div>}

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center gap-3 p-5 border-t border-border shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ── Footer button — ghost / primary / destructive ──────────────
   Ghost is the left cancel; the solid (primary or destructive) sits on
   the right. This is the only part of the shell that varies per dialog. */

type DialogButtonVariant = "ghost" | "primary" | "destructive";

interface DialogButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: DialogButtonVariant;
}

export function DialogButton({
  variant = "ghost",
  className,
  children,
  ...props
}: DialogButtonProps) {
  const styles: Record<DialogButtonVariant, string> = {
    ghost:
      "border border-border-strong text-muted hover:text-foreground hover:bg-surface-raised",
    primary:
      "bg-primary text-primary-fg hover:brightness-110 active:scale-95 shadow-lg shadow-primary/20",
    destructive:
      "bg-destructive text-destructive-fg hover:brightness-110 active:scale-95 shadow-lg shadow-destructive/20",
  };

  return (
    <button
      className={cn(
        "flex-1 py-3 rounded-[2px] text-sm font-bold transition-all cursor-pointer disabled:opacity-60 disabled:pointer-events-none",
        styles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ── DialogSection — Syne label + lime fade-rule ────────────────
   The editorial section header used inside modal bodies. Matches the
   shipped page pattern (font-heading bold + h-0.5 lime→transparent
   rule): a Syne label, an optional mono count, the fade-rule, and an
   optional trailing node (e.g. an "Add" affordance). */

interface DialogSectionProps {
  label: React.ReactNode;
  /** Optional mono count shown after the label, e.g. member count. */
  count?: React.ReactNode;
  /** Optional trailing content pinned to the right of the rule. */
  trailing?: React.ReactNode;
  className?: string;
}

export function DialogSection({
  label,
  count,
  trailing,
  className,
}: DialogSectionProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="font-heading font-bold text-[15px] text-foreground shrink-0">
        {label}
      </span>
      {count != null && (
        <span className="font-mono text-[11px] font-semibold text-subtle shrink-0">
          {count}
        </span>
      )}
      <span
        className="h-0.5 flex-1 rounded-sm"
        style={{
          background:
            "linear-gradient(90deg, var(--color-primary), transparent)",
        }}
      />
      {trailing}
    </div>
  );
}
