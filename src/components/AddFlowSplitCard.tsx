"use client";

import React from "react";
import ChoiceField from "@/components/ui/ChoiceField";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import {
  amountLabel,
  billRemaining,
  billSplitOver,
  expensePercentValid,
  parseAmount,
  percentTotal,
  type AddFlowValues,
  type Option,
  type SplitContext,
} from "@/lib/addFlow";
import { cn } from "@/lib/utils";

const BILL_MODE_OPTIONS: Option[] = [
  {
    value: "joint",
    label: "Joint Fund",
    description: "Paid straight from the household's Joint Fund account.",
  },
  {
    value: "individual",
    label: "Individual splits",
    description: "Each member covers a share.",
  },
];

const EXPENSE_SPLIT_OPTIONS: Option[] = [
  {
    value: "assignee",
    label: "One person",
    description: "The whole expense sits with the person who looks after it.",
  },
  {
    value: "percentage",
    label: "Split by percentage",
    description: "Each member covers a percentage. It must add up to 100%.",
  },
];

interface Member {
  id: string;
  name: string;
}

interface AddFlowSplitCardProps {
  /** Prefix for element ids. */
  id: string;
  values: AddFlowValues;
  onChange: (patch: Partial<AddFlowValues>) => void;
  ctx: SplitContext;
  members: Member[];
  /** The assignee after falling back to the current member. */
  assigneeId: string;
}

/**
 * The Split card of the Add flow (R07, #394) and of the bill and expense detail
 * sheets (R10, via ItemFieldCard). Controlled: every value lives in
 * the flow's state and nothing here keeps state or runs effects, so leaving the
 * card and coming back loses nothing.
 */
export default function AddFlowSplitCard({
  id,
  values,
  onChange,
  ctx,
  members,
  assigneeId,
}: AddFlowSplitCardProps) {
  if (values.type === "expense") {
    return (
      <div className="flex flex-col gap-4">
        <ChoiceField
          id={`${id}-expense-split`}
          question="Who covers it?"
          options={EXPENSE_SPLIT_OPTIONS}
          value={values.expenseSplit}
          onChange={(v) => onChange({ expenseSplit: v as AddFlowValues["expenseSplit"] })}
        />
        {values.expenseSplit === "percentage" && (
          <PercentRows
            id={id}
            members={members}
            pct={values.percentages}
            onChange={(percentages) => onChange({ percentages })}
            ctx={ctx}
          />
        )}
      </div>
    );
  }

  const total = parseAmount(values.amount) ?? 0;
  const showShares = !ctx.isJointFund || values.billSplitMode === "individual";

  return (
    <div className="flex flex-col gap-4">
      {ctx.isJointFund ? (
        <ChoiceField
          id={`${id}-paid-by`}
          question="Who covers it?"
          options={BILL_MODE_OPTIONS}
          value={values.billSplitMode}
          onChange={(v) => onChange({ billSplitMode: v as AddFlowValues["billSplitMode"] })}
        />
      ) : null}
      {showShares && (
        <BillShares
          id={id}
          values={values}
          onChange={onChange}
          members={members}
          assigneeId={assigneeId}
          total={total}
          ctx={ctx}
        />
      )}
    </div>
  );
}

function BillShares({
  id,
  values,
  onChange,
  members,
  assigneeId,
  total,
  ctx,
}: {
  id: string;
  values: AddFlowValues;
  onChange: (patch: Partial<AddFlowValues>) => void;
  members: Member[];
  assigneeId: string;
  total: number;
  ctx: SplitContext;
}) {
  const isPct = values.splitBasis === "percentage";
  const args = {
    memberIds: ctx.memberIds,
    assigneeId,
    mode: values.splitBasis,
    values: values.shares,
    total,
  };
  const { remaining } = billRemaining(args);
  const over = billSplitOver(args);
  const fmt = (n: number) => (isPct ? `${n.toFixed(1)}%` : amountLabel(n));
  const question = ctx.isJointFund ? "How is it shared?" : "Who covers it?";

  return (
    <Field id={`${id}-basis`} label={question} question={!ctx.isJointFund}>
      <Select
        id={`${id}-basis`}
        value={values.splitBasis}
        onChange={(e) =>
          // A new basis starts from "assignee takes it all".
          onChange({ splitBasis: e.target.value as AddFlowValues["splitBasis"], shares: {} })
        }
      >
        <option value="percentage">Split by percentage (%)</option>
        <option value="amount">Split by amount ($)</option>
      </Select>
      <div className="flex flex-col gap-3">
        {members.map((m) => {
          const isAssignee = m.id === assigneeId;
          return (
            <div key={m.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-[15px] text-foreground">
                {m.name}
                {isAssignee && <span className="ml-2 text-xs text-primary">Assignee</span>}
              </span>
              {isAssignee ? (
                <span className="w-28 shrink-0 text-right text-[15px] text-muted">
                  {fmt(Math.max(0, remaining))}
                </span>
              ) : (
                <div className="relative w-28 shrink-0">
                  {!isPct && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  )}
                  <Input
                    inputMode="decimal"
                    placeholder="0"
                    aria-label={`${m.name} share`}
                    value={values.shares[m.id] ?? ""}
                    onChange={(e) =>
                      onChange({ shares: { ...values.shares, [m.id]: e.target.value } })
                    }
                    className={cn("text-right", isPct ? "pr-8" : "pl-7")}
                  />
                  {isPct && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">%</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className={cn("text-sm", over ? "text-destructive" : "text-muted")} aria-live="polite">
        {over ? `${fmt(Math.abs(remaining))} over` : `${fmt(Math.max(0, remaining))} remaining`}
      </p>
    </Field>
  );
}

function PercentRows({
  id,
  members,
  pct,
  onChange,
  ctx,
}: {
  id: string;
  members: Member[];
  pct: Record<string, string>;
  onChange: (pct: Record<string, string>) => void;
  ctx: SplitContext;
}) {
  const valid = expensePercentValid(ctx.memberIds, pct);
  const total = percentTotal(ctx.memberIds, pct);
  return (
    <div className="flex flex-col gap-3">
      {members.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[15px] text-foreground">{m.name}</span>
          <div className="relative w-28 shrink-0">
            <Input
              inputMode="decimal"
              placeholder="0"
              aria-label={`${m.name} percentage`}
              value={pct[m.id] ?? ""}
              onChange={(e) => onChange({ ...pct, [m.id]: e.target.value })}
              className="pr-8 text-right"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">%</span>
          </div>
        </div>
      ))}
      <p
        id={`${id}-total`}
        className={cn("text-sm", valid ? "text-primary" : "text-destructive")}
        aria-live="polite"
      >
        Total {total.toFixed(1)}%{valid ? "" : " (must be 100%)"}
      </p>
    </div>
  );
}
