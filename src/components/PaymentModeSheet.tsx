"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useSheetSave } from "@/hooks/useSheetSave";
import { primaryPillLabel } from "@/lib/sheetSave";
import { cn } from "@/lib/utils";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";

interface PaymentModeSheetProps {
  open: boolean;
  onClose: () => void;
}

const MODES: { joint: boolean; name: string; line: string }[] = [
  { joint: true, name: "Joint Fund", line: "Bills come out of one shared household bank account." },
  { joint: false, name: "Direct Pay", line: "Each person pays their own share of a bill." },
];

/**
 * Payment mode (R29, #416): one pop-up. Two cards, the current one marked;
 * tapping the other reveals the warning and a red "Switch to X" pill. Replaces
 * the old picker + separate confirm box. Owner-only (Settings only opens it for
 * owners; AppContext also checks the returned row).
 */
export default function PaymentModeSheet({ open, onClose }: PaymentModeSheetProps) {
  const { isJointFund, updateHouseholdPaymentMode } = useApp();
  /** The mode the owner tapped; null until they pick the other one. */
  const [pending, setPending] = useState<boolean | null>(null);
  const { status, error, run, reset } = useSheetSave({
    onSuccess: onClose,
    successToast: "Payment mode changed",
    showThrownMessage: true,
    errorMessage: "Failed to update payment mode. Please try again.",
  });
  const saving = status === "saving";

  // Fresh state each time the pop-up opens (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPending(null);
      reset();
    }
  }

  const target = pending !== null && pending !== isJointFund ? MODES.find((m) => m.joint === pending) : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Payment mode"
      placement="bottom"
      busy={saving}
      error={error}
      footer={
        target ? (
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="destructive"
              fullWidth
              disabled={saving}
              onClick={() => run(() => updateHouseholdPaymentMode(target.joint))}
            >
              {primaryPillLabel(status, `Switch to ${target.name}`)}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              disabled={saving}
              onClick={() => {
                setPending(null);
                reset();
              }}
            >
              Cancel
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Payment mode">
          {MODES.map((mode) => {
            const current = mode.joint === isJointFund;
            const picked = pending === mode.joint && !current;
            return (
              <button
                key={mode.name}
                type="button"
                role="radio"
                aria-checked={current}
                disabled={saving}
                onClick={() => {
                  if (saving) return;
                  setPending(current ? null : mode.joint);
                  reset();
                }}
                className={cn(
                  "press-tint flex min-h-11 items-start justify-between gap-3 rounded-card border bg-surface-raised px-4 py-3 text-left disabled:opacity-60",
                  current || picked
                    ? "border-transparent ring-2 ring-inset ring-primary"
                    : "border-border-strong"
                )}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold text-foreground">{mode.name}</span>
                  <span className="text-xs leading-relaxed text-muted">{mode.line}</span>
                </span>
                {current && (
                  <span className="mt-0.5 flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                    <Check className="h-4 w-4" aria-hidden="true" /> Current
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {target && (
          <p className="text-sm leading-relaxed text-muted">
            Switching resets every bill&apos;s contributor splits. You&apos;ll need to set who pays what again. This
            can&apos;t be undone.
          </p>
        )}
      </div>
    </Dialog>
  );
}
