"use client";

import React, {
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { useSheetSave } from "@/hooks/useSheetSave";
import { isSaveLocked, primaryPillLabel } from "@/lib/sheetSave";
import {
  DISCARD_LABEL,
  KEEP_EDITING_LABEL,
  SKIP_LABEL,
  STEP_SUMMARY,
  advanceTarget,
  canGoBack,
  discardTitle,
  dotState,
  nextPillLabel,
  prevStep,
  resolveStep,
  shouldConfirmDiscard,
} from "@/lib/stepFlow";
import BackCircle from "./BackCircle";
import Button from "./Button";
import CloseCircle from "./CloseCircle";
import ConfirmDialog from "./ConfirmDialog";
import Dialog from "./Dialog";

export interface FlowStep {
  /** Unique within the flow (steps and extras together). */
  key: string;
  /** One `Field question` with its input. Put `enterKeyHint="next"` on text inputs. */
  content: React.ReactNode;
  /** False disables the Next pill (and the main pill on the summary). Default true. */
  valid?: boolean;
  /** Shows a quiet Skip pill beside Next. */
  optional?: boolean;
  /** Called when Skip is tapped, before moving on (e.g. set the value to $0). */
  onSkip?: () => void;
  /** Focus the card's first input when it appears (opens the keyboard). Default true. */
  autoFocus?: boolean;
}

export interface StepFlowProps {
  open: boolean;
  onClose: () => void;
  /** Screen-reader heading only; the card shows no visible title. */
  title: string;
  /** What is being created, for "Discard this bill?". */
  noun: string;
  /** The essential cards, in order. Leave out cards that do not apply right now. */
  steps: FlowStep[];
  /** Optional cards reached only by tapping a row on the summary. Extras are always optional: they never block the main pill, even if `valid` is false. */
  extras?: FlowStep[];
  /** The last card: the entered values as rows. `edit(key)` opens that card. */
  summary: (nav: { edit: (key: string) => void }) => React.ReactNode;
  /** Main pill label on the summary, e.g. "Add bill". */
  submitLabel: string;
  /**
   * Extra reason to block the main pill. The flow also blocks it itself while
   * any step has `valid === false`, so a value made invalid in a detour is caught.
   */
  canSubmit?: boolean;
  /** Return false or throw to fail; void or true to succeed (the flow then closes). */
  onSubmit: () => Promise<boolean | void> | boolean | void;
  successToast?: string;
  errorMessage?: string;
  /** Something was entered. Closing then asks first. Use `hasChanges` from lib/stepFlow. */
  dirty: boolean;
}

interface Nav {
  at: string;
  detour: boolean;
  dir: "none" | "forward" | "back";
}

/**
 * Bottom pop-up that creates something one question at a time (R06, #393):
 * a card per essential field, then a summary with the main pill. Back circle,
 * progress dots and close circle sit on top; Next (or Skip and Next) is pinned
 * at the bottom above the keyboard. Return on a card is Next.
 *
 * The consumer owns the values (edits are live, so Back keeps typed text) and
 * passes `steps` for the current answers. Summary rows must be `type="button"`.
 * Tapping a row calls `edit(key)`: that card opens with a "Done" pill that
 * returns to the summary.
 */
export default function StepFlow({
  open,
  onClose,
  title,
  noun,
  steps,
  extras = [],
  summary,
  submitLabel,
  canSubmit = true,
  onSubmit,
  successToast,
  errorMessage,
  dirty,
}: StepFlowProps) {
  const formId = useId();
  const keys = steps.map((s) => s.key);
  const extraKeys = extras.map((s) => s.key);
  const firstAt = keys[0] ?? STEP_SUMMARY;

  const [nav, setNav] = useState<Nav>({ at: firstAt, detour: false, dir: "none" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { status, error, run, reset } = useSheetSave({
    onSuccess: onClose,
    successToast,
    errorMessage,
  });
  const saving = isSaveLocked(status);

  // Fresh state each time the flow opens (derived-state reset, no effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setNav({ at: firstAt, detour: false, dir: "none" });
      setConfirmOpen(false);
      reset();
    }
  }

  // A card that disappeared (e.g. Type -> Expense drops Due date) falls back.
  const at = resolveStep(keys, nav.at, extraKeys);
  if (at !== nav.at) {
    setNav({ at, detour: false, dir: "none" });
  }

  const onSummary = at === STEP_SUMMARY;
  const currentStep =
    steps.find((s) => s.key === at) ?? extras.find((s) => s.key === at);
  const onExtra = extraKeys.includes(at);
  const stepAutoFocus = currentStep ? currentStep.autoFocus !== false : false;
  const { detour } = nav;
  const isFirst = prevStep(keys, at) === null;
  const allValid = steps.every((s) => s.valid !== false);

  // Moves to another card inside the tap, so iOS lets the next input focus and
  // open the keyboard. Leaving the summary clears a stale save error.
  const go = (next: Nav) => {
    if (saving) return;
    flushSync(() => {
      if (onSummary) reset();
      setNav(next);
    });
  };

  const advance = () => {
    const to = advanceTarget(keys, at, detour);
    go({ at: to, detour: false, dir: detour ? "back" : "forward" });
  };

  const goBack = () => {
    if (detour) {
      go({ at: STEP_SUMMARY, detour: false, dir: "back" });
      return;
    }
    const prev = prevStep(keys, at);
    if (prev !== null) go({ at: prev, detour: false, dir: "back" });
  };

  const edit = (key: string) => {
    if (saving) return;
    go({ at: key, detour: true, dir: "forward" });
  };

  // Close circle, Escape and backdrop all come through here.
  const requestClose = () => {
    if (confirmOpen) return;
    if (shouldConfirmDiscard(dirty, saving)) setConfirmOpen(true);
    else onClose();
  };

  // Focus the new card: its first input (keyboard up) or the card itself
  // (choice cards and the summary drop the keyboard).
  useLayoutEffect(() => {
    if (!open) return;
    const card = cardRef.current;
    if (!card) return;
    if (stepAutoFocus) {
      const input = card.querySelector<HTMLElement>(
        "input:not([type=hidden]):not([disabled]), textarea"
      );
      if (input) {
        input.focus({ preventScroll: true });
        return;
      }
    }
    card.focus({ preventScroll: true });
  }, [open, at, stepAutoFocus]);

  const dots = dotState(keys, at, onExtra);
  const slideClass =
    nav.dir === "forward"
      ? "step-card-forward"
      : nav.dir === "back"
        ? "step-card-back"
        : undefined;

  const showSpacer = isFirst && !detour;
  const backDisabled = !canGoBack({ isFirst, detour, saving });

  return (
    <>
      <Dialog
        open={open}
        onClose={requestClose}
        title={title}
        placement="bottom"
        busy={saving}
        error={error}
        header={(titleId) => (
          <div className="flex shrink-0 items-center justify-between px-3 pt-3">
            {showSpacer ? (
              <span className="h-11 w-11 shrink-0" aria-hidden="true" />
            ) : (
              <BackCircle onClick={goBack} disabled={backDisabled} />
            )}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: dots.count }, (_, i) => (
                <span
                  key={i}
                  className={
                    i === dots.active
                      ? "h-1.5 w-[18px] rounded-full bg-primary"
                      : "h-1.5 w-1.5 rounded-full bg-border-strong"
                  }
                />
              ))}
            </div>
            <CloseCircle onClick={requestClose} disabled={saving} />
            <h3 id={titleId} className="sr-only">
              {title}
              {` — step ${dots.active + 1} of ${dots.count}`}
            </h3>
          </div>
        )}
        footer={
          onSummary ? (
            <Button
              type="submit"
              form={formId}
              fullWidth
              disabled={saving || !canSubmit || !allValid}
            >
              {primaryPillLabel(status, submitLabel)}
            </Button>
          ) : (
            <div className="flex w-full gap-3">
              {currentStep?.optional && (
                <Button
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    currentStep.onSkip?.();
                    advance();
                  }}
                >
                  {SKIP_LABEL}
                </Button>
              )}
              <Button
                type="submit"
                form={formId}
                className="flex-1"
                disabled={currentStep?.valid === false}
              >
                {nextPillLabel(detour)}
              </Button>
            </div>
          )
        }
      >
        <div className="-mx-5 overflow-x-clip px-5">
          <div
            key={at}
            ref={cardRef}
            tabIndex={-1}
            className={slideClass ? `outline-none ${slideClass}` : "outline-none"}
          >
            <form
              id={formId}
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (saving) return;
                if (onSummary) {
                  if (canSubmit && allValid) run(onSubmit);
                } else if (currentStep?.valid !== false) {
                  advance();
                }
              }}
            >
              {onSummary ? summary({ edit }) : currentStep?.content}
            </form>
          </div>
        </div>
      </Dialog>
      <ConfirmDialog
        open={open && confirmOpen}
        title={discardTitle(noun)}
        message="What you've entered won't be saved."
        confirmLabel={DISCARD_LABEL}
        cancelLabel={KEEP_EDITING_LABEL}
        onConfirm={() => true}
        onCancel={() => setConfirmOpen(false)}
        onDone={() => {
          setConfirmOpen(false);
          onClose();
        }}
      />
    </>
  );
}
