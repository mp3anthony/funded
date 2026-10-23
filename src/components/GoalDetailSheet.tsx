"use client";

import React, { useId, useState } from "react";
import { flushSync } from "react-dom";
import { Plus } from "lucide-react";
import { useApp, type Fund } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import DetailSheet from "@/components/ui/DetailSheet";
import IconCircle from "@/components/ui/IconCircle";
import Row from "@/components/ui/Row";
import AddAmountModal from "@/components/AddAmountModal";
import AddRuleFlow from "@/components/AddRuleFlow";
import GoalFieldCard, { goalFieldTakesKeyboard } from "@/components/GoalFieldCard";
import RuleDetailSheet from "@/components/RuleDetailSheet";
import { useCountUp } from "@/hooks/useCountUp";
import { isAcceptedMember } from "@/lib/householdLeave";
import { ruleRowText } from "@/lib/addRuleFlow";
import {
  KIND_OPTIONS,
  amountLabel,
  deadlineLabel,
  goalFieldError,
  goalStatusLabel,
  goalUpdate,
  optionLabel,
  rulesForGoal,
  valuesFromGoal,
  type AddGoalValues,
  type GoalField,
} from "@/lib/addGoalFlow";

interface GoalDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** The live goal (parents look it up by id so it follows every save). */
  goal: Fund | null;
  /** Goals page only: a Just tracking goal gets a "Check impact" action that hands off to the calculator. */
  onCheckImpact?: (goal: Fund) => void;
}

/** A row value that keeps long text on one line. */
function Val({ children }: { children: React.ReactNode }) {
  return <span className="block max-w-[55vw] truncate text-[13px] text-muted">{children}</span>;
}

/**
 * Goal detail sheet (R11, #398): a status line with a progress bar, "Add amount",
 * one tappable row per field (each opens a one-field card), "Rules for this goal"
 * and a red Delete at the bottom. The old Edit button and edit form are gone.
 * Rules live in `lib/addGoalFlow.ts`.
 */
