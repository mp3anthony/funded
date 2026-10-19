"use client";

import React from "react";
import { useApp } from "@/context/AppContext";

export default function HealthScore() {
  const { bills } = useApp();

  const totalBillsCount = bills.length;
  const paidBillsCount = bills.filter((b) => b.status === "Paid").length;
  const score = totalBillsCount === 0 ? 100 : Math.round((paidBillsCount / totalBillsCount) * 100);

  // Tier and Color logic
  let tier = "Excellent";
  let color = "#c8ff00"; // Lime Green

  if (score >= 90) {
    tier = "Excellent";
    color = "#c8ff00";
  } else if (score >= 70) {
    tier = "Good";
    color = "#facc15";
  } else if (score >= 50) {
    tier = "Warning";
    color = "#ff4500";
  } else {
    tier = "Critical";
    color = "#ef4444";
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
      {/* Top Row: Title */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-subtle">
          Household Health Score
        </span>
        <span 
          style={{ color }}
          className="text-xs font-bold uppercase tracking-wider transition-colors duration-300"
        >
          {tier}
        </span>
      </div>

      {/* Middle Row: Score Number & Label */}
      <div className="flex items-baseline space-x-2">
        <span 
          style={{ color }}
          className="text-5xl font-bold tracking-tighter transition-colors duration-300"
        >
          {score}
        </span>
        <span className="text-xs text-muted">/ 100</span>
      </div>

      {/* Bottom Row: Progress Bar */}
      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
          <div 
            style={{ 
              width: `${score}%`,
              backgroundColor: color 
            }}
            className="h-full rounded-full transition-all duration-500 ease-out"
          />
        </div>
        <div className="flex justify-between text-[9px] text-muted">
          <span>0</span>
          <span>{totalBillsCount === 0 ? "No bills configured" : `${paidBillsCount} of ${totalBillsCount} bills paid`}</span>
          <span>100</span>
        </div>
      </div>
    </div>
  );
}
