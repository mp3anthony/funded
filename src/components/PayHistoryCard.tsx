"use client";

import React, { useState } from "react";
import { Trash2, Calendar, FileText, NotebookPen, Sparkles, CheckCircle2 } from "lucide-react";
import { useApp, type PayHistory } from "@/context/AppContext";
import IconCircle from "@/components/ui/IconCircle";

interface PayHistoryCardProps {
  history: PayHistory;
  onConfirmPending?: (history: PayHistory) => void;
  /** Opens the Pay note pop-up for this row (one pop-up for the whole list, F12 #476). */
  onOpenNote?: (history: PayHistory) => void;
  hideMemberInfo?: boolean;
  /** The member's line colour on the history chart (R22): a dot before their name. */
  dotColour?: string;
}

export default function PayHistoryCard({ history, onConfirmPending, onOpenNote, hideMemberInfo, dotColour }: PayHistoryCardProps) {
  const { householdMembers, deletePayHistory, funds, contributionRules, showToast } = useApp();
  const [isDeleting, setIsDeleting] = useState(false);

  const isPending = history.status === "pending";
  const isBonus = history.is_bonus === true;
  const hasNote = Boolean(history.notes && history.notes.trim() !== "");

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

  // Format amount. A Pending pay can have no amount yet (R19, #406).
  const hasAmount = history.amount !== null && history.amount !== undefined;
  const formattedAmount = Number(history.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const amountLabel = hasAmount ? `$${formattedAmount}` : "Amount needed";
  const amountClass = hasAmount ? "text-primary-ink" : "text-muted";

  const handleDelete = async () => {
    const question = isBonus
      ? `Delete this bonus of ${formattedAmount} from ${formattedDate}?`
      : hasAmount
      ? `Delete this payment of $${formattedAmount} logged on ${formattedDate}? The next pay date won't change.`
      : `Delete this pending pay from ${formattedDate}? The next pay date won't change.`;
    if (confirm(question)) {
      setIsDeleting(true);
      try {
        await deletePayHistory(history.id);
        showToast({ message: "Pay deleted" });
      } catch (err) {
        console.error("Failed to delete pay history entry:", err);
        showToast({ message: "Couldn't delete that pay. Try again." });
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
            <div className="flex min-w-0 items-center gap-2">
              {dotColour && (
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dotColour }} />
              )}
              <span className="truncate font-body font-semibold text-[15px] text-foreground">{memberName}</span>
              {isBonus && <BonusTag />}
            </div>
            <span className={`font-bold ${amountClass} text-base whitespace-nowrap`}>
              {amountLabel}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`font-bold ${amountClass} text-lg whitespace-nowrap`}>{amountLabel}</span>
            {isBonus && <BonusTag />}
          </div>
        )}

        {/* Date & Status / automation-rule allocation row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted uppercase tracking-wider">
            <Calendar size={12} className="shrink-0" />
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isPending && (
              <span className="text-[10px] text-accent-ink uppercase font-bold tracking-wider">
                Pending
              </span>
            )}

            {history.rule_id && rule && (
              <span className="flex items-center gap-1 text-[10px] text-primary-ink uppercase font-bold tracking-wider shrink-0">
                <Sparkles size={10} className="shrink-0 text-primary-ink" />
                +${allocationAmount.toFixed(2)} to {allocationTargetName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="shrink-0 flex items-center gap-1">
        {/* The note lives in a pop-up (F12, #476): a filled icon when there is one, a quieter one to add. */}
        <IconCircle
          label={hasNote ? "View note" : "Add note"}
          onClick={() => onOpenNote?.(history)}
          className={hasNote ? undefined : "opacity-60"}
        >
          {hasNote ? <FileText size={16} aria-hidden="true" /> : <NotebookPen size={16} aria-hidden="true" />}
        </IconCircle>
        {isPending && (
          <button
            onClick={handleConfirm}
            className="p-2 rounded-lg text-primary-ink active:bg-primary/10 transition-all active:scale-95 cursor-pointer"
            title="Confirm this pay entry"
          >
            <CheckCircle2 size={16} />
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 rounded-lg text-muted hover:text-destructive-ink hover:bg-destructive/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Delete history entry"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

/** Small tag on a bonus payment row (F13, #477). */
function BonusTag() {
  return (
    <span className="shrink-0 rounded-full border border-primary/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-ink">
      Bonus
    </span>
  );
}
