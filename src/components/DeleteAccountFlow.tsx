"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { signOutAndGoToLogin } from "@/lib/signOut";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import {
  deleteAccountModeFor,
  eligibleNewOwners,
  isDeleteConfirmed,
  isPickNewOwnerReply,
  isUnauthorizedReply,
} from "@/lib/householdLeave";

interface DeleteAccountFlowProps {
  open: boolean;
  onClose: () => void;
  householdName: string;
}

/**
 * Delete my account (#509), opened from Settings. The mode comes from who is
 * in the household (deleteAccountModeFor); the delete-account function
 * re-checks it server-side, so a stale screen just gets a plain-English error
 * in the dialog. The only owner picks a new owner first. Success signs out
 * with a full navigation.
 * #519: if the server says pick a new owner (stale screen), the flow reloads
 * and moves to the picker; a 401 on a retry means the earlier attempt already
 * deleted the login (its reply was lost), so it signs out like a success.
 */
export default function DeleteAccountFlow({ open, onClose, householdName }: DeleteAccountFlowProps) {
  const { members, session, deleteAccount, retryLoadData } = useApp();

  const currentMember = members.find(
    (m) => String(m.email).toLowerCase() === String(session?.user?.email).toLowerCase()
  );
  const [step, setStep] = useState<"transfer" | "confirm">("confirm");
  const [newOwnerId, setNewOwnerId] = useState<string | number | null>(null);
  const [deleteText, setDeleteText] = useState("");
  // A delete request has been sent at least once (kept across reopen).
  const attemptedRef = useRef(false);

  // A picked new owner means transfer, even if stale members still say leave.
  const memberMode = deleteAccountModeFor(members, currentMember);
  const mode = newOwnerId !== null ? "transfer" : memberMode;
  const eligibleOwners = currentMember ? eligibleNewOwners(members, currentMember.id) : [];

  // Fresh state each time the flow opens (derived-state reset, no effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep(memberMode === "transfer" ? "transfer" : "confirm");
      setNewOwnerId(null);
      setDeleteText("");
    }
  }

  const household = householdName ? <span className="font-semibold">{householdName}</span> : "your household";
  const newOwnerName = eligibleOwners.find((m) => String(m.id) === String(newOwnerId))?.name ?? "Your new owner";

  let summary: ReactNode;
  if (mode === "leave") {
    summary = <>This permanently deletes your Funded login and removes you from {household}. Everyone else carries on.</>;
  } else if (mode === "transfer") {
    summary = (
      <>
        <span className="font-semibold">{newOwnerName}</span> becomes the owner. Then your Funded login is permanently deleted and you&apos;re removed from {household}.
      </>
    );
  } else if (mode === "delete-household") {
    summary = <>This permanently deletes your Funded login and {household}, with every bill, expense, goal and payday in it.</>;
  } else {
    summary = <>This permanently deletes your Funded login.</>;
  }

  return (
    <>
      {/* Only owner with accepted members: pick who takes over first */}
      <Dialog
        open={open && step === "transfer"}
        onClose={onClose}
        title="Pick a new owner"
        footer={
          <>
            <DialogButton variant="ghost" onClick={onClose}>
              Cancel
            </DialogButton>
            <DialogButton
              variant="primary"
              className="min-h-[44px]"
              disabled={newOwnerId === null}
              onClick={() => {
                setDeleteText("");
                setStep("confirm");
              }}
            >
              Next
            </DialogButton>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-[15px] leading-relaxed text-foreground">
            You&apos;re the only owner. Choose who takes over before your account is deleted.
          </p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="New owner">
            {eligibleOwners.map((m) => {
              const selected = String(newOwnerId) === String(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setNewOwnerId(m.id)}
                  className={`flex items-center justify-between gap-3 min-h-11 px-4 py-2 rounded-card border text-left text-sm font-semibold transition-colors disabled:opacity-60 ${
                    selected
                      ? "border-transparent ring-2 ring-inset ring-primary bg-surface-raised text-foreground"
                      : "border-border-strong bg-surface-raised text-foreground"
                  }`}
                >
                  <span className="truncate">{m.name}</span>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </Dialog>

      {/* Final step: needs DELETE typed */}
      <ConfirmDialog
        open={open && step === "confirm"}
        title="Delete your account?"
        confirmLabel="Delete"
        busyLabel="Deleting…"
        canConfirm={isDeleteConfirmed(deleteText)}
        showThrownMessage
        keepBusyOnSuccess
        errorMessage="That didn't work. Please check your connection and try again."
        onCancel={onClose}
        onConfirm={async () => {
          const isRetry = attemptedRef.current;
          attemptedRef.current = true;
          try {
            await deleteAccount(mode === "transfer" ? newOwnerId ?? undefined : undefined);
          } catch (err) {
            if (isPickNewOwnerReply(err)) {
              // Stale screen: nothing was deleted. Refresh and show the picker.
              retryLoadData();
              setNewOwnerId(null);
              setStep("transfer");
              return;
            }
            // Lost reply: the earlier attempt already deleted the login.
            if (!(isRetry && isUnauthorizedReply(err))) throw err;
          }
          await signOutAndGoToLogin();
        }}
        message={
          <div className="flex flex-col gap-3">
            <p>{summary}</p>
            <p className="text-sm leading-relaxed text-muted">
              {mode === "no-household"
                ? "This can't be undone."
                : "Your profile photo, notifications, pay schedule, pay history, bill splits and contributions are deleted. Bills, expenses and goals you were assigned stay, but unassigned. This can't be undone."}
            </p>
          </div>
        }
      >
        <Field id="delete-account-confirm" label="Type DELETE to confirm" className="text-left">
          <Input
            id="delete-account-confirm"
            type="text"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </Field>
      </ConfirmDialog>
    </>
  );
}
