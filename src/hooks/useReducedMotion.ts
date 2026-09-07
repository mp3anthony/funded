/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the user's `prefers-reduced-motion` OS/browser setting, live —
 * used where a component needs to switch its *rendered* motion strategy in
 * JS (e.g. swapping a continuously-scrolling ticker for a static crossfade,
 * #151) rather than just disabling a CSS animation via a media query.
 *
 * Defaults to `false` on the server/first render so SSR and the initial
 * client render agree; the real value settles in on mount.
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);

    const handleChange = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  return prefersReduced;
}
