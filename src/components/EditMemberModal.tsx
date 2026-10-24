"use client";

import React, { useState, useEffect } from "react";
import { User, Shield } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { type Member } from "@/types";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import { useSheetSave } from "@/hooks/useSheetSave";
import { primaryPillLabel } from "@/lib/sheetSave";
import { canDemote } from "@/lib/householdLeave";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onRemoveTrigger: (member: Member) => void;
}

export default function EditMemberModal({
  isOpen,
  onClose,
  member,
  onRemoveTrigger,
}: EditMemberModalProps) {
  const { updateMember, members } = useApp();
  const [name, setName] = useState("");
  const [role, setRole] = useState<'owner' | 'member'>('member');

  // Shared save behaviour (R13): closes at once with a toast; a failure keeps
  // the sheet open with a red line and "Try again".
  const { status, error, run, reset } = useSheetSave({
    onSuccess: onClose,
    successToast: "Member updated",
    showThrownMessage: true,
  });
  const saving = status === "saving";

  useEffect(() => {
    if (member) {
      setName(member.name);
      setRole(member.role);
      reset();
    }
  }, [member, isOpen, reset]);

  if (!isOpen || !member) return null;

  // Determine if the name is editable by the owner
  // (editable if they haven't set their own custom name in their profile yet, i.e., user_id is null or name is email prefix)
  const emailPrefix = member.email ? member.email.split("@")[0] : "";
  const isNameEditable = !member.user_id || member.name === emailPrefix;

  // #251: the last owner can't be demoted (the DB trigger enforces it too).
  const demoteBlocked = member.role === 'owner' && !canDemote(members, member.id);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!member || saving) return;
    const current = member;
    run(async () => {
      const updateData: Partial<Omit<Member, "id">> = {};
      if (isNameEditable && name.trim() && name !== current.name) {
        updateData.name = name.trim();
      }
      if (role !== current.role) {
        updateData.role = role;
      }

      if (Object.keys(updateData).length > 0) {
        await updateMember(current.id, updateData);
      }
    });
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Edit member"
      icon={<User className="h-5 w-5 text-primary-ink" />}
      busy={saving}
      error={error}
      footer={
        <>
          <DialogButton variant="ghost" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </DialogButton>
          <DialogButton
            variant="primary"
            type="submit"
            form="edit-member-form"
            disabled={saving || (name === member.name && role === member.role)}
          >
            {primaryPillLabel(status, "Save changes")}
          </DialogButton>
        </>
      }
    >
        <form id="edit-member-form" onSubmit={handleSave} className="space-y-5 md:space-y-6 font-body">
            {/* Member Info */}
            <div className="flex items-center gap-3 pb-4 border-b border-border-strong">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-tr from-primary to-emerald-500 flex items-center justify-center text-foreground font-bold text-sm shadow-sm shrink-0">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.name} className="h-full w-full object-cover" />
                ) : (
                  member.avatar
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">{member.name}</h4>
                <p className="text-xs text-muted">{member.email}</p>
              </div>
            </div>

            {/* Name Input */}
            <Field
              id="member-name"
              label="Display name"
              description={
                !isNameEditable
                  ? "This member has set their own profile name. It cannot be modified by other users."
                  : undefined
              }
            >
              <Input
                id="member-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isNameEditable}
                aria-describedby={!isNameEditable ? "member-name-desc" : undefined}
              />
            </Field>

            {/* Role Select */}
            <div className="space-y-2">
              <span className="block text-[15px] font-semibold text-foreground">
                Household role
              </span>
              <div className="flex gap-2">
                <Chip
                  selected={role === 'member'}
                  onClick={() => setRole('member')}
                  disabled={demoteBlocked}
                >
                  Member
                </Chip>
                <Chip
                  selected={role === 'owner'}
                  onClick={() => setRole('owner')}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Owner
                </Chip>
              </div>
              {demoteBlocked && (
                <p className="text-xs text-muted leading-normal font-body">
                  Make someone else an owner first.
                </p>
              )}
              {role === 'owner' && member.role !== 'owner' && (
                <p className="text-xs text-primary-ink leading-normal font-body">
                  Promoting this member to Owner grants them full administrative control, including the ability to manage other members and edit household configurations.
                </p>
              )}
            </div>

            {/* Remove Action Button */}
            {member.role === 'owner' && (
              <p className="pt-4 border-t border-border-strong text-xs text-muted leading-normal">
                Make them a Member first to remove them.
              </p>
            )}
            {member.role !== 'owner' && (
              <div className="pt-4 border-t border-border-strong flex justify-between items-center gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Remove member</h4>
                  <p className="text-xs text-muted mt-0.5 leading-normal">Revoke access and reassign their data.</p>
                </div>
                <Button
                  variant="destructive"
                  disabled={saving}
                  onClick={() => {
                    onRemoveTrigger(member);
                    onClose();
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
        </form>
    </Dialog>
  );
}
