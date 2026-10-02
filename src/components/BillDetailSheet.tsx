"use client";

import { Calendar, AlertTriangle } from "lucide-react";
import { useApp, type Bill, type BillSplit, type Member } from "@/context/AppContext";
import Dialog, { DialogSection } from "@/components/ui/Dialog";
import { todayInZone } from "@/lib/notifications/timezone";
import { canUndoPayment, paidForLabel } from "@/lib/billCycle";

interface BillDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  splits: BillSplit[];
  householdMembers: Member[];
  onEdit: () => void;
  onDelete: () => void;
}

export default function BillDetailSheet({
  isOpen,
  onClose,
  bill,
  splits,
  householdMembers,
  onEdit,
  onDelete,
}: BillDetailSheetProps) {
  const { isJointFund, markAsPaid, markAsUnpaid, undoPayment, togglePauseBill, householdTimezone } = useApp();

  if (!isOpen || !bill) return null;

  // Find assignee
  const assigneeSplit = splits.find((s) => s.is_assignee);
  const assigneeId = bill.assignee_id || (assigneeSplit?.member_id);
  const assignee = householdMembers.find((m) => String(m.id) === String(assigneeId));

  // Auto/Manual formatted text
  const isAutoPay = bill.payment_type?.toLowerCase() === "auto";
  const paymentTypeStr = isAutoPay ? "Auto-Pay" : "Manual";

  // Format amount
  const formattedAmount = Number(bill.amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // #211: month last paid for (from the due date while Paid, else the record).
  const todayYmd = todayInZone(householdTimezone || "Australia/Sydney");
  const paidForYmd = bill.status === "Paid" ? bill.due_date : bill.last_paid_for;
  const paidLabel = paidForLabel(paidForYmd, todayYmd);
  const showUndoPayment =
    !isAutoPay &&
    canUndoPayment({
      status: bill.status,
      is_recurring: bill.is_recurring,
      is_paused: bill.is_paused,
      due_date: bill.due_date,
      frequency: bill.frequency,
      payment_type: bill.payment_type,
      last_paid_for: bill.last_paid_for,
      invoice_date: bill.invoice_date,
    });

  function handleUndoPayment() {
    if (!bill || !bill.last_paid_for) return;
    const paidMonth = new Date(bill.last_paid_for + "T00:00:00").toLocaleDateString("en-US", { month: "long" });
    const backDate = new Date(bill.last_paid_for + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    const message =
      bill.last_paid_for < todayYmd
        ? `Undo the ${paidMonth} payment? This bill goes back to being due ${backDate}. That date has passed, so it will show as Overdue and overdue reminders will start again.`
        : `Undo the ${paidMonth} payment? This bill goes back to being due today.`;
    if (!window.confirm(message)) return;
    void undoPayment(bill);
    onClose();
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Bill Details"
      footer={
        <div className="w-full flex flex-col space-y-3">
          {/* #187: autopay bills pay themselves — no Paid/Unpaid action. */}
          {isAutoPay ? null : bill.status === "Paid" ? (
            <button
              onClick={() => {
                markAsUnpaid(bill);
                onClose();
              }}
              className="w-full rounded-[2px] py-3.5 bg-accent/20 text-accent border border-accent/30 font-heading font-bold uppercase tracking-wider text-xs hover:bg-accent hover:text-foreground transition-all active:scale-[0.98] cursor-pointer"
            >
              Mark as Unpaid
            </button>
          ) : (
            <button
              onClick={() => {
                markAsPaid(bill);
                onClose();
              }}
              className="w-full rounded-[2px] py-3.5 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-heading font-bold uppercase tracking-wider text-xs hover:bg-emerald-500 hover:text-foreground transition-all active:scale-[0.98] cursor-pointer"
            >
              Mark as Paid
            </button>
          )}

          <div className="flex space-x-2 w-full">
            <button
              onClick={onDelete}
              className="flex-1 rounded-[2px] py-3 bg-destructive/15 text-destructive border border-destructive/20 font-heading font-bold uppercase tracking-wider text-[10px] hover:bg-destructive hover:text-foreground transition-all active:scale-[0.98] cursor-pointer"
            >
              Delete
            </button>
            <button
              onClick={onEdit}
              className="flex-1 rounded-[2px] py-3 bg-primary text-primary-fg font-heading font-bold uppercase tracking-wider text-[10px] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              Edit
            </button>
            {bill.is_recurring && (
              <button
                onClick={() => {
                  togglePauseBill(bill.id, !bill.is_paused);
                }}
                className="flex-1 rounded-[2px] py-3 bg-surface-elevated text-foreground border border-border font-heading font-bold uppercase tracking-wider text-[10px] hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer"
              >
                {bill.is_paused ? "Resume" : "Pause"}
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* Content Body */}
      <div className="space-y-6">

          {/* Bill Title, Badges & Amount */}
          <div className="flex flex-col space-y-4">
            
            {/* Title */}
            <h3 className="font-heading font-bold text-3xl text-foreground tracking-wide break-words">
              {bill.name}
            </h3>

            {/* Badges Section */}
            <div className="flex flex-wrap items-center gap-2">
              <span 
                className={`rounded-full px-3 py-1 text-[10px] font-heading font-bold uppercase tracking-widest ${
                  isAutoPay 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "bg-surface-elevated text-muted border border-border"
                }`}
              >
                {paymentTypeStr}
              </span>
              <span
                className="rounded-full px-3 py-1 text-[10px] font-heading font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20"
              >
                {bill.category || "Other"}
              </span>
            </div>

            {/* Amount */}
            <div className="flex flex-col items-start pt-2">
              <span className="text-4xl font-heading font-extrabold text-foreground tracking-tight">
                ${formattedAmount}
              </span>
              <span className="text-sm text-muted font-mono mt-1">
                (originally ${formattedAmount} {bill.frequency?.toLowerCase() || 'monthly'})
              </span>
            </div>
          </div>

          {/* Dates & Assignee Row Grid */}
          <div className="grid grid-cols-2 gap-4 border-t border-b border-border py-4 font-mono text-xs">
            <div className="space-y-1">
              <span className="text-subtle uppercase font-semibold">Due Date</span>
              <div className="flex items-center space-x-1.5 text-foreground">
                <Calendar size={14} className="text-muted animate-pulse" />
                <span>{bill.dueDate}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-subtle uppercase font-semibold">Invoice Date</span>
              <div className="flex items-center space-x-1.5 text-foreground">
                <Calendar size={14} className="text-muted" />
                <span>{bill.invoice_date ? new Date(bill.invoice_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" }) : "N/A"}</span>
              </div>
            </div>

            <div className="col-span-2 space-y-1">
              <span className="text-subtle uppercase font-semibold">Assignee (Payer)</span>
              <div className="flex items-center space-x-2 text-foreground">
                <div className="h-6 w-6 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-bold text-[10px]">
                  {assignee?.avatar || "P"}
                </div>
                <span className="text-sm font-semibold">{assignee?.name || "Unassigned"}</span>
              </div>
            </div>
          </div>

          {/* Splits Breakdown */}
          <div className="space-y-3">
            <DialogSection label="Paid By" />

            {splits.length === 0 ? (
              <div className="flex items-center space-x-2.5 p-3.5 bg-surface-raised rounded-[2px] border border-border">
                {isJointFund ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                    <p className="text-xs text-muted font-mono">Paid directly from the household Joint Fund.</p>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={15} className="text-muted shrink-0" />
                    <p className="text-xs text-muted font-mono">No splits configured. Assignee pays 100%.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {splits.map((split) => {
                  const member = householdMembers.find((m) => String(m.id) === String(split.member_id));
                  const splitPercent = bill.amount > 0 ? Math.round((split.amount / bill.amount) * 100) : 0;
                  
                  return (
                    <div 
                      key={split.id}
                      className={`flex items-center justify-between p-3 rounded-[2px] bg-surface-raised border border-border ${
                        split.is_assignee ? "border-l-2 border-l-primary" : ""
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 rounded-full bg-surface-elevated flex items-center justify-center font-bold text-[10px]">
                          {member?.avatar || "M"}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground font-semibold">
                            {member?.name || "Unknown"}
                          </span>
                          {split.is_assignee && (
                            <span className="text-[9px] font-heading font-semibold text-primary uppercase">
                              Assignee
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-sm font-bold text-foreground font-mono">
                          ${Number(split.amount).toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-muted font-mono">
                          {splitPercent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {paidLabel && (
              <p className="text-xs text-muted font-mono">{paidLabel}</p>
            )}

            {showUndoPayment && (
              <button
                type="button"
                onClick={handleUndoPayment}
                className="min-h-[44px] w-full rounded-[2px] px-4 py-2.5 bg-surface-elevated text-foreground border border-border font-heading font-bold uppercase tracking-wider text-[10px] hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer"
              >
                Undo payment
              </button>
            )}
          </div>

          {/* Notes Section */}
          {bill.notes && (
            <div className="space-y-2 pt-2">
              <DialogSection label="Notes" />
              <p className="text-sm text-muted bg-surface p-3 rounded-[2px] border border-border-strong font-mono leading-relaxed whitespace-pre-wrap">
                {bill.notes}
              </p>
            </div>
          )}

      </div>
    </Dialog>
  );
}
