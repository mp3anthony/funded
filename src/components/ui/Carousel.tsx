"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pause, Play } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  CAROUSEL_AUTO_MS,
  nearestSlideIndex,
  shouldAutoRotate,
  snapTargets,
  wrapIndex,
} from "@/lib/carousel";

interface CarouselProps {
  /** Accessible name, e.g. "Household stats". */
  label: string;
  /** One child per slide. Null and false children are ignored. */
  children: ReactNode;
  /** Turn by itself, with a pause button. Off by default (swipe-only). */
  autoRotate?: boolean;
  intervalMs?: number;
  /** Slides take ~86% of the width so the next one peeks in. */
  peek?: boolean;
  className?: string;
}

const IDLE_MS = 200;

export default function Carousel({
  label,
  children,
  autoRotate = false,
  intervalMs = CAROUSEL_AUTO_MS,
  peek = false,
  className = "",
}: CarouselProps) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const reducedMotion = useReducedMotion();

  const trackRef = useRef<HTMLDivElement>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [focused, setFocused] = useState(false);

  // Clamp when slides disappear. Adjusted during render, guarded by equality.
  if (count > 0 && index > count - 1) {
    setIndex(count - 1);
  }

  const getTargets = useCallback((): number[] => {
    const track = trackRef.current;
    if (!track) return [];
    const trackLeft = track.getBoundingClientRect().left;
    const els = Array.from(track.children) as HTMLElement[];
    const lefts = els.map(
      (el) => el.getBoundingClientRect().left - trackLeft + track.scrollLeft
    );
    const widths = els.map((el) => el.getBoundingClientRect().width);
    return snapTargets(lefts, widths, track.clientWidth, track.scrollWidth);
  }, []);

  // Reduce Motion swaps instantly (auto) instead of sliding; the wrap from
  // last to first is always instant so it does not rewind through every slide.
  const goTo = useCallback(
    (i: number, instant = false) => {
      const track = trackRef.current;
      if (!track) return;
      const left = getTargets()[i];
      if (left === undefined) return;
      track.scrollTo({
        left,
        behavior: instant || reducedMotion ? "auto" : "smooth",
      });
    },
    [getTargets, reducedMotion]
  );

  // Active slide follows the scroll position (single source of truth).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const next = nearestSlideIndex(track.scrollLeft, getTargets());
      setIndex((cur) => (cur === next ? cur : next));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
      // iOS momentum can swallow pointerup: release the hold once scrolling idles.
      if (idleRef.current) clearTimeout(idleRef.current);
      idleRef.current = setTimeout(() => setInteracting(false), IDLE_MS);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [getTargets, count]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const running =
    shouldAutoRotate({ enabled: autoRotate, paused, hidden, interacting, count }) &&
    !focused;

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      const next = wrapIndex(index + 1, count);
      goTo(next, next === 0);
    }, intervalMs);
    return () => clearTimeout(timer);
  }, [running, index, count, intervalMs, goTo]);

  if (count === 0) return null;

  const showControls = count > 1;
  const hold = () => setInteracting(true);
  const release = () => setInteracting(false);

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      className={className}
      onFocus={(e) => {
        // Keyboard focus only: taps and clicks must not stop auto-rotate.
        let keyboard = false;
        try {
          keyboard = (e.target as HTMLElement).matches(":focus-visible");
        } catch {
          keyboard = false;
        }
        if (keyboard) setFocused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <div
        ref={trackRef}
        tabIndex={0}
        aria-label={`${label} slides`}
        aria-live={autoRotate && !paused ? "off" : "polite"}
        onPointerDown={hold}
        onTouchStart={hold}
        onPointerUp={release}
        onPointerCancel={release}
        onTouchEnd={release}
        onTouchCancel={release}
        className="scrollbar-none relative flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto overscroll-x-contain rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            className={`snap-center snap-always shrink-0 ${peek ? "w-[86%]" : "w-full"}`}
          >
            {slide}
          </div>
        ))}
      </div>

      {showControls && (
        <div className="mt-2 flex items-center">
          {/* Pause is first in DOM (tab) order, shown at the right via order. */}
          {autoRotate && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play carousel" : "Pause carousel"}
              className="press order-2 flex h-11 w-11 items-center justify-center rounded-full text-muted"
            >
              {paused ? (
                <Play className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pause className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
          <div className="order-1 flex flex-1 items-center justify-center">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className="press flex h-6 items-center px-1"
              >
                <span
                  className={`block h-1.5 rounded-full transition-[width,background-color] duration-(--duration-feedback) ease-(--ease-enter) motion-reduce:transition-none ${
                    i === index ? "w-[18px] bg-primary" : "w-1.5 bg-border-strong"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
