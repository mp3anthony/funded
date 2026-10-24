"use client";

import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { useApp, useCurrentUser } from "@/context/AppContext";
import AddRuleFlow from "@/components/AddRuleFlow";
import RuleDetailSheet from "@/components/RuleDetailSheet";
import ChoiceField from "@/components/ui/ChoiceField";
import DetailSheet from "@/components/ui/DetailSheet";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Row from "@/components/ui/Row";
import SectionHeader from "@/components/ui/SectionHeader";
import SingleCard from "@/components/ui/SingleCard";
import { PAY_FREQUENCY_OPTIONS, canPickMember } from "@/lib/addPayFlow";
import { ruleRowText } from "@/lib/addRuleFlow";
import { isAcceptedMember } from "@/lib/householdLeave";
import {
  contributionLine,
  contributionSeed,
  parseAmount,
  rulesForMember,
  scheduleRow,
  type Frequency,
} from "@/lib/paydayCards";

interface MemberPaySheetProps {
  /** Null = closed. The sheet looks everything up live, so it follows every save. */
  memberId: string | null;
  onClose: () => void;
  /** Open the pay schedule sheet (the page renders it, stacked over this one). */
  onOpenSchedule: (scheduleId: string) => void;
  /** Open the New pay schedule flow for this member (the page renders it). */
  onAddSchedule: (memberId: string) => void;
  /** Something the page renders stacked over this sheet is open: lock this one. */
  stackedOpen: boolean;
}

/**
 * A member's pay sheet (R21, #408), opened from their Payday card: their pay
 * schedules (each opens the pay schedule sheet), "Add pay schedule", the
 * Contribution row in a Joint Fund household (one card with amount and how
 * often) and the rules that run on their pay (each opens the rule sheet).
 * Rules live in `lib/paydayCards.ts`.
 */
export default function MemberPaySheet({
  memberId,
  onClose,
  onOpenSchedule,
  onAddSchedule,
  stackedOpen,
}: MemberPaySheetProps) {
  const uid = useId();
  const inputId = `${uid}-amount`;
  const { householdMembers, paySchedules, isJointFund, householdContributions, contributionRules, funds, setContribution } = useApp();
  const currentUser = useCurrentUser();

  const member = memberId === null ? null : (householdMembers.find((m) => String(m.id) === memberId) ?? null);
  const isOpen = member !== null;

  const [cardOpen, setCardOpen] = useState(false);
  const [draft, setDraft] = useState<{ amount: string; frequency: Frequency }>({ amount: "", frequency: "weekly" });
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [ruleId, setRuleId] = useState<string | null>(null);

  // Fresh state every time the sheet opens, and cleared when it closes (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    setCardOpen(false);
    setIsAddRuleOpen(false);
    setRuleId(null);
  }

  if (!member) return null;

  const schedules = paySchedules
    .filter((s) => String(s.member_id) === String(member.id))
    .sort((a, b) => a.next_pay_date.localeCompare(b.next_pay_date));
  const contribution = householdContributions.find((c) => String(c.member_id) === String(member.id)) ?? null;
  const rules = rulesForMember(contributionRules, member.id);
  // The rule sheet closes by itself when its rule is deleted (the id is then stale).
  const activeRuleId = ruleId !== null && rules.some((r) => String(r.id) === ruleId) ? ruleId : null;

  // Adding pay or a rule for someone else is for an owner with 2+ members; anyone can add their own.
  const acceptedCount = householdMembers.filter(isAcceptedMember).length;
  const canAdd = canPickMember(currentUser.isOwner, acceptedCount) || String(member.id) === String(currentUser.id);

  const openContribution = () => {
    // Render the card inside this tap, then focus its box, so the iOS keyboard opens with it.
    flushSync(() => {
      setDraft(contributionSeed(contribution, schedules[0]?.frequency));
      setCardOpen(true);
    });
    document.getElementById(inputId)?.focus();
  };

  const amountOk = parseAmount(draft.amount) !== null;
  const showAmountError = draft.amount.trim() !== "" && !amountOk;

  const saveContribution = async () => {
    const amount = parseAmount(draft.amount);
    if (amount === null) return false;
    await setContribution(String(member.id), amount, draft.frequency);
  };

  return (
    <>
      <DetailSheet
        open
        onClose={onClose}
        title={`${member.name}'s pay`}
        busy={stackedOpen || cardOpen || isAddRuleOpen || activeRuleId !== null}
      >
        <div className="flex flex-col gap-5">
          <section aria-label="Pay schedules">
            <SectionHeader title="Pay schedules" size="sm" />
            {schedules.map((s) => {
              const row = scheduleRow(s);
              return (
                <Row key={s.id} divider tall chevron label={row.label} value={row.value} onClick={() => onOpenSchedule(String(s.id))} />
              );
            })}
            {canAdd && (
              <Row divider tall chevron label="Add pay schedule" onClick={() => onAddSchedule(String(member.id))} />
            )}
            {schedules.length === 0 && !canAdd && <p className="py-2.5 text-sm text-muted">No pay set up yet.</p>}
          </section>

          {isJointFund && (
            <section aria-label="Contribution">
              <SectionHeader title="Contribution" size="sm" />
              <Row
                divider
                tall
                chevron
                label="Amount"
                value={contributionLine(contribution)}
                onClick={openContribution}
              />
            </section>
          )}

          <section aria-label="Rules">
            <SectionHeader title="Rules" size="sm" />
            {rules.map((rule) => {
              const goalName =
                rule.action_type === "goal"
                  ? (funds.find((g) => String(g.id) === String(rule.action_target_id))?.name ?? "Unknown goal")
                  : "Joint contribution";
              const text = ruleRowText(rule, null);
              return (
                <Row
                  key={rule.id}
                  divider
                  tall
                  chevron
                  label={`${goalName} · ${text.label}`}
                  value={text.value}
                  onClick={() => setRuleId(String(rule.id))}
                />
              );
            })}
            {rules.length === 0 && <p className="py-2.5 text-sm text-muted">No rules on this pay yet.</p>}
            {canAdd && (
              <Row divider tall chevron label="Add rule" onClick={() => setIsAddRuleOpen(true)} />
            )}
          </section>
        </div>
      </DetailSheet>

      {/* Stacked over this sheet; the sheet is busy (ignores Escape and taps) while one is open. */}
      <SingleCard
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        title="Contribution"
        submitLabel="Save"
        canSubmit={amountOk}
        onSubmit={saveContribution}
        successToast="Contribution updated"
      >
        <Field id={inputId} label={`How much does ${member.name} put in?`} question error={showAmountError ? "Enter an amount above $0" : undefined}>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
            <Input
              id={inputId}
              inputMode="decimal"
              placeholder="0.00"
              value={draft.amount}
              onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
              enterKeyHint="done"
              autoComplete="off"
              className="pl-8"
              aria-invalid={showAmountError || undefined}
            />
          </div>
        </Field>
        <ChoiceField
          id={`${inputId}-frequency`}
          question="How often?"
          options={PAY_FREQUENCY_OPTIONS}
          value={draft.frequency}
          onChange={(frequency) => setDraft((d) => ({ ...d, frequency: frequency as Frequency }))}
        />
      </SingleCard>
      <AddRuleFlow open={isAddRuleOpen} onClose={() => setIsAddRuleOpen(false)} memberId={String(member.id)} />
      <RuleDetailSheet ruleId={activeRuleId} onClose={() => setRuleId(null)} />
    </>
  );
}
