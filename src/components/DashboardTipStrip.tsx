"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { dashboardTips } from "@/lib/dashboard-tips";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import IconCircle from "@/components/ui/IconCircle";

const HIDDEN_KEY = "funded:tipStripHidden";
const ROTATE_MS = 6000;
// Fallback for --duration-feedback, which the real fade time is read from.
const FADE_FALLBACK_MS = 300;

function fadeMs(): number {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--duration-feedback").trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) return FADE_FALLBACK_MS;
    return raw.endsWith("ms") ? n : raw.endsWith("s") ? n * 1000 : FADE_FALLBACK_MS;
  } catch {
    return FADE_FALLBACK_MS;
  }
}

/**
 * Slim tip line at the top of the Dashboard (R26, #413). One tip at a time, crossfading to the
 * next every few seconds (instant swap with Reduce Motion, paused while the app is hidden).
 * X hides it until the app is next opened (sessionStorage; the strip works without it).
 */
export default function DashboardTipStrip() {
  const reducedMotion = useReducedMotion();
  // null = not read yet: render nothing so a hidden strip never flashes.
  const [hidden, setHidden] = useState<boolean | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);

  useEffect(() => {
    let wasHidden = false;
    try {
      wasHidden = window.sessionStorage.getItem(HIDDEN_KEY) === "1";
    } catch {
      wasHidden = false;
    }
    // One-shot sync from sessionStorage, not a render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(wasHidden);
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const running = hidden === false && !pageHidden;

  useEffect(() => {
    if (!running) return;
    let swap: ReturnType<typeof setTimeout> | undefined;
    const next = () => setTipIndex((i) => (i + 1) % dashboardTips.length);
    const timer = setInterval(() => {
      if (reducedMotion) {
        next();
        return;
      }
      setFading(true);
      swap = setTimeout(() => {
        next();
        setFading(false);
      }, fadeMs());
    }, ROTATE_MS);
    return () => {
      clearInterval(timer);
      if (swap) clearTimeout(swap);
      setFading(false);
    };
  }, [running, reducedMotion]);

  if (hidden !== false) return null;

  const hide = () => {
    setHidden(true);
    try {
      window.sessionStorage.setItem(HIDDEN_KEY, "1");
    } catch {
      // Storage blocked: it just comes back next visit to the page.
    }
  };

  return (
    <div
      className="mb-2 flex min-h-12 items-center gap-2 rounded-2xl border pl-4 pr-1"
      style={{ background: "var(--color-primary-light)", borderColor: "var(--color-primary-mid)" }}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary-ink" aria-hidden="true" />
      <p
        className={`min-w-0 flex-1 line-clamp-2 font-body text-xs leading-snug font-semibold text-foreground transition-opacity duration-(--duration-feedback) ease-(--ease-enter) motion-reduce:transition-none ${
          fading ? "opacity-0" : "opacity-100"
        }`}
      >
        {dashboardTips[tipIndex]}
      </p>
      <IconCircle label="Hide tips" onClick={hide}>
        <X size={18} aria-hidden="true" />
      </IconCircle>
    </div>
  );
}
