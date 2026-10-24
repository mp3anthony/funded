import React from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** 0 to 100 (clamped). */
  percent: number;
  /** Ring diameter in px. */
  size?: number;
  /** Stroke width in px. */
  stroke?: number;
  /** Colour class for the progress arc (a `text-*` class; the arc uses currentColor). */
  className?: string;
  /** Centre content (an icon). */
  children?: React.ReactNode;
}

/**
 * A round progress ring (R17, #404). Decorative: the row that holds it says the
 * numbers in words, so the ring is hidden from screen readers. The arc grows
 * with the shared structural duration and enter easing.
 */
export default function ProgressRing({
  percent,
  size = 44,
  stroke = 4,
  className,
  children,
}: ProgressRingProps) {
  const clamped = Math.min(Math.max(Number.isFinite(percent) ? percent : 0, 0), 100);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <span
      aria-hidden="true"
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-border-strong"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className={cn(
            "transition-[stroke-dashoffset] duration-(--duration-structural) ease-(--ease-enter)",
            className
          )}
        />
      </svg>
      {children}
    </span>
  );
}
