"use client";

import { useEffect, useRef, useState } from "react";
import { useApp, type AppToast } from "@/context/AppContext";

/** How long a toast stays up before dismissing itself. Long enough to reach Undo. */
const AUTO_DISMISS_MS = 8000;

/**
 * App-wide toast (#205). Mounted once in AppShell; driven by `toast` /
 * `showToast` / `dismissToast` in AppContext. Sits just above the bottom nav
 * (plus the home-indicator safe area and a little margin) and supports one
 * optional action button (e.g. "Undo").
 *
 * The `role="status"` live region is ALWAYS mounted and only its contents
 * change, so screen readers reliably announce each new message.
 */
export default function Toast() {
  const { toast, dismissToast } = useApp();

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed inset-x-0 z-[60] flex justify-center px-4 pointer-events-none"
      style={{ bottom: "calc(5rem + 12px + env(safe-area-inset-bottom, 0px))" }}
    >
      {toast && <ToastBody key={toast.id} toast={toast} onDismiss={dismissToast} />}
    </div>
  );
}

/**
 * One toast. Keyed by toast id, so each new toast gets a fresh timer.
 * Auto-dismiss pauses while the toast is being touched or has keyboard
 * focus, and resumes with the time that was left once released / blurred.
 */
function ToastBody({ toast, onDismiss }: { toast: AppToast; onDismiss: (id?: number) => void }) {
  const [touching, setTouching] = useState(false);
  const [focused, setFocused] = useState(false);
  const remainingRef = useRef(AUTO_DISMISS_MS);
  const paused = touching || focused;

  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt));
    };
  }, [paused, toast.id, onDismiss]);

  const release = () => setTouching(false);

  return (
    <div
      onPointerDown={() => setTouching(true)}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[2px] border border-border bg-surface-elevated px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <p className="flex-1 min-w-0 text-sm text-foreground">{toast.message}</p>
      {toast.actionLabel && toast.onAction && (
        <button
          type="button"
          onClick={() => {
            const action = toast.onAction;
            onDismiss(toast.id);
            action?.();
          }}
          className="shrink-0 rounded-[2px] px-3 py-1.5 font-heading font-bold uppercase tracking-wider text-xs text-primary hover:bg-primary/10 active:scale-[0.98] transition-all cursor-pointer"
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}
