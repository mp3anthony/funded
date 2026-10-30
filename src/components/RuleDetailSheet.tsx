"use client";

import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { useApp, useCurrentUser } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import DetailSheet from "@/components/ui/DetailSheet";
import Row from "@/components/ui/Row";
import RuleFieldCard, { ruleFieldTakesKeyboard } from "@/components/RuleFieldCard";
import { useSheetSave } from "@/hooks/useSheetSave";
import { primaryPillLabel } from "@/lib/sheetSave";
import { isAcceptedMember } from "@/lib/householdLeave";
import { canPickMember, memberOptions } from "@/lib/addPayFlow";
import {
  ruleFieldError,
  ruleRowText,
  ruleUpdate,
  thresholdLabel,
  valuesFromRule,
  type AddRuleValues,
  type RuleField,
} from "@/lib/addRuleFlow";

interface RuleDetailSheetProps {
  /** Null = closed. The sheet looks the rule up live, so it follows every save. */
  ruleId: string | null;
  onClose: () => void;
}

/**
 * Rule detail sheet (R11, #398): on/off at the top, one tappable row per field
 * (each opens a one-field card) and a red Delete at the bottom. Opened from a
 * goal's "Rules for this goal" and from the Settings rules list. Rules live in
 * `lib/addRuleFlow.ts`.
 */
export default function RuleDetailSheet({ ruleId, onClose }: RuleDetailSheetProps) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const { contributionRules, funds, householdMembers, householdContributions, updateRule, deleteRule } = useApp();
  const currentUser = useCurrentUser();

  const rule = ruleId === null ? null : (contributionRules.find((r) => String(r.id) === String(ruleId)) ?? null);
  const isOpen = rule !== null;

  // The field card: which field, and the draft of every field (seeded from the live rule when it opens).
  const [editing, setEditing] = useState<RuleField | null>(null);
  const [draft, setDraft] = useState<AddRuleValues | null>(null);
  // On/off keeps the sheet open (the row below says Off).
  const toggleHook = useSheetSave({ onSuccess: () => {} });

  // Fresh state every time the sheet opens, and cleared when it closes (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    toggleHook.reset();
    setEditing(null);
    setDraft(null);
  }

  if (!rule) return null;

  const acceptedMembers = householdMembers.filter(isAcceptedMember);
  const canPick = canPickMember(currentUser.isOwner, acceptedMembers.length);
  const nameOf = (id: string | number) => householdMembers.find((m) => String(m.id) === String(id))?.name ?? "Member";
  const memberName = nameOf(rule.member_id);
  const isGoalRule = rule.action_type === "goal";
  const goal = isGoalRule ? funds.find((f) => String(f.id) === String(rule.action_target_id)) : undefined;
  const goalName = isGoalRule ? (goal?.name ?? "Unknown goal") : "Joint contribution";
  const text = ruleRowText(rule, null);
  const seed = valuesFromRule(rule);

  // A contribution rule points at the member's contribution row; keep it unless the member changes.
  const contributionTargetFor = (memberId: string) => {
    if (memberId === String(rule.member_id)) return String(rule.action_target_id);
    const match = householdContributions.find((c) => String(c.member_id) === memberId);
    return match ? String(match.id) : memberId;
  };

  const openField = (f: RuleField) => {
    // Render the card inside this tap, then focus its box, so the iOS keyboard opens with it.
    flushSync(() => {
      setDraft(valuesFromRule(rule));
      setEditing(f);
    });
    if (ruleFieldTakesKeyboard(f)) document.getElementById(inputId)?.focus();
  };

  const saveField = async () => {
    if (!draft) return false;
    await updateRule(rule.id, ruleUpdate(draft, rule, contributionTargetFor(draft.member)));
  };

  const toggling = toggleHook.status === "saving";

  return (
    <>
      <DetailSheet
        open
        onClose={onClose}
        title={isGoalRule ? `Rule for ${goalName}` : "Contribution rule"}
        secondary={[
          <Button
            key="toggle"
            variant="ghost"
            disabled={toggling}
            onClick={() => void toggleHook.run(() => updateRule(rule.id, { is_active: !rule.is_active }))}
          >
            {primaryPillLabel(toggleHook.status, rule.is_active ? "Turn off" : "Turn on")}
          </Button>,
        ]}
        actionError={toggleHook.error}
        busy={toggling || editing !== null}
        onDelete={() => deleteRule(rule.id)}
        deleteConfirm={{
          title: "Delete this rule?",
          message: `${text.label} will stop running on ${memberName}'s pay.`,
          confirmLabel: "Delete",
        }}
        deletedToast="Rule deleted"
      >
        <p className="mb-1 text-sm text-muted">{rule.is_active ? "On" : "Off"}</p>
        <div className="flex flex-col">
          {canPick ? (
            <Row divider tall chevron label="Whose pay" value={memberName} onClick={() => openField("member")} />
          ) : (
            <Row divider label="Whose pay" value={memberName} />
          )}
          {isGoalRule ? (
            <Row divider tall chevron label="Goal" value={goalName} onClick={() => openField("goal")} />
          ) : (
            <Row divider label="Goal" value="Joint contribution" />
          )}
          <Row
            divider
            tall
            chevron
            label="Threshold"
            value={thresholdLabel(seed.threshold)}
            onClick={() => openField("threshold")}
          />
          <Row divider tall chevron label="Amount" value={text.label} onClick={() => openField("amount")} />
        </div>
      </DetailSheet>

      {draft && (
        <RuleFieldCard
          field={editing}
          onClose={() => setEditing(null)}
          values={draft}
          onChange={setDraft}
          memberChoices={memberOptions(acceptedMembers, draft.member)}
          goalChoices={funds.map((f) => ({ value: String(f.id), label: f.name }))}
          memberName={nameOf(draft.member)}
          inputId={inputId}
          error={editing ? ruleFieldError(editing, draft, funds.map((f) => String(f.id))) : null}
          onSubmit={saveField}
          successToast="Rule updated"
        />
      )}
    </>
  );
}
