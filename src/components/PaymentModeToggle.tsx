"use client";

import React from "react";
import { Info, Wallet, Building2 } from "lucide-react";

interface PaymentModeToggleProps {
  currentMode: boolean; // false = Direct Pay, true = Joint Fund
  onModeChange: (mode: boolean) => void;
  compact?: boolean;
}

export default function PaymentModeToggle({ currentMode, onModeChange, compact = false }: PaymentModeToggleProps) {
  if (compact) {
    return (
      <div className="relative w-full sm:w-64">
        <select
          value={currentMode ? "joint" : "direct"}
          onChange={(e) => onModeChange(e.target.value === "joint")}
          className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground focus:border-primary focus:outline-none appearance-none cursor-pointer pr-8 capitalize tracking-wider"
        >
          <option value="direct">Direct Pay</option>
          <option value="joint">Joint Fund</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
          <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 w-full">
      <div className="flex flex-col space-y-2">
        <h3 className="font-bold text-lg text-foreground text-center sm:text-left">
          Does your household use a joint account?
        </h3>
        <p className="text-xs text-muted text-center sm:text-left">
          This determines how bill splits are settled in the household.
        </p>
      </div>

      <div className="relative w-full">
        <select
          value={currentMode ? "joint" : "direct"}
          onChange={(e) => onModeChange(e.target.value === "joint")}
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 md:py-3 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all appearance-none text-sm font-semibold cursor-pointer pr-10"
        >
          <option value="direct">Direct Pay (Transfer directly per bill split)</option>
          <option value="joint">Joint Fund (Shared household bank account)</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      <div className="flex items-start space-x-2 p-3 bg-surface border border-border rounded-xl">
        <Info className="h-4 w-4 text-subtle shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted leading-normal">
          <strong>Tip:</strong> Direct Pay is great for houses where roommates split individual transfers. Joint Fund is ideal for couples or families who share a bank account.
        </p>
      </div>
    </div>
  );
}
