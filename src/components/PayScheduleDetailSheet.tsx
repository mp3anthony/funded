"use client";

import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { useApp, useCurrentUser, type PaySchedule, type Member } from "@/context/AppContext";
import DetailSheet from "@/components/ui/DetailSheet";
import Row from "@/components/ui/Row";
import PayFieldCard, { payFieldTakesKeyboard } from "@/components/PayFieldCard";
import { isAcceptedMember } from "@/lib/householdLeave";
import {
  PAY_FREQUENCY_OPTIONS,
  PAY_TYPE_OPTIONS,
  amountLabel,
  canPickMember,
  dateLabel,
  memberOptions,
  optionLabel,
  payFieldError,
  payScheduleUpdate,
  valuesFromSchedule,
  type AddPayValues,
  type PayField,
} from "@/lib/addPayFlow";

interface PayScheduleDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** The live pay schedule (the page looks it up by id so it follows every save). */
  paySchedule: PaySchedule | null;
  householdMembers: Member[];
}

/**
 * Pay schedule detail sheet (R11, #398): one tappable row per field (each opens
 * a one-field card) and a red Delete at the bottom. The old Edit button and edit
 * form are gone. Only an owner with 2+ members can change whose pay it is. Rules
 * live in `lib/addPayFlow.ts`.
 */
export default function PayScheduleDetailSheet({
  isOpen,
  onClose,
  paySchedule,
  householdMembers,
}: PayScheduleDetailSheetProps) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const { isJointFund, householdContributions, updatePaySchedule, deletePaySchedule } = useApp();
  const currentUser = useCurrentUser();

  // The field card: which field, and the draft of every field (seeded from the live schedule when it opens).
  const [editing, setEditing] = useState<PayField | null>(null);
  const [draft, setDraft] = useState<AddPayValues | null>(null);

  // Fresh state every time the sheet opens, and cleared when it closes (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    setEditing(null);
    setDraft(null);
  }

  if (!isOpen || !paySchedule) return null;

  const member = householdMembers.find((m) => String(m.id) === String(paySchedule.member_id));
  const memberName = member ? member.name : "Unknown member";
  const seed = valuesFromSchedule(paySchedule);
  const isFixed = seed.payType === "fixed";

  const acceptedMembers = householdMembers.filter(isAcceptedMember);
  const canPick = canPickMember(currentUser.isOwner, acceptedMembers.length);

  const contribution =
    isJointFund && member
      ? householdContributions.find((c) => String(c.member_id) === String(member.id))
      : null;

  const openField = (f: PayField) => {
    // Render the card inside this tap, then focus its box, so the iOS keyboard opens with it.
    flushSync(() => {
      setDraft(valuesFromSchedule(paySchedule));
      setEditing(f);
    });
    if (payFieldTakesKeyboard(f)) document.getElementById(inputId)?.focus();
  };

  const patchDraft = (p: Partial<AddPayValues>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const saveField = async () => {
    if (!draft) return false;
    await updatePaySchedule(paySchedule.id, payScheduleUpdate(draft));
  };

  return (
    <>
      <DetailSheet
        open={isOpen}
        onClose={onClose}
        title={`${memberName}'s pay`}
        busy={editing !== null}
        onDelete={() => deletePaySchedule(paySchedule.id)}
        deleteConfirm={{
          title: `Delete ${memberName}'s pay schedule?`,
          message: "Pay already logged is kept.",
          confirmLabel: "Delete",
        }}
        deletedToast="Pay schedule deleted"
      >
        <div className="flex flex-col">
          {canPick ? (
            <Row divider tall chevron label="Whose pay" value={memberName} onClick={() => openField("member")} />
          ) : (
            <Row divider label="Whose pay" value={memberName} />
          )}
          <Row
            divider
            tall
            chevron
            label="Pay type"
            value={optionLabel(PAY_TYPE_OPTIONS, seed.payType)}
            onClick={() => openField("payType")}
          />
          <Row
            divider
            tall
            chevron
            label="How often"
            value={optionLabel(PAY_FREQUENCY_OPTIONS, seed.frequency)}
            onClick={() => openField("frequency")}
          />
          <Row
            divider
            tall
            chevron
            label="Next payday"
            value={dateLabel(seed.nextPayDate)}
            onClick={() => openField("nextPayDate")}
          />
          {isFixed && (
            <Row
              divider
              tall
              chevron
              label="Amount"
              value={amountLabel(Number(paySchedule.amount ?? 0))}
              onClick={() => openField("amount")}
            />
          )}
          {contribution && (
            <Row
              divider
              label="Contribution"
              value={`${amountLabel(Number(contribution.amount))} per ${contribution.frequency}`}
            />
          )}
        </div>
      </DetailSheet>

      {draft && (
        <PayFieldCard
          field={editing}
          onClose={() => setEditing(null)}
          values={draft}
          onChange={patchDraft}
          memberChoices={memberOptions(acceptedMembers, draft.member)}
          inputId={inputId}
          error={editing ? payFieldError(editing, draft) : null}
          onSubmit={saveField}
          successToast="Pay schedule updated"
        />
      )}
    </>
  );
}
