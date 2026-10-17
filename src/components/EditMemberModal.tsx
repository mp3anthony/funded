"use client";

import React, { useState, useEffect } from "react";
import { User, Shield, Trash2, Loader2, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { type Member } from "@/types";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setRole(member.role);
      setError(null);
      setSuccess(false);
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  // Determine if the name is editable by the owner 
  // (editable if they haven't set their own custom name in their profile yet, i.e., user_id is null or name is email prefix)
  const emailPrefix = member.email ? member.email.split("@")[0] : "";
  const isNameEditable = !member.user_id || member.name === emailPrefix;

  // #251: the last owner can't be demoted (the DB trigger enforces it too).
  const demoteBlocked = member.role === 'owner' && !canDemote(members, member.id);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updateData: Partial<Omit<Member, "id">> = {};
      if (isNameEditable && name.trim() && name !== member.name) {
        updateData.name = name.trim();
      }
      if (role !== member.role) {
        updateData.role = role;
      }

      if (Object.keys(updateData).length > 0) {
        await updateMember(member.id, updateData);
      }
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || "Failed to update member settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Edit Member Settings"
      icon={<User className="h-5 w-5 text-primary" />}
      footer={
        <>
          <DialogButton variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </DialogButton>
          <DialogButton
            variant="primary"
            type="submit"
            form="edit-member-form"
            disabled={loading || (name === member.name && role === member.role)}
            className="font-heading uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </DialogButton>
        </>
      }
    >
        <form id="edit-member-form" onSubmit={handleSave} className="space-y-5 md:space-y-6 font-body">
            {error && (
              <div className="p-3.5 rounded-[2px] bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3.5 rounded-[2px] bg-primary/10 border border-primary/20 text-primary text-xs font-medium flex items-center gap-2">
                <Check className="h-4 w-4" />
                Changes saved successfully!
              </div>
            )}

            {/* Member Info */}
            <div className="flex items-center gap-3 pb-4 border-b border-border-strong">
              <div className="h-10 w-10 rounded-lg overflow-hidden bg-gradient-to-tr from-primary to-emerald-500 flex items-center justify-center text-foreground font-bold text-sm shadow-sm shrink-0">
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
            <div className="space-y-2">
              <label htmlFor="member-name" className="block text-xs font-bold tracking-wider uppercase text-muted">
                Display Name
              </label>
              <input
                id="member-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isNameEditable}
                className="w-full px-4 py-3 rounded-[2px] bg-surface border border-border text-foreground text-sm font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all disabled:opacity-50"
              />
              {!isNameEditable && (
                <p className="text-[10px] text-subtle leading-normal">
                  This member has set their own profile name. It cannot be modified by other users.
                </p>
              )}
            </div>

            {/* Role Select */}
            <div className="space-y-2">
              <label className="block text-xs font-bold tracking-wider uppercase text-muted">
                Household Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('member')}
                  disabled={demoteBlocked}
                  className={`py-3 min-h-[44px] disabled:opacity-40 disabled:pointer-events-none rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all border ${
                    role === 'member'
                      ? 'bg-white/5 border-white/20 text-foreground'
                      : 'bg-transparent border-border-strong text-subtle hover:text-foreground'
                  }`}
                >
                  Member
                </button>
                <button
                  type="button"
                  onClick={() => setRole('owner')}
                  className={`py-3 rounded-[2px] text-xs font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
                    role === 'owner'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-transparent border-border-strong text-subtle hover:text-foreground'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Owner
                </button>
              </div>
              {demoteBlocked && (
                <p className="text-[10px] text-subtle leading-normal font-body">
                  Make someone else an owner first.
                </p>
              )}
              {role === 'owner' && member.role !== 'owner' && (
                <p className="text-[10px] text-primary leading-normal font-body">
                  Promoting this member to Owner grants them full administrative control, including the ability to manage other members and edit household configurations.
                </p>
              )}
            </div>

            {/* Remove Action Button */}
            {member.role !== 'owner' && (
              <div className="pt-4 border-t border-border-strong flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-destructive uppercase tracking-wider">Remove Member</h4>
                  <p className="text-[10px] text-subtle mt-0.5 leading-normal">Revoke access and reassign their data.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onRemoveTrigger(member);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-[2px] bg-destructive/10 hover:bg-destructive text-destructive hover:text-foreground border border-destructive/20 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer font-heading uppercase tracking-wider"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            )}
        </form>
    </Dialog>
  );
}
