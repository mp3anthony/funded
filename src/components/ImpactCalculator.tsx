"use client";

import { useId, useMemo, useState } from "react";
import { useApp, useCurrentUser } from "@/context/AppContext";
import { useVerdict } from "@/hooks/useVerdict";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Dialog from "@/components/ui/Dialog";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import { FREQUENCY_OPTIONS, parseAmount } from "@/lib/addFlow";
import type { FrequencyType } from "@/lib/frequencyPreference";
import {
  billPrefill,
  coverageNote,
  impactFromVerdict,
  extraCosts,
  goalWeekly,
  leftoverLine,
  parsePayments,
  perPayAmount,
  perPayUsable,
  pickPayFrequency,
  planLength,
  totalCost,
  type BillPrefill,
} from "@/lib/impactCalc";
import { convertAmount, cn } from "@/lib/utils";

const moneyFmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TONE_CLASS = { ok: "text-primary-ink", bad: "text-destructive-ink", neutral: "text-muted" } as const;

interface ImpactCalculatorProps {
  open: boolean;
  onClose: () => void;
  /** "plan" (Bills): a payment plan or subscription. "goal" (F07): saving towards a goal. */
  mode?: "plan" | "goal";
  /** Plan mode: the Bills page's "amounts as" choice; the Household total is shown in it. */
  frequency?: FrequencyType;
  /** Plan mode: the unfiltered Household total now, in `frequency`. */
  currentTotal?: number;
  /** Plan mode: hands the answers to the Add flow. This pop-up closes first. */
  onTurnIntoBill?: (prefill: BillPrefill) => void;
  /** Goal mode: hands the per-pay amount (dollars and cents) to the Add rule flow. This pop-up closes first. */
  onCreateRule?: (perPay: number) => void;
  /** Answers known already (goal mode: the goal's name and target). */
  initial?: { name?: string; amount?: number };
}

interface Inputs {
  name: string;
  amount: string;
  frequency: string;
  ongoing: boolean;
  payments: string;
}

const freshInputs = (initial: ImpactCalculatorProps["initial"]): Inputs => ({
  name: initial?.name ?? "",
  amount: initial?.amount ? String(initial.amount) : "",
  frequency: "monthly",
  ongoing: false,
  payments: "",
});

/**
 * "Check impact" (R16, #403): what would a payment plan or subscription do to the
 * household? Read-only, saves nothing. "Turn into a bill" hands the answers to the
 * Add flow. Rules live in `lib/impactCalc.ts`.
 */
