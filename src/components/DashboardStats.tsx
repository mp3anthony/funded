"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Carousel from "@/components/ui/Carousel";
import { useCountUp } from "@/hooks/useCountUp";
import { useDisplayFrequency } from "@/hooks/useDisplayFrequency";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useVerdictStats } from "@/hooks/useVerdict";
import type { FrequencyType } from "@/lib/frequencyPreference";
import type { StatSlide } from "@/lib/verdict";

const PER: Record<FrequencyType, string> = {
  weekly: "a week",
  fortnightly: "a fortnight",
  monthly: "a month",
  yearly: "a year",
};

const money = (n: number) =>
  `$${Math.abs(Math.round(n)).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function meaning(slide: StatSlide): string {
  const splits = slide.kind === "splits";
  if (slide.status === "unset") return "";
  if (slide.status === "short") return splits ? "uncovered" : "short";
  return splits ? "" : "left after bills";
}

function StatCard({ slide, per }: { slide: StatSlide; per: string }) {
  const reducedMotion = useReducedMotion();
  const counted = useCountUp(slide.big, 700);
  // Reduce Motion shows the final value at once; the count-up still tracks it.
  const shown = reducedMotion ? slide.big : counted;

  // The bar grows from empty on first show; a later change just slides to the new fraction.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const fill = armed ? slide.fill : 0;

  const allCovered = slide.status === "ok" && slide.kind === "splits";
  const big = slide.status === "unset" ? "—" : allCovered ? "All covered" : money(shown);
  const sentence =
    slide.status === "unset"
      ? `${slide.title} ${per}. ${slide.caption}`
      : allCovered
        ? `${slide.title} ${per}. All covered. ${slide.caption}.`
        : `${slide.title} ${per}. ${money(slide.big)} ${meaning(slide)}. ${slide.caption}.`;
  const barColour = slide.status === "short" ? "bg-destructive" : "bg-primary";

  return (
    <Card role="group" className="h-full p-4" aria-label={sentence}>
      <div aria-hidden="true">
        <p className="text-xs font-semibold text-muted">
          {slide.title} · {per}
        </p>
        <p
          className={`mt-1 font-body text-3xl font-bold tabular-nums leading-tight ${
            slide.status === "short" ? "text-destructive-ink" : slide.status === "unset" ? "text-muted" : "text-foreground"
          }`}
        >
          {big}
        </p>
        <p className="text-[13px] font-body text-muted">{meaning(slide)}</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border-strong">
          {slide.status !== "unset" && (
            <div
              className={`h-full rounded-full ${barColour} transition-[width] duration-(--duration-structural) ease-(--ease-enter) motion-reduce:transition-none`}
              style={{ width: `${Math.round(fill * 100)}%` }}
            />
          )}
        </div>
        <p className="mt-2 text-[13px] font-body text-muted">{slide.caption}</p>
      </div>
    </Card>
  );
}

/**
 * Dashboard stats carousel (R26, #413): pay against bills, and contributions (Joint Fund) or
 * splits (Direct Pay) against bills. Dollars follow the person's remembered Bills frequency;
 * the header verdict above stays weekly and decides each slide's colour.
 */
export default function DashboardStats() {
  const frequency = useDisplayFrequency();
  const stats = useVerdictStats(frequency ?? "weekly");
  if (frequency === null) return null;
  const per = PER[frequency];

  return (
    <Carousel label="Household stats" autoRotate>
      <StatCard slide={stats.income} per={per} />
      <StatCard slide={stats.cover} per={per} />
    </Carousel>
  );
}
