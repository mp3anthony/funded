/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { dashboardTips } from "@/lib/dashboard-tips";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface DashboardTipsTickerProps {
  /** True when both UpcomingBillsCard and ActiveGoalsCard are minimised. */
  active: boolean;
}

/**
 * News-ticker-style tips banner (#151). Fixed to the bottom of the
 * viewport, sitting directly above BottomNav (same clearance value
 * AppShell already reserves for it). Only shown while `active` — i.e. both
 * dashboard cards are minimised — and can be dismissed for the current
 * "active" streak; dismissing resets as soon as the condition breaks
 * (either card expands), so it's ready to reappear next time both cards
 * are minimised again rather than being gone forever.
 */
/** Delay before the banner starts fading in after `active` becomes true.
 * Only the initial appearance is delayed — fade-out and dismiss are instant. */
const SHOW_DELAY_MS = 2000;

export default function DashboardTipsTicker({ active }: DashboardTipsTickerProps) {
  const [dismissed, setDismissed] = useState(false);
  // True only for the dismiss (X button) path — hides the banner instantly
  // instead of via the normal fade transition. Reset alongside `dismissed`
  // so the next appearance fades in/out normally again.
  const [instantHide, setInstantHide] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  // `active` flips to true the instant both cards are minimised, but the
  // banner shouldn't start fading in until ~2s later — gives the user a
  // beat before it appears. Going the other way (active -> false) is
  // instant, no delay, so the fade-out/dismiss paths are unaffected.
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShouldShow(false);
      return;
    }
    const id = setTimeout(() => setShouldShow(true), SHOW_DELAY_MS);
    return () => clearTimeout(id);
  }, [active]);

  // Dismiss only lasts for the current "both minimised" streak — reset the
  // moment the trigger condition is broken so the banner is armed again
  // next time it's met (not a permanent/localStorage-forever dismiss).
  useEffect(() => {
    if (!active) {
      setDismissed(false);
      setInstantHide(false);
    }
  }, [active]);

  const visible = shouldShow && !dismissed;

  const handleDismiss = () => {
    setInstantHide(true);
    setDismissed(true);
  };

  // Reduced-motion fallback: instead of scrolling, cycle through one tip
  // at a time with a slow crossfade.
  useEffect(() => {
    if (!visible || !prefersReducedMotion) return;
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % dashboardTips.length);
    }, 4500);
    return () => clearInterval(id);
  }, [visible, prefersReducedMotion]);

  return (
    <div
      className={`fixed inset-x-0 z-40 px-4 ease-(--ease-standard) ${
        instantHide ? "" : "transition-opacity duration-(--duration-slow)"
      }`}
      style={{
        bottom: "calc(5rem + env(safe-area-inset-bottom))",
        opacity: visible ? 1 : 0,
      }}
      aria-hidden={!visible}
      inert={!visible ? true : undefined}
    >
      <div className="mx-auto w-full max-w-2xl lg:max-w-4xl">
        <div
          className="ticker-viewport relative flex items-center overflow-hidden rounded-xl border backdrop-blur-lg"
          style={{
            background: "var(--color-primary-light)",
            borderColor: "var(--color-primary-mid)",
          }}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 ml-3" aria-hidden="true" />

          {prefersReducedMotion ? (
            <div className="flex-1 min-w-0 py-2.5 pl-2.5 pr-9">
              <p
                key={tipIndex}
                className="ticker-tip-fade font-body text-xs font-semibold text-foreground truncate"
              >
                {dashboardTips[tipIndex]}
              </p>
            </div>
          ) : (
            <div className="flex-1 min-w-0 py-2.5 pl-2.5 pr-9 overflow-hidden">
              <div className="ticker-track flex items-center w-max">
                <TipsRow />
                <TipsRow ariaHidden />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss tips"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center text-primary/80 hover:text-primary hover:bg-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** One full pass of the tip list, rendered twice back-to-back by the
 * parent to build a seamless -50% looping marquee. */
function TipsRow({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div className="flex items-center shrink-0" aria-hidden={ariaHidden || undefined}>
      {dashboardTips.map((tip, i) => (
        <span
          key={i}
          className="font-body text-xs font-semibold text-foreground whitespace-nowrap pr-10"
        >
          {tip}
        </span>
      ))}
    </div>
  );
}
