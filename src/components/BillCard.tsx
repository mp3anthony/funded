"use client";

import React, { useState } from "react";
import { useApp, type Bill, type BillSplit, type Member } from "@/context/AppContext";
import { convertAmount } from "@/lib/utils";
import BillDetailSheet from "./BillDetailSheet";
import AddBillSheet from "./AddBillSheet";
import RowPill from "./RowPill";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export interface BillCardProps {
  bill: Bill;
  splits?: BillSplit[];
  householdMembers: Member[];
  displayFrequency?: "weekly" | "fortnightly" | "monthly" | "yearly";
}

export default function BillCard({
  bill,
  splits = [],
  householdMembers,
  displayFrequency = "weekly",
}: BillCardProps) {
  const { deleteBill } = useApp();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const highlightBillId = searchParams ? searchParams.get("billId") : null;

  const [prevHighlightId, setPrevHighlightId] = useState<string | null>(null);

  if (highlightBillId !== prevHighlightId) {
    setPrevHighlightId(highlightBillId);
    if (highlightBillId && highlightBillId === bill.id.toString()) {
      setIsDetailOpen(true);
    }
  }

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    if (highlightBillId === bill.id.toString()) {
      const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
      params.delete("billId");
      const newQuery = params.toString();
      router.replace(`${pathname}${newQuery ? `?${newQuery}` : ""}`);
    }
  };
  // Determine assignee
  const assigneeSplit = splits.find((s) => s.is_assignee);
  const assigneeId = bill.assignee_id || (assigneeSplit?.member_id);
  const assignee = householdMembers.find((m) => String(m.id) === String(assigneeId));

  // Determine urgency
  const due = new Date(bill.dueDate);
  const today = new Date();
  const timeDiff = due.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  const isUrgent = daysDiff <= 3; // True if due in 3 days, today, or overdue

  // Numeric due date (DD/MM/YYYY) from the raw due_date; fall back to the display string.
  // String-split rather than new Date() to avoid any timezone shift on the day.
  const rawDue = bill.due_date;
  const dueDateDisplay =
    rawDue && /^\d{4}-\d{2}-\d{2}/.test(rawDue)
      ? (() => {
          const [y, m, d] = rawDue.slice(0, 10).split("-");
          return `${d}/${m}/${y}`;
        })()
      : bill.dueDate;

  // Payment-type pill (Auto-Pay / Manual) — mirrors BillDetailSheet's badge
  const isAutoPay = bill.payment_type?.toLowerCase() === "auto";
  const paymentTypeStr = isAutoPay ? "Auto-Pay" : "Manual";

  // Convert amount based on selected frequency
  const convertedAmount = convertAmount(bill.amount, bill.frequency || "monthly", displayFrequency);

  // Format currency beautifully
  const formattedAmount = convertedAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Calculate secondary label logic moved to BillDetailSheet
  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${bill.name}"?`)) {
      try {
        await deleteBill(bill.id);
        setIsDetailOpen(false);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        alert("Failed to delete bill: " + errMsg);
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setIsDetailOpen(true)}
        className="w-full text-left border-t border-border flex items-center gap-3 py-3 group hover:bg-surface/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset rounded-sm"
      >
      {/* Leading assignee chip — small identity cue at hairline-row scale */}
      {assignee && (
        <div
          className="shrink-0 flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-surface-elevated text-[11px] font-bold text-foreground border border-primary"
          title={`Assignee: ${assignee.name}`}
        >
          {assignee.avatar_url ? (
            <img
              src={assignee.avatar_url}
              alt={assignee.name}
              className="h-full w-full object-cover"
            />
          ) : (
            assignee.avatar || assignee.name.charAt(0).toUpperCase()
          )}
        </div>
      )}

      {/* Middle: name over due date */}
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-body font-semibold text-[15px] text-foreground truncate">
          {bill.name}
        </span>
        <span className="flex items-center gap-1.5 mt-0.5">
          <RowPill label={paymentTypeStr} emphasized={isAutoPay} />
          <span
            className={`font-mono text-[10px] uppercase font-medium tracking-wider transition-colors ${
              isUrgent ? "text-[#ff4500]" : "text-muted"
            }`}
          >
            DUE {dueDateDisplay}
          </span>
        </span>
      </div>

      {/* Right: amount over tap-for-more hint */}
      <div className="flex flex-col items-end shrink-0">
        <span className="font-mono font-extrabold text-primary tracking-tight text-lg">
          ${formattedAmount}
        </span>
        <span className="flex items-center gap-1 text-[9px] font-semibold text-muted/60 uppercase tracking-widest group-hover:text-primary transition-colors mt-0.5">
          Tap for more
          <span aria-hidden="true">›</span>
        </span>
      </div>
      </button>

      <BillDetailSheet
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        bill={bill}
        splits={splits}
        householdMembers={householdMembers}
        onEdit={() => {
          setIsDetailOpen(false);
          setIsEditOpen(true);
        }}
        onDelete={handleDelete}
      />

      <AddBillSheet
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        existingBill={bill}
        existingSplits={splits}
      />
    </>
  );
}
