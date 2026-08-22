"use client";

import { Calendar, Clock } from "lucide-react";
import { useApp, type PaySchedule, type Member } from "@/context/AppContext";
import Dialog from "@/components/ui/Dialog";

interface PayScheduleDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  paySchedule: PaySchedule | null;
  householdMembers: Member[];
  onEdit: () => void;
  onDelete: () => void;
}

export default function PayScheduleDetailSheet({
  isOpen,
  onClose,
  paySchedule,
  householdMembers,
  onEdit,
  onDelete,
}: PayScheduleDetailSheetProps) {
  const { isJointFund, householdContributions } = useApp();

  if (!isOpen || !paySchedule) return null;

  const member = householdMembers.find((m) => String(m.id) === String(paySchedule.member_id));
  const memberName = member ? member.name : "Unknown Member";

  const contribution = isJointFund && member
    ? householdContributions.find((c) => String(c.member_id) === String(member.id))
    : null;

  const formattedAmount = paySchedule.is_fixed_amount && paySchedule.amount
    ? `$${Number(paySchedule.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "Variable";

  // Format Next Pay Date
  let formattedNextPayDate = paySchedule.next_pay_date;
  try {
    const d = new Date(paySchedule.next_pay_date + "T00:00:00");
    if (!isNaN(d.getTime())) {
      formattedNextPayDate = d.toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric",
      });
    }
  } catch (e) {
    console.error("Failed to format next pay date:", paySchedule.next_pay_date);
  }

  // Format Created At
  let formattedCreatedAt = "N/A";
  if (paySchedule.created_at) {
    try {
      const d = new Date(paySchedule.created_at);
      if (!isNaN(d.getTime())) {
        formattedCreatedAt = d.toLocaleDateString("en-US", {
          month: "long",
          day: "2-digit",
          year: "numeric",
        });
      }
    } catch (e) {
      console.error("Failed to format created_at date:", paySchedule.created_at);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Schedule Details"
      footer={
        <>
          <button
            onClick={onDelete}
            className="flex-1 py-3 bg-destructive/15 text-destructive border border-destructive/20 rounded-[2px] font-heading font-bold uppercase tracking-wider text-xs hover:bg-destructive hover:text-foreground transition-all active:scale-[0.98] cursor-pointer"
          >
            Delete
          </button>
          <button
            onClick={onEdit}
            className="flex-1 py-3 bg-primary text-primary-fg rounded-[2px] font-heading font-bold uppercase tracking-wider text-xs hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            Edit Schedule
          </button>
        </>
      }
    >
      {/* Content Body */}
      <div className="space-y-5">

          {/* Member Name & Frequency */}
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-xl text-foreground truncate pr-4">
                <span>{memberName}</span>
              </h3>
              <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-heading font-bold uppercase tracking-wider bg-white/5 text-muted border border-border">
                {paySchedule.frequency === 'fortnightly' ? 'fortnightly' : paySchedule.frequency}
              </span>
            </div>
            <div className="flex items-baseline mt-2 text-2xl font-heading font-extrabold text-foreground">
              {formattedAmount}
              {paySchedule.is_fixed_amount && (
                <span className="text-xs font-normal text-muted font-mono ml-2">
                  fixed per payday
                </span>
              )}
            </div>
          </div>

          {/* Details Info Grid */}
          <div className="grid grid-cols-2 gap-4 border-t border-border-strong pt-5 font-mono text-xs">
            <div className="space-y-1">
              <span className="text-subtle uppercase font-semibold">Next Pay Date</span>
              <div className="flex items-center space-x-1.5 text-foreground">
                <Calendar size={13} className="text-muted" />
                <span>{formattedNextPayDate}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-subtle uppercase font-semibold">Created Date</span>
              <div className="flex items-center space-x-1.5 text-foreground">
                <Clock size={13} className="text-muted" />
                <span>{formattedCreatedAt}</span>
              </div>
            </div>
          </div>

          {contribution && (
            <div className="mt-4 p-4 rounded-[2px] bg-primary/5 border border-primary/10 flex flex-col space-y-1">
              <span className="text-muted uppercase text-xs font-semibold">Expected Contribution</span>
              <span className="text-primary font-bold text-lg font-heading tracking-tight">
                ${Number(contribution.amount).toFixed(2)} <span className="text-sm font-normal font-mono text-muted tracking-normal">per {contribution.frequency}</span>
              </span>
            </div>
          )}

      </div>
    </Dialog>
  );
}
