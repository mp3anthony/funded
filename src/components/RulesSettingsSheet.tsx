"use client";

import React, { useState } from "react";
import { Plus, Sparkles, AlertCircle } from "lucide-react";
import { type Member } from "@/context/AppContext";
import { type ContributionRule } from "@/types";
import AddRuleFlow from "./AddRuleFlow";
import RuleDetailSheet from "./RuleDetailSheet";
import Dialog from "@/components/ui/Dialog";
import Row from "@/components/ui/Row";
import { ruleRowText } from "@/lib/addRuleFlow";

interface RulesSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  householdMembers: Member[];
  rules: ContributionRule[];
  goals: { id: string | number; name: string }[];
}

/**
 * Interim home of the rules list until Settings is rebuilt (R29). New rules are
 * made in AddRuleFlow (R09, #396); each row opens the rule sheet (R11, #398),
 * where a rule is edited, turned on or off, and deleted.
 */
export default function RulesSettingsSheet({
  isOpen,
  onClose,
  householdMembers,
  rules,
  goals,
}: RulesSettingsSheetProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [ruleId, setRuleId] = useState<string | null>(null);

  if (!isOpen) return null;

  // The rule sheet closes by itself when its rule is deleted (the id is then stale).
  const activeRuleId = ruleId !== null && rules.some((r) => String(r.id) === ruleId) ? ruleId : null;

  return (
    <>
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Contribution Rules"
      busy={isAddOpen || activeRuleId !== null}
      icon={<Sparkles size={18} className="text-primary animate-pulse" />}
      footer={
        <button
          onClick={() => setIsAddOpen(true)}
          className="w-full py-3 md:py-3.5 bg-primary text-primary-fg rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-[0.98]"
        >
          <Plus size={14} />
          <span>Add automation rule</span>
        </button>
      }
    >
      <p className="text-[11px] text-muted font-body -mt-1 mb-4">
        Automatically allocate excess pay when you earn above a threshold
      </p>
      {rules.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-border rounded-card bg-background/20">
          <AlertCircle className="h-6 w-6 text-muted mx-auto mb-2" />
          <p className="text-xs text-muted font-medium">No contribution rules set.</p>
          <p className="text-[10px] text-subtle mt-0.5">Automate excess pay allocation by setting a rule below.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {rules.map((rule) => {
            const memberName = householdMembers.find((m) => String(m.id) === String(rule.member_id))?.name ?? "Member";
            const goalName =
              rule.action_type === "goal"
                ? (goals.find((g) => String(g.id) === String(rule.action_target_id))?.name ?? "Unknown goal")
                : "Joint contribution";
            const text = ruleRowText(rule, memberName);
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
        </div>
      )}
    </Dialog>

    {/* Stacked over this sheet; the sheet ignores Escape and taps while one is open (busy). */}
    <AddRuleFlow open={isAddOpen} onClose={() => setIsAddOpen(false)} />
    <RuleDetailSheet ruleId={activeRuleId} onClose={() => setRuleId(null)} />
    </>
  );
}
