"use client";

import React, { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { type Member } from "@/types";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Field from "@/components/ui/Field";
import Select from "@/components/ui/Select";
import { useSheetSave } from "@/hooks/useSheetSave";
import { primaryPillLabel } from "@/lib/sheetSave";

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
  const { funds, paySchedules, billSplits, removeMember } = useApp();

  const [reassignBillsTo, setReassignBillsTo] = useState<string>("delete");
  const [reassignGoalsTo, setReassignGoalsTo] = useState<string>("delete");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Shared save behaviour (R13): "Removing…" lock, red line + "Try again", toast.
  const { status, error, run, reset } = useSheetSave({
    onSuccess: onClose,
    successToast: "Member removed",
    errorMessage: "Failed to remove member. Please try again.",
    showThrownMessage: true,
  });
  const saving = status === "saving";

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

  // Clear any stale red line / "Try again" label when the pop-up opens or the member changes.
  React.useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, member, reset]);

  // Memoize counts of affected items
  const { billsCount, goalsCount, schedulesCount } = useMemo(() => {
    if (!member) return { billsCount: 0, goalsCount: 0, schedulesCount: 0 };

    const bCount = billSplits.filter((s) => String(s.member_id) === String(member.id)).length;
    const gCount = funds.filter((f) => String(f.member_id) === String(member.id)).length;
    const sCount = paySchedules.filter((s) => String(s.member_id) === String(member.id)).length;

    return { billsCount: bCount, goalsCount: gCount, schedulesCount: sCount };
  }, [member, billSplits, funds, paySchedules]);

  if (!isOpen || !member) return null;

  const needsDeleteConfirm =
    (reassignBillsTo === "delete" && billsCount > 0) ||
    (reassignGoalsTo === "delete" && goalsCount > 0);

  const confirmText = `You are choosing to delete this member's ${
    reassignBillsTo === "delete" && billsCount > 0 ? "bill splits" : ""
  }${
    reassignGoalsTo === "delete" && goalsCount > 0
      ? (reassignBillsTo === "delete" && billsCount > 0 ? " and " : "") + "goals"
      : ""
  } permanently. Are you sure you want to proceed?`;

  async function doRemove() {
    if (!member) return;
    const reassignBillsTarget = reassignBillsTo === "delete" ? undefined : reassignBillsTo;
    const reassignGoalsTarget = reassignGoalsTo === "delete" ? undefined : reassignGoalsTo;
    await removeMember(member.id, reassignBillsTarget, reassignGoalsTarget);
  }

  function handleRemove(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    // Double confirmation if deletion of bills/goals is selected
    if (needsDeleteConfirm) {
      setConfirmOpen(true);
      return;
    }
    run(doRemove);
  }

  return (
    <>
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Remove household member"
      icon={<AlertTriangle className="h-5 w-5 text-destructive-ink" />}
      maxWidthClass="max-w-lg"
      busy={saving || confirmOpen}
      error={error}
      footer={
        <>
          <DialogButton variant="ghost" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </DialogButton>
          <DialogButton
            variant="destructive"
            type="submit"
            form="remove-member-form"
            disabled={saving}
          >
            {saving ? "Removing…" : primaryPillLabel(status, "Remove member")}
          </DialogButton>
        </>
      }
    >
        <form id="remove-member-form" onSubmit={handleRemove} className="space-y-5 md:space-y-6">
            {/* Warning Message */}
            <div className="space-y-2">
              <p className="text-sm text-foreground font-body leading-relaxed">
                Removing <strong className="text-foreground">{member.name}</strong> will revoke their access to the household and require reassigning or deleting their active financial records.
              </p>
            </div>

            {/* Affected items breakdown */}
            <div className="p-4 rounded-card bg-foreground/5 border border-border-strong space-y-3">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                Affected financial items
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-card bg-foreground/5 text-center">
                  <span className="block text-2xl font-bold text-foreground">{billsCount}</span>
                  <span className="text-[9px] text-subtle uppercase tracking-wider">Bill splits</span>
                </div>
                <div className="p-3 rounded-card bg-foreground/5 text-center">
                  <span className="block text-2xl font-bold text-foreground">{goalsCount}</span>
                  <span className="text-[9px] text-subtle uppercase tracking-wider">Goals owned</span>
                </div>
                <div className="p-3 rounded-card bg-foreground/5 text-center">
                  <span className="block text-2xl font-bold text-foreground">{schedulesCount}</span>
                  <span className="text-[9px] text-subtle uppercase tracking-wider">Pay schedules</span>
                </div>
              </div>
            </div>

            {/* Reassignments form */}
            {(billsCount > 0 || goalsCount > 0) && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                  Reassignment
                </h4>

                {/* Reassign Bills */}
                {billsCount > 0 && (
                  <Field id="reassign-bills" label="Who should take over their bill splits?">
                    <Select
                      id="reassign-bills"
                      value={reassignBillsTo}
                      onChange={(e) => setReassignBillsTo(e.target.value)}
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
                      <option value="delete">
                        Delete splits/assignments entirely (Destructive)
                      </option>
                    </Select>
                  </Field>
                )}

                {/* Reassign Goals */}
                {goalsCount > 0 && (
                  <Field id="reassign-goals" label="Who should take over their goals?">
                    <Select
                      id="reassign-goals"
                      value={reassignGoalsTo}
                      onChange={(e) => setReassignGoalsTo(e.target.value)}
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
                      <option value="delete">
                        Delete goals entirely (Destructive)
                      </option>
                    </Select>
                  </Field>
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

    {/* Second question before deleting bills or goals for good */}
    <ConfirmDialog
      open={confirmOpen}
      title="Delete for good?"
      message={confirmText}
      confirmLabel="Delete"
      busyLabel="Removing…"
      errorMessage="Failed to remove member. Please try again."
      showThrownMessage
      successToast="Member removed"
      onConfirm={doRemove}
      onDone={() => {
        setConfirmOpen(false);
        onClose();
      }}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  );
}