export default function ImpactCalculator({
  open,
  onClose,
  mode = "plan",
  frequency = "weekly",
  currentTotal = 0,
  onTurnIntoBill,
  onCreateRule,
  initial,
}: ImpactCalculatorProps) {
  const uid = useId();

  const [inputs, setInputs] = useState<Inputs>(() => freshInputs(initial));
  // Fresh inputs each time it opens (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setInputs(freshInputs(initial));
  }
  const patch = (p: Partial<Inputs>) => setInputs((v) => ({ ...v, ...p }));

  const isGoal = mode === "goal";
  const { isJointFund, paySchedules } = useApp();
  const currentUser = useCurrentUser();
  const typed = parseAmount(inputs.amount);
  const payments = inputs.ongoing && !isGoal ? null : parsePayments(inputs.payments);
  // Goal mode: the typed amount is the whole cost, so one payment is cost / payments.
  const amount = isGoal ? (typed !== null && payments !== null ? typed / payments : null) : typed;
  // The verdict as it stands and with the plan added (R25).
  const extraWeekly = amount === null ? 0 : convertAmount(amount, inputs.frequency, "weekly");
  const verdictNow = useVerdict(0, true);
  const verdictWith = useVerdict(extraWeekly, true);
  // Goal mode: one pay's worth, at the pay frequency the rule will run on.
  const payFrequency = pickPayFrequency(paySchedules, currentUser.id);
  const perPay = isGoal && amount !== null ? perPayAmount(extraWeekly, payFrequency, convertAmount) : null;
  const tooSmall = isGoal && amount !== null && !perPayUsable(perPay);
  const ready = amount !== null && (inputs.ongoing || payments !== null) && !tooSmall;

  const result = useMemo(() => {
    if (amount === null || (!inputs.ongoing && payments === null)) return null;
    const costs = extraCosts(amount, inputs.frequency, convertAmount);
    return {
      costs,
      total: isGoal && typed !== null ? typed : totalCost(amount, payments),
      leftover: leftoverLine(
        isGoal && typed !== null && payments !== null
          ? goalWeekly(typed, payments, inputs.frequency, convertAmount)
          : extraWeekly,
        verdictNow.halves.income,
      ),
      length: planLength(inputs.frequency, payments),
      newTotal: currentTotal + convertAmount(amount, inputs.frequency, frequency),
      coverage: impactFromVerdict(verdictNow, verdictWith),
    };
  }, [amount, typed, isGoal, payments, inputs.ongoing, inputs.frequency, currentTotal, frequency, extraWeekly, verdictNow, verdictWith]);

  const turnIntoBill = () => {
    if (!ready) return;
    onClose();
    onTurnIntoBill?.(
      billPrefill({ name: inputs.name, amount: inputs.amount, frequency: inputs.frequency, payments }),
    );
  };

  const createRule = () => {
    if (!ready || perPay === null) return;
    onClose();
    onCreateRule?.(perPay);
  };

  const nameId = `${uid}-name`;
  const amountId = `${uid}-amount`;
  const paymentsId = `${uid}-payments`;
  const freqLabel = FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label.toLowerCase() ?? frequency;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Check impact"
      placement="bottom"
      footer={
        <div className="flex w-full flex-col gap-2">
          {!ready && (
            <p className="text-center text-xs text-muted">
              {tooSmall
                ? "Amount is too small to make a rule"
                : isGoal
                  ? "Enter what is left to save and the number of payments"
                  : "Enter an amount and number of payments"}
            </p>
          )}
          <Button fullWidth disabled={!ready} onClick={isGoal ? createRule : turnIntoBill}>
            {isGoal ? "Create rule" : "Turn into a bill"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="-mt-1 text-xs text-muted">
          {isGoal && initial?.name ? `${initial.name}. ` : ""}Nothing is saved.
        </p>

        {!isGoal && (
          <Field id={nameId} label="Name (optional)">
            <Input
              id={nameId}
              placeholder="Phone plan"
              value={inputs.name}
              onChange={(e) => patch({ name: e.target.value })}
              autoComplete="off"
            />
          </Field>
        )}

        <Field id={amountId} label={isGoal ? "Still to save" : "Payment amount"}>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
            <Input
              id={amountId}
              inputMode="decimal"
              placeholder="0.00"
              value={inputs.amount}
              onChange={(e) => patch({ amount: e.target.value })}
              autoComplete="off"
              className="pl-8"
            />
          </div>
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold text-foreground" id={`${uid}-freq`}>
            {isGoal ? "Save it how often" : "How often"}
          </span>
          <div role="group" aria-labelledby={`${uid}-freq`} className="flex flex-wrap gap-2">
            {FREQUENCY_OPTIONS.map((o) => (
              <Chip key={o.value} selected={inputs.frequency === o.value} onClick={() => patch({ frequency: o.value })}>
                {o.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold text-foreground" id={`${uid}-pay`}>
            {isGoal ? "Save it over" : "Payments"}
          </span>
          {!isGoal && (
            <div role="group" aria-labelledby={`${uid}-pay`} className="flex flex-wrap gap-2">
              <Chip selected={!inputs.ongoing} onClick={() => patch({ ongoing: false })}>
                Number of payments
              </Chip>
              <Chip selected={inputs.ongoing} onClick={() => patch({ ongoing: true })}>
                Ongoing
              </Chip>
            </div>
          )}
          {(isGoal || !inputs.ongoing) && (
            <Input
              id={paymentsId}
              aria-label="Number of payments"
              inputMode="numeric"
              placeholder="12"
              value={inputs.payments}
              onChange={(e) => patch({ payments: e.target.value })}
              autoComplete="off"
            />
          )}
        </div>

        {result && (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            {isGoal && perPay !== null && (
              <div aria-live="polite">
                <p className={cn("text-[17px] font-bold", TONE_CLASS[result.leftover.tone])}>{result.leftover.text}</p>
                <div className="mt-2 flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="text-muted">Per pay</span>
                  <span className="font-semibold tabular-nums text-foreground">{moneyFmt(perPay)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {payFrequency
                    ? `Based on your ${payFrequency} pay`
                    : "Add your pay on Payday to match your pay days"}
                </p>
              </div>
            )}

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-subtle">Extra cost</div>
              <dl className="mt-2 flex flex-col gap-1.5 text-[15px]">
                {(
                  [
                    ["A week", result.costs.weekly],
                    ["A fortnight", result.costs.fortnightly],
                    ["A month", result.costs.monthly],
                    ["A year", result.costs.yearly],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-semibold tabular-nums text-foreground">{moneyFmt(value)}</dd>
                  </div>
                ))}
              </dl>
              {result.total !== null && result.length && (
                <p className="mt-2 text-sm text-muted">
                  Total <span className="tabular-nums">{moneyFmt(result.total)}</span> over {payments}{" "}
                  {payments === 1 ? "payment" : "payments"}, about {result.length}.
                </p>
              )}
            </div>

            {!isGoal && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-subtle">
                Household total, {freqLabel}
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3 text-[15px]">
                <span className="text-muted">Now</span>
                <span className="font-semibold tabular-nums text-foreground">{moneyFmt(currentTotal)}</span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-3 text-[15px]">
                <span className="text-muted">With this</span>
                <span className="font-semibold tabular-nums text-foreground">{moneyFmt(result.newTotal)}</span>
              </div>
            </div>
            )}

            <div aria-live="polite">
              <p className={cn("text-[17px] font-bold", TONE_CLASS[result.coverage.tone])}>
                {result.coverage.headline}
              </p>
              <p className="mt-0.5 text-xs text-muted">{result.coverage.detail}</p>
              <p className="mt-0.5 text-xs text-muted">{coverageNote(isJointFund)}</p>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
