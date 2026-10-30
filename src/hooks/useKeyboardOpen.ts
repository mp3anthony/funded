"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const NON_TEXT_INPUTS = new Set([
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "range",
  "file",
  "color",
  "image",
]);

/** True when the element opens the on-screen keyboard (text entry). */
export function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(el.type);
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  return el instanceof HTMLElement && el.isContentEditable;
}

/**
 * True while a text field has focus (the on-screen keyboard is likely open).
 * iOS may not fire focusout when a focused element is removed (a sheet closes,
 * the route changes), so the state is re-synced from document.activeElement
 * after focusout, on route change, pointerdown and visibilitychange.
 */
export function useKeyboardOpen(): boolean {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setOpen(isTextEntry(document.activeElement));
    const syncSoon = () => requestAnimationFrame(sync);

    const onFocusIn = (e: FocusEvent) => setOpen(isTextEntry(e.target as Element | null));

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", syncSoon);
    document.addEventListener("pointerdown", syncSoon);
    document.addEventListener("visibilitychange", syncSoon);
    // Route change: re-sync once the new page has settled.
    const id = requestAnimationFrame(sync);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", syncSoon);
      document.removeEventListener("pointerdown", syncSoon);
      document.removeEventListener("visibilitychange", syncSoon);
      cancelAnimationFrame(id);
    };
  }, [pathname]);

  return open;
}
