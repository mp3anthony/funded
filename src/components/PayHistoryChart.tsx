"use client";

import React from "react";
import {
  axisLabel,
  chartDomain,
  domainDate,
  shortDate,
  xFraction,
  type MemberSeries,
} from "@/lib/payChart";

interface PayHistoryChartProps {
  /** One series per ticked member, in member order. */
  series: MemberSeries[];
  /** Line colour for each series (same order). */
  colours: string[];
  /** Name of each series (same order), for the screen-reader summary. */
  names: string[];
  /** First day of the period, or null for All. */
  start: string | null;
  todayYmd: string;
}

const W = 320;
const H = 168;
const PAD = { left: 40, right: 14, top: 10, bottom: 26 };

/**
 * Pay per cycle, one coloured line per ticked member (R22, #409). Plain SVG, no
 * chart library. With one member a dashed line marks their average. The lines
 * draw in when the picture changes (the page's Reduce Motion rule shows them
 * at once). The list below carries the same numbers in words, so the picture
 * is a labelled image rather than a table. Rules live in `lib/payChart.ts`.
 */
export default function PayHistoryChart({ series, colours, names, start, todayYmd }: PayHistoryChartProps) {
  const domain = chartDomain(series, start, todayYmd);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (ymd: string) => PAD.left + xFraction(ymd, domain) * innerW;
  const y = (amount: number) => PAD.top + (1 - amount / domain.yTop) * innerH;

  const single = series.length === 1 ? series[0] : null;
  const average = single?.average ?? null;

  const description = series
    .map((s, i) => `${names[i]}: ${s.points.length} ${s.points.length === 1 ? "pay" : "pays"}`)
    .join(", ");
  // A new picture (other people or period) remounts the lines so they draw in again.
  const drawKey = `${start ?? "all"}|${series.map((s) => s.memberId).join(",")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Pay per cycle. ${description}.`}
      className="block w-full h-auto"
    >
      {/* Gridlines and y labels */}
      {domain.ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--color-border-strong)"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 6}
            y={y(t) + 3.5}
            textAnchor="end"
            fontSize={10}
            fill="var(--color-subtle)"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {axisLabel(t)}
          </text>
        </g>
      ))}

      {/* x axis ends */}
      <text x={PAD.left} y={H - 8} textAnchor="start" fontSize={10} fill="var(--color-subtle)">
        {shortDate(domainDate(domain.minDay))}
      </text>
      <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize={10} fill="var(--color-subtle)">
        {shortDate(domainDate(domain.maxDay))}
      </text>

      {/* Average (one member) */}
      {average !== null && (
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(average)}
          y2={y(average)}
          stroke="var(--color-muted)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      )}

      <g key={drawKey}>
        {series.map((s, i) => {
          if (s.points.length === 0) return null;
          const d = s.points.map((p, j) => `${j === 0 ? "M" : "L"}${x(p.date).toFixed(1)} ${y(p.amount).toFixed(1)}`).join(" ");
          return (
            <g key={s.memberId}>
              {s.points.length > 1 && (
                <path
                  d={d}
                  pathLength={1}
                  fill="none"
                  stroke={colours[i]}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="chart-line-draw"
                />
              )}
              {s.points.map((p) => (
                <circle
                  key={p.id}
                  cx={x(p.date)}
                  cy={y(p.amount)}
                  r={3.5}
                  fill={colours[i]}
                  stroke="var(--color-surface)"
                  strokeWidth={1.5}
                  className="chart-dot-in"
                />
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
