"use client";

import React from "react";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import { amountLabel } from "@/lib/addPayFlow";
import { payLine, rowActionLabel, type NeedsYouRow } from "@/lib/needsYou";

interface NeedsYouStripProps {
  rows: NeedsYouRow[];
  memberName: (memberId: string) => string;
  onOpen: (row: NeedsYouRow) => void;
}

/**
 * The "Needs you" strip at the top of Payday (R20, #407): pays whose day has
 * come and Pending pays, oldest first. Shows nothing when there is nothing to do.
 */
export default function NeedsYouStrip({ rows, memberName, onOpen }: NeedsYouStripProps) {
  if (rows.length === 0) return null;

  return (
    <section aria-label="Needs you">
      <SectionHeader title="Needs you" count={rows.length} />
      <ul className="flex flex-col">
        {rows.map((row) => {
          const name = memberName(row.memberId);
          return (
            <li key={row.key} className="flex items-center gap-3 border-t border-border py-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-body text-[15px] font-semibold text-foreground">
                  {name}
                </span>
                <span className="truncate text-xs text-muted">
                  {payLine(row.frequency, row.payDate)}
                </span>
                {row.amount !== null ? (
                  <span className="text-sm font-bold text-primary">{amountLabel(row.amount)}</span>
                ) : (
                  <span className="text-sm text-muted">Amount needed</span>
                )}
              </div>
              <Button
                className="shrink-0 px-5"
                aria-label={`${rowActionLabel(row.kind)}, ${name}`}
                onClick={() => onOpen(row)}
              >
                {rowActionLabel(row.kind)}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
