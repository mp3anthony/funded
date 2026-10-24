// Pure maths for the shared Carousel (R04, #391). No imports, so node tests can load it.

export const CAROUSEL_AUTO_MS = 6000;

/** Safe modulo: wraps any integer into 0..count-1; 0 when count is 0. */
export function wrapIndex(i: number, count: number): number {
  if (count <= 0) return 0;
  return ((i % count) + count) % count;
}

/**
 * Where scrollLeft settles for each slide under `snap-center`.
 * Slide i centres in the viewport, clamped to the scrollable range, so the
 * first and last slides land short of centre. `lefts` are slide offsets from
 * the track's scroll origin.
 */
export function snapTargets(
  lefts: number[],
  widths: number[],
  viewport: number,
  scrollWidth: number
): number[] {
  const max = Math.max(0, scrollWidth - viewport);
  return lefts.map((left, i) => {
    const raw = left - (viewport - (widths[i] ?? viewport)) / 2;
    return Math.min(max, Math.max(0, raw));
  });
}

/**
 * Index of the slide whose snap target is closest to scrollLeft (ties go to
 * the lower index; empty gives 0). At the very end of the track the last
 * slide wins, so its dot always lights.
 */
export function nearestSlideIndex(scrollLeft: number, targets: number[]): number {
  if (targets.length === 0) return 0;
  const last = targets.length - 1;
  if (scrollLeft >= targets[last] - 1) return last;
  let best = 0;
  let bestDist = Math.abs(scrollLeft - targets[0]);
  for (let i = 1; i < targets.length; i++) {
    const d = Math.abs(scrollLeft - targets[i]);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}

/** Auto-rotate runs only when enabled, not paused, visible, untouched and there is more than one slide. */
export function shouldAutoRotate(state: {
  enabled: boolean;
  paused: boolean;
  hidden: boolean;
  interacting: boolean;
  count: number;
}): boolean {
  return (
    state.enabled &&
    !state.paused &&
    !state.hidden &&
    !state.interacting &&
    state.count > 1
  );
}
