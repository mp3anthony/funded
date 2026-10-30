"use client";

import { useRef, useState } from "react";
import Logo from "./Logo";
import BackCircle from "@/components/ui/BackCircle";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import { canJoin, formatCode, joinErrorMessage, sanitizeCode } from "@/lib/onboardingJoin";

interface OnboardingJoinFlowProps {
  /** Joins the household with the code; throws on failure. */
  onJoin: (code: string) => Promise<void>;
  /** Back: return to Welcome. */
  onExit: () => void;
}

/**
 * Full-screen join-household screen (R33, #420): one question, the join code.
 * Back circle on top, a full-width Join pill pinned above the keyboard, Return
 * joins. On success the page reloads into the new household, so the
 * "Setting things up" screen stays up until then.
 */
export default function OnboardingJoinFlow({ onJoin, onExit }: OnboardingJoinFlowProps) {
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joiningRef = useRef(false);

  async function join() {
    if (joiningRef.current || !canJoin(code, joining)) return;
    joiningRef.current = true;
    setJoining(true);
    setError(null);
    try {
      await onJoin(code);
      // Full reload so the app loads fresh in the new household.
      window.location.href = "/";
    } catch (err) {
      console.error("Error joining household:", err);
      setError(joinErrorMessage(err));
      joiningRef.current = false;
      setJoining(false);
    }
  }

  function back() {
    if (joiningRef.current) return;
    onExit();
  }

  if (joining) {
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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div
        className="flex shrink-0 items-center justify-between px-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <BackCircle onClick={back} />
        <span className="h-11 w-11 shrink-0" aria-hidden="true" />
      </div>

      <form
        id="onboarding-join-form"
        className="mx-auto w-full max-w-lg flex-1 overflow-y-auto overflow-x-clip px-5 pt-8"
        onSubmit={(e) => {
          e.preventDefault();
          join();
        }}
      >
        <Field id="ob-join-code" label="What's your join code?" question>
          <Input
            id="ob-join-code"
            type="text"
            inputMode="text"
            placeholder="ABCD-EFGH"
            value={formatCode(code)}
            enterKeyHint="go"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            onChange={(e) => {
              setCode(sanitizeCode(e.target.value));
              setError(null);
            }}
          />
        </Field>
        {error && (
          <p role="alert" className="mt-3 break-words text-sm text-destructive-ink">
            {error}
          </p>
        )}
      </form>

      <div
        className="shrink-0 px-5 pt-3"
        style={{
          paddingBottom:
            "max(calc(env(safe-area-inset-bottom, 0px) + 12px), calc(var(--keyboard-inset, 0px) + 8px))",
        }}
      >
        <div className="mx-auto w-full max-w-lg">
          <Button type="submit" form="onboarding-join-form" fullWidth disabled={!canJoin(code, joining)}>
            Join
          </Button>
        </div>
      </div>
    </div>
  );
}
