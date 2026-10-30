"use client";

import { useRef, useState } from "react";
import Logo from "./Logo";
import BackCircle from "@/components/ui/BackCircle";
import Button from "@/components/ui/Button";
import ChoiceField from "@/components/ui/ChoiceField";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import { NEXT_LABEL } from "@/lib/stepFlow";
import {
  CREATE_SCREENS,
  DEFAULT_PAYMENT_MODE,
  HOUSEHOLD_NAME_MAX,
  PAYMENT_MODE_NOTE,
  PAYMENT_MODE_OPTIONS,
  canContinue,
  cleanHouseholdName,
  isJointFund,
  nextScreen,
  prevScreen,
  type CreateScreen,
  type PaymentModeValue,
} from "@/lib/onboardingCreate";

interface OnboardingCreateFlowProps {
  /** Creates the household with the chosen name and mode; throws on failure. */
  onCreate: (name: string, jointFund: boolean) => Promise<void>;
  /** The household exists: carry on. */
  onDone: () => void;
  /** Back from the first screen: return to Welcome. */
  onExit: () => void;
}

/**
 * Full-screen create-household flow (R31, #418): Household name, then Payment
 * mode. Nothing is saved until Next on Payment mode, which creates the
 * household once with both answers. Back circle and dots on top, a full-width
 * Next pill pinned above the keyboard, Return is Next.
 */
export default function OnboardingCreateFlow({ onCreate, onDone, onExit }: OnboardingCreateFlowProps) {
  const [screen, setScreen] = useState<CreateScreen>("name");
  const [dir, setDir] = useState<"none" | "forward" | "back">("none");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<PaymentModeValue>(DEFAULT_PAYMENT_MODE);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creatingRef = useRef(false);

  async function next() {
    if (creatingRef.current || !canContinue(screen, { name, creating })) return;
    const to = nextScreen(screen);
    if (to) {
      setDir("forward");
      setScreen(to);
      return;
    }
    creatingRef.current = true;
    setCreating(true);
    setError(null);
    try {
      await onCreate(cleanHouseholdName(name), isJointFund(mode));
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      creatingRef.current = false;
      setCreating(false);
    }
  }

  function back() {
    if (creatingRef.current) return;
    const to = prevScreen(screen);
    setError(null);
    if (to) {
      setDir("back");
      setScreen(to);
    } else {
      onExit();
    }
  }

  if (creating) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background"
      >
        <Logo size="large" showWordmark={true} />
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none" />
        <p className="text-sm font-semibold text-foreground">Setting things up</p>
      </div>
    );
  }

  const active = CREATE_SCREENS.indexOf(screen);
  const slideClass = dir === "forward" ? "step-card-forward" : dir === "back" ? "step-card-back" : undefined;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div
        className="flex shrink-0 items-center justify-between px-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <BackCircle onClick={back} />
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {CREATE_SCREENS.map((s, i) => (
            <span
              key={s}
              className={
                i === active ? "h-1.5 w-[18px] rounded-full bg-primary" : "h-1.5 w-1.5 rounded-full bg-border-strong"
              }
            />
          ))}
        </div>
        <span className="h-11 w-11 shrink-0" aria-hidden="true" />
      </div>

      <form
        id="onboarding-create-form"
        className="mx-auto w-full max-w-lg flex-1 overflow-y-auto overflow-x-clip px-5 pt-8"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <div key={screen} className={slideClass}>
          {screen === "name" ? (
            <Field id="ob-household" label="What's your household called?" question>
              <Input
                id="ob-household"
                type="text"
                placeholder="e.g. The Smiths"
                value={name}
                maxLength={HOUSEHOLD_NAME_MAX}
                enterKeyHint="next"
                autoComplete="off"
                autoFocus
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          ) : (
            <div className="flex flex-col gap-3">
              <ChoiceField
                id="ob-payment-mode"
                question="How does your household pay bills?"
                options={PAYMENT_MODE_OPTIONS.map((o) => ({ ...o }))}
                value={mode}
                onChange={(v) => setMode(v as PaymentModeValue)}
              />
              <p className="text-xs text-muted">{PAYMENT_MODE_NOTE}</p>
              {error && (
                <p role="alert" className="break-words text-sm text-destructive-ink">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </form>

      <div
        className="shrink-0 px-5 pt-3"
        style={{
          paddingBottom:
            "max(calc(env(safe-area-inset-bottom, 0px) + 12px), calc(var(--keyboard-inset, 0px) + 8px))",
        }}
      >
        <div className="mx-auto w-full max-w-lg">
          <Button
            type="submit"
            form="onboarding-create-form"
            fullWidth
            disabled={!canContinue(screen, { name, creating })}
          >
            {NEXT_LABEL}
          </Button>
        </div>
      </div>
    </div>
  );
}
