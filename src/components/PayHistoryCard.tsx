"use client";

import React, { useState } from "react";
import { Trash2, Calendar, FileText, Sparkles, CheckCircle2 } from "lucide-react";
import { useApp, type PayHistory } from "@/context/AppContext";

interface PayHistoryCardProps {
  history: PayHistory;
  onConfirmPending?: (history: PayHistory) => void;
  hideMemberInfo?: boolean;
}

export default function PayHistoryCard({ history, onConfirmPending, hideMemberInfo }: PayHistoryCardProps) {
  const { householdMembers, deletePayHistory, funds, contributionRules } = useApp();
  const [isDeleting, setIsDeleting] = useState(false);

  const isPending = history.status === "pending";

  // Find member name
  const member = householdMembers.find((m) => String(m.id) === String(history.member_id));
  const memberName = member ? member.name : "Unknown Member";

  // Find rule allocation details
  const rule = history.rule_id
    ? contributionRules.find((r) => String(r.id) === String(history.rule_id))
    : null;

  let allocationTargetName = "contribution";
  let allocationAmount = 0;
  if (rule) {
    if (rule.amount_type === "percentage") {
      const surplus = Number(history.amount) - Number(rule.threshold_amount);
      allocationAmount = surplus > 0 ? surplus * (Number(rule.amount_to_add) / 100) : 0;
    } else {
      allocationAmount = Number(rule.amount_to_add);
    }
    if (rule.action_type === "goal") {
      const goal = funds.find((g) => String(g.id) === String(rule.action_target_id));
      allocationTargetName = goal ? goal.name : "goal";
    }
  }

  // Format date
  let formattedDate = history.pay_date;
  try {
    const d = new Date(history.pay_date + "T00:00:00");
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      });
    }
  } catch (e) {
    console.error("Failed to format pay date:", history.pay_date);
  }

  // Format amount
  const formattedAmount = Number(history.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleDelete = async () => {
    if (confirm(`Delete this payment of $${formattedAmount} logged on ${formattedDate}?`)) {
      setIsDeleting(true);
      try {
        await deletePayHistory(history.id);
      } catch (err) {
        console.error("Failed to delete pay history entry:", err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleConfirm = () => {
    if (onConfirmPending) {
      onConfirmPending(history);
    }
  };

  return (
    <div
      className={`flex items-start justify-between gap-4 py-3 border-t ${
        isPending ? "border-accent/40" : "border-border"
      }`}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Top Row: Member & Amount */}
        {!hideMemberInfo ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="truncate font-body font-semibold text-[15px] text-foreground">{memberName}</span>
            </div>
            <span className="font-mono font-extrabold text-primary text-base whitespace-nowrap">
              ${formattedAmount}
            </span>
          </div>
        ) : (
          <div className="font-mono font-extrabold text-primary text-lg whitespace-nowrap">
            ${formattedAmount}
          </div>
        )}

        {/* Date & Status / automation-rule allocation row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted font-mono uppercase tracking-wider">
            <Calendar size={12} className="shrink-0" />
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isPending && (
              <span className="text-[10px] text-accent font-mono uppercase font-bold tracking-wider">
                Pending
              </span>
            )}

            {history.rule_id && rule && (
              <span className="flex items-center gap-1 text-[10px] text-primary font-mono uppercase font-bold tracking-wider shrink-0">
                <Sparkles size={10} className="shrink-0 text-primary" />
                +${allocationAmount.toFixed(2)} to {allocationTargetName}
              </span>
            )}
          </div>
        </div>

        {/* Notes (Conditional) */}
        {history.notes && (
          <div className="flex items-start gap-1.5 text-xs text-subtle pt-0.5">
            <FileText size={13} className="mt-0.5 shrink-0 text-muted" />
            <span className="break-words font-body">{history.notes}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="shrink-0 flex items-center gap-1">
        {isPending && (
          <button
            onClick={handleConfirm}
            className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all active:scale-95 cursor-pointer"
            title="Confirm this pay entry"
          >
            <CheckCircle2 size={16} />
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 rounded-lg text-muted hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Delete history entry"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