export default function GoalDetailSheet({ isOpen, onClose, goal, onCheckImpact }: GoalDetailSheetProps) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const addAmountInputId = `${uid}-add-amount`;
  const { contributionRules, householdMembers, updateGoal, deleteGoal, deleteRule } = useApp();

  // The field card: which field, and the draft of every field (seeded from the live goal when it opens).
  const [editing, setEditing] = useState<GoalField | null>(null);
  const [draft, setDraft] = useState<AddGoalValues | null>(null);
  const [addAmountOpen, setAddAmountOpen] = useState(false);
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [ruleId, setRuleId] = useState<string | null>(null);

  // Fresh state every time the sheet opens, and cleared when it closes (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    setEditing(null);
    setDraft(null);
    setAddAmountOpen(false);
    setAddRuleOpen(false);
    setRuleId(null);
  }

  // Slice 99: call sites key this component so each open (including reopening the
  // same goal) is a fresh mount, so the saved amount and progress count up from 0.
  const target = goal ? Number(goal.targetAmount) : 0;
  const percentage = goal && target > 0 ? Math.min((goal.currentAmount / target) * 100, 100) : 0;
  const displayCurrentAmount = useCountUp(goal?.currentAmount ?? 0, 700, true);
  const displayPercentage = useCountUp(percentage, 700, true);

  if (!isOpen || !goal) return null;

  const seed = valuesFromGoal(goal);
  const statusLabel = goalStatusLabel(goal);
  const isTracking = seed.kind === "tracking";
  const goalRules = rulesForGoal(contributionRules, goal.id);
  const showRules = !isTracking || goalRules.length > 0;
  // The rule sheet closes by itself when its rule is deleted (the id is then stale).
  const activeRuleId =
    ruleId !== null && contributionRules.some((r) => String(r.id) === ruleId) ? ruleId : null;

  const acceptedMembers = householdMembers.filter(isAcceptedMember);
  const showMemberNames = acceptedMembers.length >= 2;

  const openField = (f: GoalField) => {
    // Render the card inside this tap, then focus its box, so the iOS keyboard opens with it.
    flushSync(() => {
      setDraft(valuesFromGoal(goal));
      setEditing(f);
    });
    if (goalFieldTakesKeyboard(f)) document.getElementById(inputId)?.focus();
  };

  const openAddAmount = () => {
    flushSync(() => setAddAmountOpen(true));
    document.getElementById(addAmountInputId)?.focus();
  };

  const patchDraft = (p: Partial<AddGoalValues>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const saveField = async () => {
    if (!draft) return false;
    await updateGoal(goal.id, goalUpdate(draft, goal));
  };

  // The goal goes first; its rules are then removed best effort (a leftover rule points at nothing and does nothing).
  const deleteWithRules = async () => {
    const rules = goalRules;
    await deleteGoal(goal.id);
    for (const r of rules) {
      try {
        await deleteRule(r.id);
      } catch (err) {
        console.error("Failed to delete rule of deleted goal:", err);
      }
    }
  };

  const n = goalRules.length;
  const deleteMessage =
    `"${goal.name}" will be removed.` +
    (n > 0 ? ` Its ${n} rule${n === 1 ? " is" : "s are"} removed too.` : "");

  // The sheet closes first, then the calculator opens, so the two pop-ups never stack.
  const checkImpact = () => {
    onClose();
    onCheckImpact?.(goal);
  };

  const actions =
    !isTracking && statusLabel !== "Reached" ? (
      <Button fullWidth onClick={openAddAmount}>
        Add amount
      </Button>
    ) : isTracking && onCheckImpact ? (
      <Button fullWidth onClick={checkImpact}>
        Check impact
      </Button>
    ) : undefined;

  return (
    <>
      <DetailSheet
        open={isOpen}
        onClose={onClose}
        title={goal.name}
        actions={actions}
        busy={editing !== null || addAmountOpen || addRuleOpen || activeRuleId !== null}
        onDelete={deleteWithRules}
        deleteConfirm={{
          title: "Delete this goal?",
          message: deleteMessage,
          confirmLabel: "Delete",
        }}
        deletedToast="Goal deleted"
      >
        <p className="mb-1 text-sm text-muted">
          {statusLabel}
          {!isTracking && (
            <>
              {" · "}
              <span className="tabular-nums">
                {amountLabel(displayCurrentAmount)} of {amountLabel(target)}
              </span>
            </>
          )}
        </p>
        {!isTracking && (
          <div className="mb-2 h-3 w-full overflow-hidden rounded-full border border-border bg-surface">
            <div
              className={`h-full rounded-full transition-[width] duration-(--duration-structural) ease-(--ease-enter) ${goal.barColor}`}
              style={{ width: `${displayPercentage}%` }}
            />
          </div>
        )}
        <div className="flex flex-col">
          <Row divider tall chevron label="Name" onClick={() => openField("name")}>
            <Val>{goal.name}</Val>
          </Row>
          <Row
            divider
            tall
            chevron
            label="Kind"
            value={optionLabel(KIND_OPTIONS, seed.kind)}
            onClick={() => openField("kind")}
          />
          <Row divider tall chevron label="Target" value={amountLabel(target)} onClick={() => openField("target")} />
          {!isTracking && (
            <Row
              divider
              tall
              chevron
              label="Saved"
              value={amountLabel(Number(goal.currentAmount))}
              onClick={() => openField("saved")}
            />
          )}
          <Row
            divider
            tall
            chevron
            label="Deadline"
            value={deadlineLabel(seed.deadline)}
            onClick={() => openField("deadline")}
          />
          <Row divider tall chevron label="Category" value={seed.category} onClick={() => openField("category")} />
        </div>

        {showRules && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-foreground">Rules for this goal</h3>
              <IconCircle label="Add a rule" onClick={() => setAddRuleOpen(true)}>
                <Plus size={18} />
              </IconCircle>
            </div>
            {n === 0 ? (
              <p className="text-sm text-muted">Move spare pay into a goal automatically</p>
            ) : (
              <div className="flex flex-col">
                {goalRules.map((r) => {
                  const name = showMemberNames
                    ? (householdMembers.find((m) => String(m.id) === String(r.member_id))?.name ?? null)
                    : null;
                  const text = ruleRowText(r, name);
                  return (
                    <Row
                      key={r.id}
                      divider
                      tall
                      chevron
                      label={text.label}
                      value={text.value}
                      onClick={() => setRuleId(String(r.id))}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DetailSheet>

      {draft && (
        <GoalFieldCard
          field={editing}
          onClose={() => setEditing(null)}
          values={draft}
          onChange={patchDraft}
          inputId={inputId}
          error={editing ? goalFieldError(editing, draft) : null}
          onSubmit={saveField}
          successToast="Goal updated"
        />
      )}

      <AddAmountModal
        isOpen={addAmountOpen}
        onClose={() => setAddAmountOpen(false)}
        goal={goal}
        inputId={addAmountInputId}
      />

      <AddRuleFlow open={addRuleOpen} onClose={() => setAddRuleOpen(false)} goalId={String(goal.id)} />

      <RuleDetailSheet ruleId={activeRuleId} onClose={() => setRuleId(null)} />
    </>
  );
}
