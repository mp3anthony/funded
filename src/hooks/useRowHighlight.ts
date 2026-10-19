"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HIGHLIGHT_MS } from "@/lib/addFlow";
import { useReducedMotion } from "./useReducedMotion";

/** Wait for the pop-up to finish closing (scroll lock released) before scrolling. */
const SCROLL_DELAY_MS = 300;

/**
 * Briefly highlights one list row after something was added (R07, #394).
 * `flash(key)` scrolls the element with that DOM id to the middle of the
 * screen, then `highlightKey` equals the key for `HIGHLIGHT_MS`; the page puts
 * `row-highlight` on an inner wrapper while it matches. A row that is not on
 * screen (hidden by a filter) is simply not found. Reusable by other lists.
 * `delayMs` (default 300, the pop-up close) is how long to wait first; a page
 * that expands a collapsed group first passes at least that animation's length
 * (Goals, R08), so the scroll lands on the settled row.
 */
export function useRowHighlight() {
  const reduced = useReducedMotion();
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  // Mutated in place (never reassigned) so the unmount cleanup sees every timer.
  const timers = useRef<number[]>([]);

  const flash = useCallback(
    (key: string, delayMs: number = SCROLL_DELAY_MS) => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current.length = 0;
      timers.current.push(
        window.setTimeout(() => {
          setHighlightKey(key);
          window.requestAnimationFrame(() => {
            document.getElementById(key)?.scrollIntoView({
              block: "center",
              behavior: reduced ? "auto" : "smooth",
            });
          });
          timers.current.push(window.setTimeout(() => setHighlightKey(null), HIGHLIGHT_MS));
        }, delayMs)
      );
    },
    [reduced]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  return { highlightKey, flash };
}
