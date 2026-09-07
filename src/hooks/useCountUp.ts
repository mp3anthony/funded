"use client";

import { useEffect, useRef, useState } from "react";

/* ── Shared count-up hook (Slice 99: motion overhaul) ──────────────
   Same animation the dashboard's HealthScoreCard stat tiles use
   (Slice 13, #99 Part 5): animates a displayed number from its previous
   value to a new target over `durationMs` on an ease-out-cubic curve, via
   requestAnimationFrame. Re-triggers whenever `target` changes (including
   on mount, animating up from 0).

   Factored out here so goal amounts/percentages (Funds page, dashboard's
   ActiveGoalsCard, GoalDetailSheet) can share the exact same feel without
   duplicating the tick logic — HealthScoreCard keeps its own local copy
   untouched since it already shipped and works.

   `animateOnMount` opts into HealthScoreCard's original behaviour (count
   up from 0 on first mount too) — appropriate for a single focal reveal
   like GoalDetailSheet's headline amount, which remounts fresh each time
   the sheet opens. It defaults to false because for list rows (Funds page,
   ActiveGoalsCard) animating every row from 0 on first mount reads as
   page-load choreography, which Operate-mode surfaces should avoid — there
   the first run just settles at the target, and only a later change (e.g.
   Add Amount) counts up/down from the previous value. */
export function useCountUp(target: number, durationMs = 900, animateOnMount = false): number {
  const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : target);
  // Tracks the value actually on screen right now (updated every tick), as
  // opposed to only the value an animation *started* from. This is what
  // lets a new target — arriving mid-animation — pick up from wherever the
  // number visually is instead of rewinding to the previous animation's
  // stale starting point (see Slice 99 review fix #1).
  const displayValueRef = useRef(displayValue);
  const rafRef = useRef<number | null>(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      if (!animateOnMount) {
        // Initial state/ref were already seeded to `target` above, so
        // there's nothing to animate or reconcile on this first run.
        return;
      }
    }

    // Cancel any in-flight animation before reading the "live" value below —
    // otherwise a stray frame from the old rAF loop could write to the ref
    // after we've captured `from`.
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const from = displayValueRef.current;
    const to = target;
    if (from === to) return;

    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      const value = from + (to - from) * eased;
      displayValueRef.current = value;
      setDisplayValue(value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return displayValue;
}

export default useCountUp;
