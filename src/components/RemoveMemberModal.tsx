"use client";

import React, { useState, useMemo } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { type Member } from "@/types";
import Dialog, { DialogButton } from "@/components/ui/Dialog";

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  householdMembers: Member[];
}

export default function RemoveMemberModal({
  isOpen,
  onClose,
  member,
  householdMembers,
}: RemoveMemberModalProps) {
  const { bills, funds, paySchedules, billSplits, removeMember } = useApp();

  const [reassignBillsTo, setReassignBillsTo] = useState<string>("delete");
  const [reassignGoalsTo, setReassignGoalsTo] = useState<string>("delete");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter other members who can take over
  const otherMembers = useMemo(() => {
    if (!member) return [];
    return householdMembers.filter((m) => String(m.id) !== String(member.id));
  }, [member, householdMembers]);

  // Set default reassign target to the first available member if any
  React.useEffect(() => {
    if (otherMembers.length > 0) {
      setReassignBillsTo(String(otherMembers[0].id));
      setReassignGoalsTo(String(otherMembers[0].id));
    } else {
      setReassignBillsTo("delete");
      setReassignGoalsTo("delete");
    }
  }, [otherMembers]);

  // Memoize counts of affected items
  const { billsCount, goalsCount, schedulesCount } = useMemo(() => {
    if (!member) return { billsCount: 0, goalsCount: 0, schedulesCount: 0 };

    const bCount = billSplits.filter((s) => String(s.member_id) === String(member.id)).length;
    const gCount = funds.filter((f) => String(f.member_id) === String(member.id)).length;
    const sCount = paySchedules.filter((s) => String(s.member_id) === String(member.id)).length;

    return { billsCount: bCount, goalsCount: gCount, schedulesCount: sCount };
  }, [member, billSplits, funds, paySchedules]);

  if (!isOpen || !member) return null;

  async function handleRemove(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    setLoading(true);
    setError(null);

    const reassignBillsTarget = reassignBillsTo === "delete" ? undefined : reassignBillsTo;
    const reassignGoalsTarget = reassignGoalsTo === "delete" ? undefined : reassignGoalsTo;

    // Double confirmation if deletion of bills/goals is selected
    if (
      (reassignBillsTo === "delete" && billsCount > 0) ||
      (reassignGoalsTo === "delete" && goalsCount > 0)
    ) {
      const confirmText = `You are choosing to delete this member's ${
        reassignBillsTo === "delete" && billsCount > 0 ? "bill splits" : ""
      }${
        reassignGoalsTo === "delete" && goalsCount > 0
          ? (reassignBillsTo === "delete" && billsCount > 0 ? " and " : "") + "goals"
          : ""
      } permanently. Are you sure you want to proceed?`;
      
      if (!window.confirm(confirmText)) {
        setLoading(false);
        return;
      }
    }

    try {
      await removeMember(member.id, reassignBillsTarget, reassignGoalsTarget);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to remove member. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Remove Household Member"
      icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <DialogButton variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </DialogButton>
          <DialogButton
            variant="destructive"
            type="submit"
            form="remove-member-form"
            disabled={loading}
            className="flex items-center justify-center gap-1.5"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <Trash2 className="h-4 w-4" />
            Remove Member
          </DialogButton>
        </>
      }
    >
        <form id="remove-member-form" onSubmit={handleRemove} className="space-y-5 md:space-y-6">
            {error && (
              <div className="p-3.5 rounded-[2px] bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {error}
              </div>
            )}

            {/* Warning Message */}
            <div className="space-y-2">
              <p className="text-sm text-foreground font-body leading-relaxed">
                Removing <strong className="text-foreground">{member.name}</strong> will revoke their access to the household and require reassigning or deleting their active financial records.
              </p>
            </div>

            {/* Affected items breakdown */}
            <div className="p-4 rounded-[2px] bg-foreground/5 border border-border-strong space-y-3">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                Affected Financial Items
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-[2px] bg-foreground/5 text-center">
                  <span className="block text-2xl font-bold text-foreground">{billsCount}</span>
                  <span className="text-[9px] text-subtle uppercase tracking-wider">Bill Splits</span>
                </div>
                <div className="p-3 rounded-[2px] bg-foreground/5 text-center">
                  <span className="block text-2xl font-bold text-foreground">{goalsCount}</span>
                  <span className="text-[9px] text-subtle uppercase tracking-wider">Goals Owned</span>
                </div>
                <div className="p-3 rounded-[2px] bg-foreground/5 text-center">
                  <span className="block text-2xl font-bold text-foreground">{schedulesCount}</span>
                  <span className="text-[9px] text-subtle uppercase tracking-wider">Pay Schedules</span>
                </div>
              </div>
            </div>

            {/* Reassignments form */}
            {(billsCount > 0 || goalsCount > 0) && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                  Reassignment Configuration
                </h4>

                {/* Reassign Bills */}
                {billsCount > 0 && (
                  <div className="space-y-2">
                    <label
                      htmlFor="reassign-bills"
                      className="block text-xs font-bold text-muted"
                    >
                      Who should take over their Bill Splits?
                    </label>
                    <select
                      id="reassign-bills"
                      value={reassignBillsTo}
                      onChange={(e) => setReassignBillsTo(e.target.value)}
                      className="w-full px-4 py-3 rounded-[2px] bg-surface border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all cursor-pointer"
                    >
                      {otherMembers.length > 0 ? (
                        otherMembers.map((m) => (
                          <option key={m.id} value={String(m.id)}>
                            Reassign to {m.name} ({m.email})
                          </option>
                        ))
                      ) : (
                        <option value="delete" disabled>No other members available</option>
                      )}
                      <option value="delete" className="text-destructive">
                        Delete splits/assignments entirely (Destructive)
                      </option>
                    </select>
                  </div>
                )}

                {/* Reassign Goals */}
                {goalsCount > 0 && (
                  <div className="space-y-2">
                    <label
                      htmlFor="reassign-goals"
                      className="block text-xs font-bold text-muted"
                    >
                      Who should take over their Goals?
                    </label>
                    <select
                      id="reassign-goals"
                      value={reassignGoalsTo}
                      onChange={(e) => setReassignGoalsTo(e.target.value)}
                      className="w-full px-4 py-3 rounded-[2px] bg-surface border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all cursor-pointer"
                    >
                      {otherMembers.length > 0 ? (
                        otherMembers.map((m) => (
                          <option key={m.id} value={String(m.id)}>
                            Reassign to {m.name} ({m.email})
                          </option>
                        ))
                      ) : (
                        <option value="delete" disabled>No other members available</option>
                      )}
                      <option value="delete" className="text-destructive">
                        Delete goals entirely (Destructive)
                      </option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {billsCount === 0 && goalsCount === 0 && schedulesCount > 0 && (
              <p className="text-xs text-subtle leading-relaxed font-body">
                Only their pay schedules will be deleted. No goals or active bill splits are affected.
              </p>
            )}
        </form>
    </Dialog>
  );
}
