"use client";

import { useId, useMemo, useState } from "react";
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
  impactFromVerdict,
  extraCosts,
  parsePayments,
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
  /** The Bills page's "amounts as" choice; the Household total is shown in it. */
  frequency: FrequencyType;
  /** The unfiltered Household total now, in `frequency`. */
  currentTotal: number;
  /** Hands the answers to the Add flow. This pop-up closes first. */
  onTurnIntoBill: (prefill: BillPrefill) => void;
  /** Answers known already (R17: from a Just tracking goal). */
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
  frequency,
  currentTotal,
  onTurnIntoBill,
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

  const amount = parseAmount(inputs.amount);
  const payments = inputs.ongoing ? null : parsePayments(inputs.payments);
  // The verdict as it stands and with the plan added (R25).
  const extraWeekly = amount === null ? 0 : convertAmount(amount, inputs.frequency, "weekly");
  const verdictNow = useVerdict();
  const verdictWith = useVerdict(extraWeekly);
  const ready = amount !== null && (inputs.ongoing || payments !== null);

  const result = useMemo(() => {
    if (amount === null || (!inputs.ongoing && payments === null)) return null;
    const costs = extraCosts(amount, inputs.frequency, convertAmount);
    return {
      costs,
      total: totalCost(amount, payments),
      length: planLength(inputs.frequency, payments),
      newTotal: currentTotal + convertAmount(amount, inputs.frequency, frequency),
      coverage: impactFromVerdict(verdictNow, verdictWith),
    };
  }, [amount, payments, inputs.ongoing, inputs.frequency, currentTotal, frequency, verdictNow, verdictWith]);

  const turnIntoBill = () => {
    if (!ready) return;
    onClose();
    onTurnIntoBill(
      billPrefill({ name: inputs.name, amount: inputs.amount, frequency: inputs.frequency, payments }),
    );
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
          {!ready && <p className="text-center text-xs text-muted">Enter an amount and number of payments</p>}
          <Button fullWidth disabled={!ready} onClick={turnIntoBill}>
            Turn into a bill
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="-mt-1 text-xs text-muted">Nothing is saved.</p>

        <Field id={nameId} label="Name (optional)">
          <Input
            id={nameId}
            placeholder="Phone plan"
            value={inputs.name}
            onChange={(e) => patch({ name: e.target.value })}
            autoComplete="off"
          />
        </Field>

        <Field id={amountId} label="Payment amount">
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
            How often
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
            Payments
          </span>
          <div role="group" aria-labelledby={`${uid}-pay`} className="flex flex-wrap gap-2">
            <Chip selected={!inputs.ongoing} onClick={() => patch({ ongoing: false })}>
              Number of payments
            </Chip>
            <Chip selected={inputs.ongoing} onClick={() => patch({ ongoing: true })}>
              Ongoing
            </Chip>
          </div>
          {!inputs.ongoing && (
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

            <div aria-live="polite">
              <p className={cn("text-[17px] font-bold", TONE_CLASS[result.coverage.tone])}>
                {result.coverage.headline}
              </p>
              <p className="mt-0.5 text-xs text-muted">{result.coverage.detail}</p>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
